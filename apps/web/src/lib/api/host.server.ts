import "@tanstack/react-start/server-only";
import { collectionPolicyFromHeaders } from "@taxkit/analytics/collection-policy";
import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { TaxKitApi } from "@taxkit/api-http/api";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";
import { CalculatorAdmissionUnavailable } from "@taxkit/calculators/schemas";
import {
  fromCloudflareFetcher,
  toHttpClient,
  toRpcAsync,
} from "alchemy/Cloudflare/Bridge";
import type { TaxKitApiWorker } from "api/worker";
import {
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Result,
  Schema,
} from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
  HttpServerRequest,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { NetAddress } from "effect/net";

import type { TaxKitWebConfigError } from "../config";
import { TaxKitWebServerConfig } from "../config.server";
import type { WebsitePublicSettings } from "../schemas";
import { boundedResponses } from "./bounded-response";
import { WebsiteApiUnavailable } from "./errors";
import type { TaxKitClient } from "./requests";

/**
 * The Website server's host capabilities: its checked settings, the native
 * generated API client over the private same-stage binding, and one finished
 * forward for API-owned downloads.
 */
export class WebsiteHost extends Context.Service<
  WebsiteHost,
  {
    readonly settings: Result.Result<
      WebsitePublicSettings,
      TaxKitWebConfigError
    >;
    readonly client: Result.Result<TaxKitClient, TaxKitWebConfigError>;
    readonly forward: (
      path: string
    ) => Effect.Effect<Response, WebsiteApiUnavailable | TaxKitWebConfigError>;
  }
>()("taxkit/web/WebsiteHost") {}

// Native Alchemy bindings: the selected keys only, with protected values
// unwrapped by Alchemy's own reader. The binding object keeps its receiver.
export const WebsiteHostLive = Layer.effect(
  WebsiteHost,
  Effect.gen(function* () {
    const checked = yield* TaxKitWebServerConfig.pipe(Effect.result);
    const host = yield* Effect.fromResult(checked).pipe(
      Effect.map((config) => {
        const localKey =
          config.hostMode === "local-emulator" &&
          config.apiOrigin.protocol === "http:" &&
          (config.apiOrigin.hostname === "127.0.0.1" ||
            config.apiOrigin.hostname === "localhost")
            ? Schema.decodeUnknownOption(CalculatorClientRateKey)("127.0.0.1")
            : Option.none();
        const reads = toHttpClient(fromCloudflareFetcher(config.binding));
        const privateApi = toRpcAsync<typeof TaxKitApiWorker>(config.binding);
        // Calculation is the Website's only POST. It uses the trusted private
        // method so the original caller's key travels outside JSON and headers.
        // That native method cannot carry an AbortSignal; the API bounds its
        // own work and reply.
        const trusted = HttpClient.make((request) =>
          CalculatorRequestRateKey.pipe(
            Effect.map(Option.orElse(() => localKey)),
            Effect.flatMap(
              Option.match({
                onNone: () =>
                  Effect.fail(
                    new HttpClientError.HttpClientError({
                      reason: new HttpClientError.TransportError({
                        cause: new CalculatorAdmissionUnavailable(),
                        request,
                      }),
                    })
                  ),
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
                      Schema.decodeUnknownEffect(Schema.instanceOf(Response))
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
        );
        const http = HttpClient.make((request) =>
          request.method === "POST"
            ? trusted.execute(request)
            : reads.execute(request)
        ).pipe(
          // Forward the visitor's collection preference; a server call with no
          // incoming request refuses collection.
          HttpClient.mapRequestEffect((outgoing) =>
            Effect.serviceOption(HttpServerRequest.HttpServerRequest).pipe(
              Effect.map((incoming) =>
                HttpClientRequest.setHeader(
                  outgoing,
                  CollectionPolicyHeader,
                  Option.match(incoming, {
                    onNone: () => "deny",
                    onSome: (request) =>
                      collectionPolicyFromHeaders(request.headers),
                  })
                )
              )
            )
          ),
          boundedResponses
        );
        return {
          binding: config.binding,
          client: HttpApiClient.makeWith(TaxKitApi, {
            baseUrl: config.apiOrigin,
            httpClient: http,
          }),
          settings: config,
        };
      }),
      Effect.flatMap(({ binding, client, settings }) =>
        client.pipe(
          Effect.map((generated) => ({ binding, generated, settings }))
        )
      ),
      Effect.result
    );
    return WebsiteHost.of({
      client: Result.map(host, ({ generated }) => generated),
      forward: (path) =>
        Effect.fromResult(host).pipe(
          Effect.flatMap(({ binding, settings }) =>
            Effect.tryPromise({
              catch: () => new WebsiteApiUnavailable(),
              try: (signal) =>
                binding.fetch(new URL(path, settings.apiOrigin).href, {
                  signal,
                }),
            })
          )
        ),
      settings: Result.map(host, ({ settings }) => ({
        apiOrigin: settings.apiOrigin,
        publicationOrigin: settings.publicationOrigin,
        websiteOrigin: settings.websiteOrigin,
      })),
    });
  })
);
