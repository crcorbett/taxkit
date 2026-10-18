import "@tanstack/react-start/server-only";
import { collectionPolicyFromHeaders } from "@taxkit/analytics/collection-policy";
import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { TaxKitApi } from "@taxkit/api-http/api";
import { CalculationPath } from "@taxkit/api-http/routes";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";
import { CalculatorAdmissionUnavailable } from "@taxkit/calculators/schemas";
import {
  WebsiteForwardingCredentialHeader,
  WebsiteForwardingRateKeyHeader,
} from "@taxkit/observability/edge-identity";
import { fromCloudflareFetcher, toHttpClient } from "alchemy/Cloudflare/Bridge";
import { Effect, Layer, Option, Redacted, Result, Schema } from "effect";
import {
  Headers,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
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
        // Alchemy's stock adapter supplies the AbortSignal but no redirect
        // policy. A synthetic Request defaults to follow, and native service
        // bindings follow with every header. Set standard RequestInit here;
        // delegate each method on the original native receiver.
        const binding: Pick<typeof config.binding, "connect" | "fetch"> = {
          connect: (...args) => config.binding.connect(...args),
          fetch: (request, init) =>
            config.binding.fetch(request, {
              ...init,
              redirect: "manual",
            }),
        };
        const reads = toHttpClient(fromCloudflareFetcher(binding));
        const http = reads.pipe(
          HttpClient.mapRequestEffect((outgoing) => {
            // Never relay caller-supplied forwarding fields. Only the checked
            // canonical calculation POST receives newly minted private metadata.
            const request = outgoing.pipe(
              HttpClientRequest.removeHeader(WebsiteForwardingCredentialHeader),
              HttpClientRequest.removeHeader(WebsiteForwardingRateKeyHeader)
            );
            if (
              request.method !== "POST" ||
              !Schema.is(CalculationPath)(
                new URL(request.url, config.apiOrigin).pathname
              )
            ) {
              return Effect.succeed(request);
            }
            return Effect.gen(function* () {
              const key = yield* CalculatorRequestRateKey.pipe(
                Effect.map(Option.orElse(() => localKey)),
                Effect.flatMap(
                  Option.match({
                    onNone: () =>
                      Effect.fail(new CalculatorAdmissionUnavailable()),
                    onSome: Effect.succeed,
                  })
                )
              );
              const credential = yield* config.forwardingCredential;
              return request.pipe(
                HttpClientRequest.setHeader(
                  WebsiteForwardingCredentialHeader,
                  Redacted.value(credential)
                ),
                HttpClientRequest.setHeader(
                  WebsiteForwardingRateKeyHeader,
                  NetAddress.formatIp(Redacted.value(key))
                )
              );
            }).pipe(
              Effect.mapError(
                () =>
                  new HttpClientError.HttpClientError({
                    reason: new HttpClientError.TransportError({
                      cause: new CalculatorAdmissionUnavailable(),
                      request,
                    }),
                  })
              )
            );
          }),
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
          boundedResponses,
          HttpClient.transformResponse((effect) =>
            effect.pipe(
              Effect.updateService(Headers.CurrentRedactedNames, (names) => [
                ...names,
                WebsiteForwardingRateKeyHeader,
              ])
            )
          )
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
