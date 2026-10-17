import "@tanstack/react-start/server-only";
import { collectionPolicyFromHeaders } from "@taxkit/analytics/collection-policy";
import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { TaxKitApi } from "@taxkit/api-http/api";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";
import { CalculatorAdmissionUnavailable } from "@taxkit/calculators/schemas";
import type { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import {
  fromCloudflareFetcher,
  toHttpClient,
  toRpcAsync,
} from "alchemy/Cloudflare/Bridge";
import { Effect, Layer, Option, Redacted, Result, Schema } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
  HttpServerRequest,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { NetAddress } from "effect/net";

import { WebsiteApiConfig } from "../config.server";
import { WebsiteApi } from "../host.service";
import { boundedResponses, websiteApiDeadline } from "./bounded-response";
import { WebsiteApiUnavailable, WebsiteApiDeadlineExceeded } from "./errors";

// Native Alchemy bindings: the selected keys only, with protected values
// unwrapped by Alchemy's own reader. The binding object keeps its receiver.
export const WebsiteApiLive = Layer.effect(
  WebsiteApi,
  Effect.gen(function* () {
    const checked = yield* WebsiteApiConfig.pipe(Effect.result);
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
          client: HttpApiClient.makeWith(TaxKitApi, {
            baseUrl: config.apiOrigin,
            httpClient: http,
          }),
          reads: boundedResponses(reads),
          settings: config,
        };
      }),
      Effect.flatMap(({ reads, client, settings }) =>
        client.pipe(Effect.map((generated) => ({ generated, reads, settings })))
      ),
      Effect.result
    );
    return WebsiteApi.of({
      client: Result.map(host, ({ generated }) => generated),
      forward: Effect.fn("WebsiteApi.forward")((path: string) =>
        Effect.fromResult(host).pipe(
          Effect.flatMap(({ reads, settings }) =>
            reads.get(new URL(path, settings.apiOrigin)).pipe(
              Effect.flatMap((response) =>
                response.arrayBuffer.pipe(
                  Effect.map(
                    (body) =>
                      new Response(
                        response.status === 204 ||
                          response.status === 205 ||
                          response.status === 304
                          ? null
                          : body,
                        { headers: response.headers, status: response.status }
                      )
                  )
                )
              ),
              Effect.mapError(() => new WebsiteApiUnavailable())
            )
          ),
          Effect.scoped,
          Effect.timeoutOrElse({
            duration: websiteApiDeadline,
            orElse: () => Effect.fail(new WebsiteApiDeadlineExceeded()),
          })
        )
      ),
    });
  })
);
