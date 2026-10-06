import "@tanstack/react-start/server-only";
import { CalculatorAdmissionUnavailable } from "@taxkit/api-rpc/errors";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import {
  CalculatorClientRateKey,
  CalculatorRequestRateKey,
} from "@taxkit/api-rpc/rate-identity";
import { MetadataQuery } from "@taxkit/api-rpc/schemas";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { fromCloudflareFetcher, toRpcAsync } from "alchemy/Cloudflare/Bridge";
import type { TaxKitApiWorker } from "api/worker";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { NetAddress } from "effect/net";

import { TaxKitWebServerConfig } from "./config.server";
import { WebsitePublicSettings } from "./schemas";
import { WebsiteServerApplication } from "./service.server";

// Layers are selected once at the application root. Expected settings failure
// becomes the service's checked error; unrelated construction defects stay defects.
export const WebsiteServerLive = (binding: Cloudflare.Env["TAXKIT_API"]) =>
  Layer.unwrap(
    TaxKitWebServerConfig(binding).pipe(
      Effect.flatMap((settings) =>
        Effect.gen(function* () {
          const localKey =
            settings.hostMode === "local-emulator" &&
            settings.apiOrigin.protocol === "http:" &&
            (settings.apiOrigin.hostname === "127.0.0.1" ||
              settings.apiOrigin.hostname === "localhost")
              ? Option.some(
                  yield* Schema.decodeEffect(CalculatorClientRateKey)(
                    "127.0.0.1"
                  ).pipe(Effect.orDie)
                )
              : Option.none();
          const fetcher = fromCloudflareFetcher(settings.binding);
          const privateApi = toRpcAsync<typeof TaxKitApiWorker>(
            settings.binding
          );
          const privateTransport = HttpClient.layerMergedContext(
            Effect.succeed(
              HttpClient.make((request) =>
                CalculatorRequestRateKey.pipe(
                  Effect.flatMap(
                    Option.match({
                      onNone: () => fetcher.fetch(request),
                      // The pinned native RPC cannot carry an explicit AbortSignal.
                      // Keep local client cancellation and the API work deadline;
                      // do not claim that cancelling this call stops remote work.
                      onSome: (key) =>
                        HttpClientRequest.toWeb(request).pipe(
                          Effect.flatMap((incoming) =>
                            Effect.tryPromise({
                              catch: () => new CalculatorAdmissionUnavailable(),
                              try: () =>
                                privateApi.calculatorRequest(
                                  incoming,
                                  NetAddress.formatIp(Redacted.value(key))
                                ),
                            })
                          ),
                          Effect.flatMap(
                            Schema.decodeUnknownEffect(
                              Schema.instanceOf(Response)
                            )
                          ),
                          Effect.map((response) =>
                            HttpClientResponse.fromWeb(request, response)
                          ),
                          Effect.mapError(
                            () =>
                              new HttpClientError.HttpClientError({
                                reason: new HttpClientError.TransportError({
                                  cause: new CalculatorAdmissionUnavailable(),
                                  request,
                                }),
                              })
                          )
                        ),
                    })
                  )
                )
              )
            )
          );
          return Layer.effect(
            WebsiteServerApplication,
            Effect.map(TaxKitRpcClient, (client) =>
              WebsiteServerApplication.of({
                calculate: (request) =>
                  CalculatorRequestRateKey.pipe(
                    Effect.flatMap(
                      Option.match({
                        onNone: () =>
                          Option.match(localKey, {
                            onNone: () =>
                              Effect.fail(new CalculatorAdmissionUnavailable()),
                            onSome: (key) =>
                              client
                                .calculate(request)
                                .pipe(
                                  Effect.provideService(
                                    CalculatorRequestRateKey,
                                    Option.some(key)
                                  )
                                ),
                          }),
                        onSome: () => client.calculate(request),
                      })
                    )
                  ),
                catalogue: client.listCalculators(MetadataQuery.make({})),
                settings: Effect.succeed(
                  WebsitePublicSettings.make({ apiOrigin: settings.apiOrigin })
                ),
              })
            )
          ).pipe(
            Layer.provide(
              TaxKitRpcClientLive(settings.apiOrigin).pipe(
                Layer.provide(privateTransport)
              )
            )
          );
        })
      ),
      Effect.catchTag("TaxKitWebConfigError", (error) =>
        Effect.succeed(
          Layer.succeed(
            WebsiteServerApplication,
            WebsiteServerApplication.of({
              calculate: () => Effect.fail(error),
              catalogue: Effect.fail(error),
              settings: Effect.fail(error),
            })
          )
        )
      )
    )
  );
