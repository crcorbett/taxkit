import { WorkerExecutionContext } from "@alchemy.run/cloudflare/Workers";
import { aeoRoutes } from "@taxkit/aeo/routes";
import {
  PublicationOrigins,
  PublicationSettingsUnavailable,
} from "@taxkit/aeo/service";
import { ApiCalculatorEvents } from "@taxkit/analytics/api-usage";
import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { withCalculatorRequestBodyLimit } from "@taxkit/api-http/request-boundary";
import {
  applyCachePolicy,
  isBrowserOrigin,
  publicCors,
} from "@taxkit/api-http/response-policy";
import {
  ApiReferencePath,
  CalculationFamilyPath,
  CalculatorApiPath,
  DocsApiPath,
  DocsDiscoveryApiPath,
  DocsImageApiPath,
  HealthPath,
  McpRoutePath,
  isPublicReadApiPath,
  mcpPath,
} from "@taxkit/api-http/routes";
import { TaxKitApiRoutesLayer } from "@taxkit/api-http/server";
import { McpRequestAbortSignal } from "@taxkit/api-mcp/request";
import { withBoundedMcpReply } from "@taxkit/api-mcp/response-budget";
import { TaxKitMcpHttpLayer } from "@taxkit/api-mcp/server";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { ContentService } from "@taxkit/content/service";
import {
  ApiHostTelemetryLive,
  observeHostRequest,
} from "@taxkit/observability/host-telemetry";
import type { HostRoute } from "@taxkit/observability/host-telemetry";
import { safeHttpEffect } from "alchemy/Http";
import { RuntimeContext } from "alchemy/RuntimeContext";
import {
  Function as EffectFunction,
  Context,
  Deferred,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
  Scope,
  Boolean as EffectBoolean,
} from "effect";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import {
  ApiCalculatorDelivery,
  withCalculatorAnalytics,
} from "./analytics-request.boundary.js";
import { ApiWorkerSettingsUnavailable } from "./schemas.js";
import { ApiWorkerSettingsConfig } from "./worker.config.js";
// The closed route family for the one request record; the raw path, query and
// calculator ID never leave this function.
const apiRoute = (pathname: string): HostRoute =>
  Match.value(pathname).pipe(
    Match.when(Schema.is(HealthPath), () => "health" as const),
    Match.when(Schema.is(McpRoutePath), () => "mcp" as const),
    Match.when(Schema.is(CalculationFamilyPath), () => "calculate" as const),
    Match.when(Schema.is(DocsDiscoveryApiPath), () => "discovery" as const),
    Match.when(Schema.is(DocsImageApiPath), () => "docs" as const),
    Match.when(Schema.is(DocsApiPath), () => "docs" as const),
    Match.when(Schema.is(CalculatorApiPath), () => "catalogue" as const),
    Match.when(Schema.is(ApiReferencePath), () => "reference" as const),
    Match.orElse(() => "other" as const)
  );
// Construct once in the native instance scope. HTTP and MCP receive this
// same application service; native requests keep their own scope and fibre.
// The public HTTP routes. Request handlers receive the calculator service
// that the router middleware reads once, when the router is built.
const ApiRoutes = Layer.mergeAll(TaxKitApiRoutesLayer, aeoRoutes).pipe(
  HttpRouter.provideRequest(
    Layer.effect(PublicCalculatorService, PublicCalculatorService)
  )
);

export const ApiWorkerApplication = Effect.gen(function* () {
  const analytics = yield* ApiCalculatorDelivery;
  // Native planning binds deferred resource addresses. Read their runtime
  // values once on first incoming use, without inventing planning URLs.
  const settings = yield* Effect.cached(
    ApiWorkerSettingsConfig.pipe(
      Effect.mapError(
        () => new ApiWorkerSettingsUnavailable({ operation: "settings" })
      )
    )
  );
  const telemetry = yield* Layer.build(ApiHostTelemetryLive);
  // The static route Layers build here, in the application's context. The
  // MCP routes build later, on first use, so they receive these values.
  const calculator = yield* PublicCalculatorService;
  const content = yield* ContentService;
  const handler = yield* HttpRouter.toHttpEffect(ApiRoutes).pipe(
    // The answer-engine documents and share images. Stage origins resolve on
    // first use, after native planning binds them.
    Effect.provideService(
      PublicationOrigins,
      settings.pipe(
        Effect.map(({ apiOrigin, publicationOrigin }) => ({
          apiOrigin,
          publicationOrigin,
        })),
        Effect.mapError(() => new PublicationSettingsUnavailable())
      )
    ),
    Effect.provideContext(telemetry)
  );
  const instanceScope = yield* Scope.Scope;
  // Cache only native registrations after addresses resolve. The request-scoped
  // adapter starts and closes its protocol/notification fibres per POST. Keep
  // the first caller's request, analytics collector and abort signal out of
  // shared registration; calls read their own request's values.
  const mcp = yield* Effect.cached(
    HttpRouter.toHttpEffect(TaxKitMcpHttpLayer).pipe(
      Effect.provideService(PublicCalculatorService, calculator),
      Effect.provideService(ContentService, content),
      Scope.provide(instanceScope),
      Effect.updateContext((context: Context.Context<never>) =>
        Context.omit(
          ApiCalculatorEvents,
          McpRequestAbortSignal,
          HttpServerRequest.HttpServerRequest
        )(context)
      ),
      Effect.provideContext(telemetry),
      Effect.catchTags({
        ConfigError: () =>
          Effect.fail(new ApiWorkerSettingsUnavailable({ operation: "mcp" })),
        IllegalArgumentError: () =>
          Effect.succeed(
            Effect.succeed(HttpServerResponse.empty({ status: 503 }))
          ),
      })
    )
  );
  const fetch = EffectFunction.pipe(
    Effect.gen(function* () {
      const config = yield* settings;
      const request = yield* HttpServerRequest.HttpServerRequest;
      const isMcp = new URL(request.url, config.apiOrigin).pathname === mcpPath;
      const selected = EffectBoolean.match(isMcp, {
        onFalse: () => handler,
        onTrue: () =>
          mcp.pipe(
            Effect.flatMap(withBoundedMcpReply),
            Effect.catchTag("ApiWorkerSettingsUnavailable", () =>
              Effect.succeed(HttpServerResponse.empty({ status: 503 }))
            ),
            Effect.provideService(
              McpRequestAbortSignal,
              Schema.decodeUnknownOption(Schema.instanceOf(Request))(
                request.source
              ).pipe(Option.map((original) => original.signal))
            )
          ),
      });
      return yield* Effect.acquireUseRelease(
        Effect.gen(function* () {
          const completed = yield* Deferred.make<boolean>();
          if (isMcp) {
            const native = yield* Effect.serviceOption(RuntimeContext);
            const worker = yield* Effect.serviceOption(WorkerExecutionContext);
            if (Option.isSome(native) && Option.isSome(worker)) {
              // Workerd may discard an aborted invocation without Effect cleanup.
              // Hold only this bounded request's lifetime; tax work stays in the
              // original fibre and releases its place at the existing budget.
              yield* worker.value
                .waitUntil(Deferred.await(completed))
                .pipe(Effect.provideService(RuntimeContext, native.value));
            }
          }
          return completed;
        }),
        () =>
          EffectFunction.pipe(
            withCalculatorRequestBodyLimit({
              handler: selected,
            }),
            withCalculatorAnalytics
          ).pipe(
            Effect.provideService(ApiCalculatorDelivery, analytics),
            // The shared public browser policy for HTTP, plus the
            // Website's collection header. Remote MCP keeps its own exact
            // browser origin list.
            HttpMiddleware.cors({
              allowedHeaders: EffectBoolean.match(isMcp, {
                onFalse: () => [
                  CollectionPolicyHeader,
                  ...publicCors.allowedHeaders,
                ],
                onTrue: () => [
                  CollectionPolicyHeader,
                  "b3",
                  "content-type",
                  "mcp-method",
                  "mcp-name",
                  "mcp-protocol-version",
                  "traceparent",
                ],
              }),
              allowedMethods: publicCors.allowedMethods,
              allowedOrigins: (origin) =>
                EffectBoolean.match(isMcp, {
                  onFalse: () => isBrowserOrigin(origin),
                  onTrue: () => origin === config.websiteOrigin.origin,
                }),
              credentials: false,
            })
          ),
        (completed) => Deferred.succeed(completed, true)
      );
    }).pipe(
      Effect.catchTag("ApiWorkerSettingsUnavailable", () =>
        Effect.succeed(HttpServerResponse.empty({ status: 503 }))
      )
    ),
    safeHttpEffect
  ).pipe(
    // Every reply, including native error responses, gets one cache decision.
    Effect.flatMap((response) =>
      HttpServerRequest.HttpServerRequest.pipe(
        Effect.map((request) =>
          applyCachePolicy(response, {
            method: request.method,
            publicRead: isPublicReadApiPath(
              new URL(request.url, "https://api.invalid").pathname
            ),
          })
        )
      )
    ),
    // One fixed request record per external call or private binding call.
    (reply) =>
      HttpServerRequest.HttpServerRequest.pipe(
        Effect.flatMap((request) =>
          reply.pipe(
            observeHostRequest("taxkit-api", {
              method: request.method,
              route: apiRoute(
                new URL(request.url, "https://api.invalid").pathname
              ),
            })
          )
        )
      ),
    Effect.provideContext(telemetry)
  );
  return { fetch };
});
