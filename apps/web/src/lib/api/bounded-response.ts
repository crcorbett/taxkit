import { ByteSize, Duration, Effect, Predicate, Stream } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";

import { WebsiteApiResponseTooLarge } from "./errors";

// Every Website API call finishes within ten seconds and reads at most 2 MiB.
export const websiteApiDeadline = Duration.seconds(10);
const websiteApiResponseLimit = ByteSize.mebibytes(2);

/**
 * Read each reply into memory with a byte cap, keeping its real status and
 * headers so the generated client still decodes declared 4xx/5xx bodies.
 * Over-limit replies fail as a decode error carrying the named cause.
 */
export const boundedResponses = (
  client: HttpClient.HttpClient
): HttpClient.HttpClient =>
  HttpClient.transformResponse(client, (effect) =>
    effect.pipe(
      Effect.flatMap((response) =>
        response.stream.pipe(
          Stream.mapAccumEffect(
            () => ByteSize.bytes(0),
            (total, chunk) => {
              const next = ByteSize.sum(
                total,
                ByteSize.bytes(chunk.byteLength)
              );
              return ByteSize.isGreaterThan(next, websiteApiResponseLimit)
                ? Effect.fail(
                    new HttpClientError.HttpClientError({
                      reason: new HttpClientError.DecodeError({
                        cause: new WebsiteApiResponseTooLarge(),
                        request: response.request,
                        response,
                      }),
                    })
                  )
                : Effect.succeed([next, [chunk]] as const);
            }
          ),
          Stream.mkUint8Array,
          Effect.map((bytes) =>
            HttpClientResponse.fromWeb(
              response.request,
              new Response(new Uint8Array(bytes), {
                headers: response.headers,
                status: response.status,
              })
            )
          ),
          // A reply without a body (such as 204 or HEAD) passes unchanged.
          Effect.catchIf(
            (error) => Predicate.isTagged(error.reason, "EmptyBodyError"),
            () => Effect.succeed(response)
          )
        )
      )
    )
  );
