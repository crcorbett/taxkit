import { WorkerExecutionContext } from "@alchemy.run/cloudflare/Workers";
import { aeoRoutes } from "@taxkit/aeo/routes";
import { PublicationOrigins } from "@taxkit/aeo/service";
import { ApiCalculatorEvents } from "@taxkit/analytics/api-usage";
import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { withCalculatorRequestBodyLimit } from "@taxkit/api-http/request-boundary";
import {
  applyCachePolicy,
  isBrowserOrigin,
  isPublicReadPath,
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
  mcpPath,
} from "@taxkit/api-http/routes";
import { TaxKitApiRoutesLayer } from "@taxkit/api-http/server";
import { McpRequestAbortSignal } from "@taxkit/api-mcp/request";
import { withBoundedMcpReply } from "@taxkit/api-mcp/response-budget";
import { TaxKitMcpHttpLayer } from "@taxkit/api-mcp/server";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { DocsSourceError } from "@taxkit/content/errors";
import {
  ContentCatalogue,
  ContentService,
  DocsOgImages,
} from "@taxkit/content/service";
import {
  CalculatorHostMode,
  edgeCallerKey,
} from "@taxkit/observability/edge-identity";
import { observeHostRequest } from "@taxkit/observability/host-telemetry";
import type { HostRoute } from "@taxkit/observability/host-telemetry";
import { safeHttpEffect } from "alchemy/Http";
import { RuntimeContext } from "alchemy/RuntimeContext";
import {
  Function as EffectFunction,
  Config,
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
import { ApiSafeTelemetryLive } from "./worker-telemetry.layer.js";
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
export const ApiWorkerApplication = Effect.gen(function* () {
  const analytics = yield* ApiCalculatorDelivery;
  // Native planning binds deferred resource addresses. Read their runtime
  // values once on first incoming use, without inventing planning URLs.
  const settings = yield* Effect.cached(ApiWorkerSettingsConfig);
  const localKey = yield* Effect.cached(
    Config.schema(CalculatorHostMode, "CALCULATOR_HOST_MODE").pipe(
      Config.withDefault("edge"),
      Effect.flatMap((mode) =>
        Match.value(mode).pipe(
          Match.when("local-emulator", () =>
            settings.pipe(
              Effect.flatMap((config) =>
                EffectBoolean.match(
                  config.apiOrigin.protocol === "http:" &&
                    (config.apiOrigin.hostname === "127.0.0.1" ||
                      config.apiOrigin.hostname === "localhost"),
                  {
                    onFalse: () => Effect.succeed(Option.none()),
                    onTrue: () =>
                      Schema.decodeEffect(CalculatorClientRateKey)(
                        "127.0.0.1"
                      ).pipe(Effect.map(Option.some)),
                  }
                )
              )
            )
          ),
          Match.orElse(() => Effect.succeed(Option.none()))
        )
      ),
      Effect.catchTags({
        ConfigError: () => Effect.succeedNone,
        SchemaError: () => Effect.succeedNone,
      })
    )
  );
  const telemetry = yield* Layer.build(ApiSafeTelemetryLive);
  const calculator = Layer.succeed(
    PublicCalculatorService,
    yield* PublicCalculatorService
  );
  const content = Layer.succeed(ContentService, yield* ContentService);
  // The answer-engine documents and share images. Stage origins resolve on
  // first use, after native planning binds them.
  const aeo = aeoRoutes.pipe(
    Layer.provide(
      Layer.succeed(PublicationOrigins)(
        settings.pipe(
          Effect.map(({ apiOrigin, publicationOrigin }) => ({
            apiOrigin,
            publicationOrigin,
          })),
          Effect.mapError(
            () =>
              new DocsSourceError({
                message: "Documentation publication settings are unavailable.",
                operation: "getDiscoveryDocument",
              })
          )
        )
      )
    ),
    Layer.provide(Layer.succeed(ContentCatalogue, yield* ContentCatalogue)),
    Layer.provide(Layer.succeed(DocsOgImages, yield* DocsOgImages))
  );
  const routes = Layer.mergeAll(TaxKitApiRoutesLayer, aeo).pipe(
    Layer.provide(content),
    HttpRouter.provideRequest(calculator)
  );
  const handler = yield* HttpRouter.toHttpEffect(routes).pipe(
    Effect.provideContext(telemetry)
  );
  const instanceScope = yield* Scope.Scope;
  // Cache only native registrations after addresses resolve. The request-scoped
  // adapter starts and closes its protocol/notification fibres per POST. Keep
  // the first caller's request/key out of shared registration.
  const mcp = yield* Effect.cached(
    HttpRouter.toHttpEffect(
      TaxKitMcpHttpLayer.pipe(Layer.provide(calculator), Layer.provide(content))
    ).pipe(
      Scope.provide(instanceScope),
      Effect.updateContext((context: Context.Context<never>) =>
        Context.omit(
          ApiCalculatorEvents,
          CalculatorRequestRateKey,
          McpRequestAbortSignal,
          HttpServerRequest.HttpServerRequest
        )(context)
      ),
      Effect.provideContext(telemetry),
      Effect.catchTags({
        ConfigError: () =>
          Effect.succeed(
            Effect.succeed(HttpServerResponse.empty({ status: 503 }))
          ),
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
      const callerKey = edgeCallerKey(request.headers, CalculatorClientRateKey);
      const key = yield* callerKey.pipe(
        Option.match({
          onNone: () => localKey,
          onSome: (value) => Effect.succeed(Option.some(value)),
        })
      );
      const isMcp = new URL(request.url, config.apiOrigin).pathname === mcpPath;
      const selected = EffectBoolean.match(isMcp, {
        onFalse: () => handler,
        onTrue: () =>
          mcp.pipe(
            Effect.flatMap(withBoundedMcpReply),
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
      ).pipe(Effect.provideService(CalculatorRequestRateKey, key));
    }).pipe(
      Effect.catchTag("ConfigError", () =>
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
            publicRead: isPublicReadPath(
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
