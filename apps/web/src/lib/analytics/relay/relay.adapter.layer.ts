import { collectionPolicyFromHeaders } from "@taxkit/analytics/collection-policy";
import { AnalyticsSettingsConfig } from "@taxkit/analytics/config";
import { DocsWebsiteOrigin } from "@taxkit/content/schemas";
import { Config, Effect, Layer, Match, Option, Schema, Stream } from "effect";
import {
  FetchHttpClient,
  Headers,
  HttpClient,
  HttpClientRequest,
  HttpServerResponse,
} from "effect/http";

import { WebsiteRelayFailure } from "./errors";
import {
  WebsiteRelayByteLimit,
  WebsiteRelayMediaType,
  WebsiteRelayPath,
  WebsiteRelayQuery,
  WebsiteRelayRetryAfter,
} from "./schemas";
import { WebsiteAnalyticsRelay } from "./service";

const responseHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export const WebsiteAnalyticsRelayLive = Layer.unwrap(
  AnalyticsSettingsConfig.pipe(
    Effect.flatMap((settings) =>
      Match.value(settings).pipe(
        Match.tag("AnalyticsDisabled", () =>
          Effect.succeed(
            Layer.succeed(
              WebsiteAnalyticsRelay,
              WebsiteAnalyticsRelay.of({
                handle: Effect.fn("WebsiteAnalyticsRelay.handle")(() =>
                  Effect.succeed(
                    HttpServerResponse.empty({
                      headers: responseHeaders,
                      status: 404,
                    })
                  )
                ),
              })
            )
          )
        ),
        Match.tag("AnalyticsEnabled", () =>
          Config.schema(DocsWebsiteOrigin, "WEBSITE_PUBLIC_ORIGIN").pipe(
            Effect.mapError(
              () => new WebsiteRelayFailure({ reason: "configuration" })
            ),
            Effect.map((websiteOrigin) =>
              Layer.effect(
                WebsiteAnalyticsRelay,
                Effect.gen(function* () {
                  const http = yield* HttpClient.HttpClient;
                  return WebsiteAnalyticsRelay.of({
                    handle: Effect.fn("WebsiteAnalyticsRelay.handle")(
                      function* (request) {
                        if (request.method !== "POST") {
                          return HttpServerResponse.empty({
                            headers: { ...responseHeaders, allow: "POST" },
                            status: 405,
                          });
                        }
                        const address = yield* Schema.decodeEffect(
                          Schema.URLFromString
                        )(request.originalUrl).pipe(
                          Effect.mapError(
                            () =>
                              new WebsiteRelayFailure({ reason: "metadata" })
                          )
                        );
                        if (
                          address.pathname !== WebsiteRelayPath ||
                          address.hash !== ""
                        ) {
                          return HttpServerResponse.empty({
                            headers: responseHeaders,
                            status: 404,
                          });
                        }
                        const origin = yield* Headers.get(
                          request.headers,
                          "origin"
                        ).pipe(
                          Option.match({
                            onNone: () =>
                              Effect.fail(
                                new WebsiteRelayFailure({ reason: "origin" })
                              ),
                            onSome: (value) =>
                              Schema.decodeEffect(DocsWebsiteOrigin)(
                                value
                              ).pipe(
                                Effect.mapError(
                                  () =>
                                    new WebsiteRelayFailure({
                                      reason: "origin",
                                    })
                                )
                              ),
                          })
                        );
                        if (
                          origin.origin !== websiteOrigin.origin ||
                          address.origin !== websiteOrigin.origin
                        ) {
                          return yield* new WebsiteRelayFailure({
                            reason: "origin",
                          });
                        }
                        const query = yield* Schema.decodeEffect(
                          WebsiteRelayQuery
                        )(address.search).pipe(
                          Effect.mapError(
                            () =>
                              new WebsiteRelayFailure({ reason: "metadata" })
                          )
                        );
                        const mediaType = yield* Headers.get(
                          request.headers,
                          "content-type"
                        ).pipe(
                          Option.match({
                            onNone: () =>
                              Effect.fail(
                                new WebsiteRelayFailure({ reason: "metadata" })
                              ),
                            onSome: (value) =>
                              Schema.decodeEffect(WebsiteRelayMediaType)(
                                value
                              ).pipe(
                                Effect.mapError(
                                  () =>
                                    new WebsiteRelayFailure({
                                      reason: "metadata",
                                    })
                                )
                              ),
                          })
                        );
                        if (
                          collectionPolicyFromHeaders(request.headers) ===
                          "deny"
                        ) {
                          return HttpServerResponse.empty({
                            headers: responseHeaders,
                            status: 204,
                          });
                        }
                        const body = yield* request.stream.pipe(
                          Stream.mapError(
                            () => new WebsiteRelayFailure({ reason: "request" })
                          ),
                          Stream.limitBytes(WebsiteRelayByteLimit, () =>
                            Stream.fail(
                              new WebsiteRelayFailure({
                                reason: "request-size",
                              })
                            )
                          ),
                          Stream.mkUint8Array
                        );
                        if (body.byteLength === 0) {
                          return yield* new WebsiteRelayFailure({
                            reason: "request",
                          });
                        }
                        const outgoing = HttpClientRequest.post(
                          "https://us.i.posthog.com/e/"
                        ).pipe(
                          HttpClientRequest.bodyUint8Array(body, mediaType),
                          HttpClientRequest.setHeader(
                            "cache-control",
                            "no-store"
                          )
                        );
                        const response = yield* http
                          .execute(
                            Option.match(query.retry_count, {
                              onNone: () => outgoing,
                              onSome: (retry) =>
                                HttpClientRequest.setUrlParam(
                                  outgoing,
                                  "retry_count",
                                  retry
                                ),
                            })
                          )
                          .pipe(
                            Effect.mapError(
                              () =>
                                new WebsiteRelayFailure({ reason: "transport" })
                            )
                          );
                        if (response.status >= 300 && response.status < 400) {
                          return yield* new WebsiteRelayFailure({
                            reason: "redirect",
                          });
                        }
                        const bytes = yield* response.stream.pipe(
                          Stream.catchTag("HttpClientError", (error) =>
                            Match.value(error.reason).pipe(
                              Match.tag("EmptyBodyError", () => Stream.empty),
                              Match.orElse(() =>
                                Stream.fail(
                                  new WebsiteRelayFailure({
                                    reason: "transport",
                                  })
                                )
                              )
                            )
                          ),
                          Stream.limitBytes(WebsiteRelayByteLimit, () =>
                            Stream.fail(
                              new WebsiteRelayFailure({
                                reason: "response-size",
                              })
                            )
                          ),
                          Stream.mkUint8Array
                        );
                        // Invalid optional retry advice is discarded; status and
                        // body still describe the provider's actual attempt.
                        const retryAfter = yield* Headers.get(
                          response.headers,
                          "retry-after"
                        ).pipe(
                          Option.match({
                            onNone: () => Effect.succeed(Option.none()),
                            onSome: (value) =>
                              Schema.decodeEffect(WebsiteRelayRetryAfter)(
                                value
                              ).pipe(
                                Effect.map(Option.some),
                                Effect.catchTag("SchemaError", () =>
                                  Effect.succeed(Option.none())
                                )
                              ),
                          })
                        );
                        const headers = Option.match(retryAfter, {
                          onNone: () => responseHeaders,
                          onSome: (value) => ({
                            ...responseHeaders,
                            "retry-after": value,
                          }),
                        });
                        return bytes.byteLength === 0
                          ? HttpServerResponse.empty({
                              headers,
                              status: response.status,
                            })
                          : HttpServerResponse.uint8Array(bytes, {
                              contentType: "text/plain",
                              headers,
                              status: response.status,
                            });
                      },
                      (effect) =>
                        effect.pipe(
                          Effect.scoped,
                          Effect.provideService(
                            HttpClient.TracerDisabledWhen,
                            () => true
                          ),
                          Effect.provideService(FetchHttpClient.RequestInit, {
                            cache: "no-store",
                            credentials: "omit",
                            redirect: "manual",
                          }),
                          Effect.timeoutOrElse({
                            duration: "5 seconds",
                            orElse: () =>
                              Effect.fail(
                                new WebsiteRelayFailure({ reason: "deadline" })
                              ),
                          })
                        )
                    ),
                  });
                })
              )
            )
          )
        ),
        Match.exhaustive
      )
    ),
    Effect.catchTags({
      AnalyticsConfigurationError: () =>
        Effect.succeed(
          Layer.succeed(
            WebsiteAnalyticsRelay,
            WebsiteAnalyticsRelay.of({
              handle: Effect.fn("WebsiteAnalyticsRelay.handle")(() =>
                Effect.fail(
                  new WebsiteRelayFailure({ reason: "configuration" })
                )
              ),
            })
          )
        ),
      WebsiteRelayFailure: (error) =>
        Effect.succeed(
          Layer.succeed(
            WebsiteAnalyticsRelay,
            WebsiteAnalyticsRelay.of({
              handle: Effect.fn("WebsiteAnalyticsRelay.handle")(() =>
                Effect.fail(error)
              ),
            })
          )
        ),
    })
  )
);
