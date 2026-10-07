import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { TaxKitApiRoutesLayer } from "@taxkit/api-http/server";
import { CalculatorRpcResponseTooLarge } from "@taxkit/api-rpc/errors";
import {
  CalculatorClientRateKey,
  CalculatorHostMode,
  CalculatorRequestRateKey,
  calculatorEdgeRateKey,
} from "@taxkit/api-rpc/rate-identity";
import {
  CalculatorRpcDeadline,
  CalculatorRpcResponseLimit,
} from "@taxkit/api-rpc/schemas";
import { TaxKitRpcHttpLayer } from "@taxkit/api-rpc/server";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { DocsSourceError } from "@taxkit/content/errors";
import { ContentDiscoveryLive } from "@taxkit/content/live";
import { DocsDiscoverySettings } from "@taxkit/content/schemas";
import { ContentCatalogue, ContentService } from "@taxkit/content/service";
import { safeHttpEffect } from "alchemy/Http";
import {
  ByteSize,
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  Scope,
  Stream,
} from "effect";
import {
  HttpClientRequest,
  HttpClientResponse,
  Headers,
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import {
  ApiCalculatorDelivery,
  withCalculatorAnalytics,
} from "./analytics-request.boundary.js";
import { ApiCalculatorEvents } from "./calculator-analytics.layer.js";
import { McpRequestAbortSignal } from "./mcp-request.service.js";
import { withBoundedMcpReply } from "./mcp-response.boundary.js";
import { McpSessionHost } from "./mcp-session.layer.js";
import { TaxKitMcpHttpLayer } from "./mcp.tools.layer.js";
import { withApiRequestBodyLimit } from "./worker-request.boundary.js";
import { ApiSafeTelemetryLive } from "./worker-telemetry.layer.js";
import { ApiWorkerSettingsConfig } from "./worker.config.js";

// Construct once in the native instance scope. Both transports receive this
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
        mode === "local-emulator"
          ? settings.pipe(
              Effect.flatMap((config) =>
                config.apiOrigin.protocol === "http:" &&
                (config.apiOrigin.hostname === "127.0.0.1" ||
                  config.apiOrigin.hostname === "localhost")
                  ? Schema.decodeEffect(CalculatorClientRateKey)(
                      "127.0.0.1"
                    ).pipe(Effect.map(Option.some))
                  : Effect.succeed(Option.none())
              )
            )
          : Effect.succeed(Option.none())
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
  const discovery = ContentDiscoveryLive(
    settings.pipe(
      Effect.map((config) =>
        DocsDiscoverySettings.make({
          apiOrigin: config.apiOrigin,
          websiteOrigin: config.websiteOrigin,
        })
      ),
      Effect.mapError(
        () =>
          new DocsSourceError({
            message: "Documentation discovery settings are unavailable.",
            operation: "getDiscoveryDocument",
          })
      )
    )
  ).pipe(
    Layer.provide(Layer.succeed(ContentCatalogue, yield* ContentCatalogue))
  );
  const routes = Layer.mergeAll(
    TaxKitApiRoutesLayer,
    TaxKitRpcHttpLayer.pipe(Layer.provide(calculator))
  ).pipe(
    Layer.provide(Layer.merge(content, discovery)),
    HttpRouter.provideRequest(calculator)
  );
  const handler = yield* HttpRouter.toHttpEffect(routes).pipe(
    Effect.provideContext(telemetry)
  );
  const instanceScope = yield* Scope.Scope;
  const sessions = yield* McpSessionHost;
  // Build the protocol host once on first use, after native addresses resolve.
  // Retain its fibres in the instance Scope, and keep the first caller's
  // request/key out of registration. Each call receives its own native Context.
  const mcp = yield* Effect.cached(
    settings.pipe(
      Effect.flatMap((config) =>
        HttpRouter.toHttpEffect(
          TaxKitMcpHttpLayer(config.websiteOrigin).pipe(
            Layer.provide(calculator),
            Layer.provide(content)
          )
        )
      ),
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

  const fetch = safeHttpEffect(
    Effect.gen(function* () {
      const config = yield* settings;
      const request = yield* HttpServerRequest.HttpServerRequest;
      const isMcp = new URL(request.url, config.apiOrigin).pathname === "/mcp";
      const protocol = Headers.get(request.headers, "mcp-protocol-version");
      const legacy =
        Option.isSome(sessions) &&
        Option.match(protocol, {
          onNone: () => true,
          onSome: (value) => value === "2025-11-25",
        });
      const selected = isMcp
        ? (legacy && Option.isSome(sessions)
            ? Effect.succeed(sessions.value.fetch)
            : mcp
          ).pipe(
            Effect.flatMap(withBoundedMcpReply),
            Effect.provideService(
              McpRequestAbortSignal,
              Schema.decodeUnknownOption(Schema.instanceOf(Request))(
                request.source
              ).pipe(Option.map((original) => original.signal))
            )
          )
        : handler;
      return yield* withCalculatorAnalytics(
        withApiRequestBodyLimit(selected)
      ).pipe(
        Effect.provideService(ApiCalculatorDelivery, analytics),
        HttpMiddleware.cors({
          allowedHeaders: isMcp
            ? [
                CollectionPolicyHeader,
                "content-type",
                "mcp-method",
                "mcp-name",
                "mcp-protocol-version",
                "mcp-session-id",
              ]
            : ["content-type", CollectionPolicyHeader],
          allowedMethods: ["GET", "POST", "OPTIONS"],
          // The native predicate checks the actual request origin.
          allowedOrigins: (origin) => origin === config.websiteOrigin.origin,
          credentials: false,
        })
      );
    }).pipe(
      Effect.catchTag("ConfigError", () =>
        Effect.succeed(HttpServerResponse.empty({ status: 503 }))
      )
    )
  ).pipe(Effect.provideContext(telemetry));

  return {
    // Native service-binding RPC only; this method has no HTTP route. The
    // Website passes its checked original edge key separately from JSON.
    calculatorRequest: (request: Request, encodedKey: string) =>
      Effect.gen(function* () {
        if (
          Option.isNone(
            Schema.decodeUnknownOption(Schema.instanceOf(Request))(request)
          )
        ) {
          return new Response(null, { status: 503 });
        }
        if (
          request.method !== "POST" ||
          new URL(request.url).pathname !== "/rpc"
        ) {
          return new Response(null, { status: 404 });
        }
        const key = Schema.decodeUnknownOption(CalculatorClientRateKey)(
          encodedKey
        );
        const response = yield* fetch.pipe(
          Effect.provideService(CalculatorRequestRateKey, key),
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(request)
          )
        );
        // Buffer this closed JSON reply before the native method closes its
        // event scope. Bound bytes and the complete read; it is not a stream.
        const body = yield* HttpClientResponse.fromWeb(
          HttpClientRequest.post(request.url),
          HttpServerResponse.toWeb(response)
        ).stream.pipe(
          Stream.mapAccumEffect(
            () => ByteSize.bytes(0),
            (total, chunk) => {
              const next = ByteSize.sum(
                total,
                ByteSize.bytes(chunk.byteLength)
              );
              return ByteSize.isGreaterThan(next, CalculatorRpcResponseLimit)
                ? Effect.fail(new CalculatorRpcResponseTooLarge())
                : Effect.succeed([next, [chunk]] as const);
            }
          ),
          Stream.mkUint8Array,
          Effect.timeoutOption(CalculatorRpcDeadline),
          Effect.map(
            Option.map(
              (bytes) =>
                new Response(new Uint8Array(bytes), {
                  headers: response.headers,
                  status: response.status,
                })
            )
          ),
          Effect.catchCause(() => Effect.succeed(Option.none<Response>()))
        );
        return Option.getOrElse(
          body,
          () => new Response(null, { status: 503 })
        );
      }).pipe(Effect.provideContext(telemetry)),
    fetch: Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const edgeKey = calculatorEdgeRateKey(request.headers);
      const key = Option.isSome(edgeKey) ? edgeKey : yield* localKey;
      return yield* fetch.pipe(
        Effect.provideService(CalculatorRequestRateKey, key)
      );
    }),
  };
});
