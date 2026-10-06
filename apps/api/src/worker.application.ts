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
import { ContentService } from "@taxkit/content/service";
import { safeHttpEffect } from "alchemy/Http";
import {
  ByteSize,
  Config,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
} from "effect";
import {
  HttpClientRequest,
  HttpClientResponse,
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { withApiRequestBodyLimit } from "./worker-request.boundary.js";
import { ApiSafeTelemetryLive } from "./worker-telemetry.layer.js";
import { ApiWorkerSettingsConfig } from "./worker.config.js";

// Construct once in the native instance scope. Both transports receive this
// same application service; native requests keep their own scope and fibre.
export const ApiWorkerApplication = Effect.gen(function* () {
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
  const routes = Layer.mergeAll(
    TaxKitApiRoutesLayer,
    TaxKitRpcHttpLayer.pipe(Layer.provide(calculator))
  ).pipe(
    Layer.provide(Layer.succeed(ContentService, yield* ContentService)),
    HttpRouter.provideRequest(calculator)
  );
  const handler = yield* HttpRouter.toHttpEffect(routes).pipe(
    Effect.provideContext(telemetry)
  );

  const fetch = safeHttpEffect(
    Effect.gen(function* () {
      const config = yield* settings;
      return yield* withApiRequestBodyLimit(handler).pipe(
        HttpMiddleware.cors({
          allowedHeaders: ["content-type"],
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
