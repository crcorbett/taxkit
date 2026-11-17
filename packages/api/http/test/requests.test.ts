import { describe, expect, it } from "@effect/vitest";
import { DocsSearchUnavailable } from "@taxkit/content/errors";
import { DocsSearchTerm } from "@taxkit/content/schemas";
import { Array, Deferred, Effect, Fiber, Match, Ref } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientResponse,
  UrlParams,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { TestClock } from "effect/testing";

import { TaxKitApi } from "../src/api.js";
import {
  ApiDeadlineExceeded,
  ApiReplyMismatch,
  ApiUnavailable,
} from "../src/errors.js";
import { requestDocsSearch } from "../src/requests.js";

const origin = "http://taxkit.internal";

describe("bounded documentation search read", () => {
  it.effect(
    "skips empty words and reads matching pages without navigation",
    () =>
      Effect.gen(function* () {
        const calls = yield* Ref.make<readonly string[]>([]);
        const client = yield* HttpApiClient.makeWith(TaxKitApi, {
          baseUrl: origin,
          httpClient: HttpClient.make((request) =>
            Ref.update(
              calls,
              Array.append(
                `${request.url}?${UrlParams.toString(request.urlParams)}`
              )
            ).pipe(
              Effect.as(
                HttpClientResponse.fromWeb(
                  request,
                  new Response("[]", {
                    headers: { "content-type": "application/json" },
                  })
                )
              )
            )
          ),
        });
        expect(yield* requestDocsSearch({ client, term: "" })).toStrictEqual(
          []
        );
        expect(yield* Ref.get(calls)).toStrictEqual([]);
        const term = yield* DocsSearchTerm.makeEffect("calculator");
        expect(yield* requestDocsSearch({ client, term })).toStrictEqual([]);
        expect(yield* Ref.get(calls)).toStrictEqual([
          `${origin}/api/v2/docs/search?term=calculator`,
        ]);
      })
  );

  it.effect("preserves the generated client's declared search failure", () =>
    Effect.gen(function* () {
      const unavailable = new DocsSearchUnavailable({
        message: "Documentation search is temporarily unavailable.",
      });
      const client = yield* HttpApiClient.makeWith(TaxKitApi, {
        baseUrl: origin,
        httpClient: HttpClient.make((request) =>
          Effect.succeed(
            HttpClientResponse.fromWeb(
              request,
              new Response(
                '{"_tag":"DocsSearchUnavailable","message":"Documentation search is temporarily unavailable."}',
                {
                  headers: { "content-type": "application/json" },
                  status: 503,
                }
              )
            )
          )
        ),
      });
      const term = yield* DocsSearchTerm.makeEffect("calculator");
      expect(
        yield* requestDocsSearch({ client, term }).pipe(Effect.flip)
      ).toStrictEqual(unavailable);
    })
  );

  it.effect("interrupts a stalled read at its ten-second deadline", () =>
    Effect.gen(function* () {
      const entered = yield* Deferred.make<"started">();
      const interrupted = yield* Ref.make(false);
      const client = yield* HttpApiClient.makeWith(TaxKitApi, {
        baseUrl: origin,
        httpClient: HttpClient.make(() =>
          Deferred.succeed(entered, "started").pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Ref.set(interrupted, true))
          )
        ),
      });
      const term = yield* DocsSearchTerm.makeEffect("calculator");
      const pending = yield* requestDocsSearch({ client, term }).pipe(
        Effect.flip,
        Effect.forkChild
      );
      yield* Deferred.await(entered);
      yield* TestClock.adjust("10 seconds");
      expect(yield* Fiber.join(pending)).toStrictEqual(
        new ApiDeadlineExceeded()
      );
      expect(yield* Ref.get(interrupted)).toBeTruthy();
    })
  );
});

describe("reply failure classification", () => {
  it.effect.each([
    // A syntactically valid reply with the wrong Schema is a server fault.
    { body: '{"unexpected":true}', expected: "mismatch", status: 200 },
    // So is a client-error status the endpoint does not declare.
    { body: '{"unexpected":true}', expected: "mismatch", status: 400 },
    // A 5xx without the declared body, even at a declared status, is an outage.
    { body: "<html>Unavailable</html>", expected: "unavailable", status: 503 },
    { body: "<html>Bad gateway</html>", expected: "unavailable", status: 502 },
    // An undeclared 5xx, such as a server defect, is an outage.
    { body: "", expected: "unavailable", status: 500 },
    { body: "", expected: "unavailable", status: "no reply" },
  ] as const)(
    "reports a $status reply as $expected",
    ({ body, expected, status }) =>
      Effect.gen(function* () {
        const client = yield* HttpApiClient.makeWith(TaxKitApi, {
          baseUrl: origin,
          httpClient: HttpClient.make((request) =>
            Match.value(status).pipe(
              Match.when("no reply", () =>
                Effect.fail(
                  new HttpClientError.HttpClientError({
                    reason: new HttpClientError.TransportError({ request }),
                  })
                )
              ),
              Match.orElse((code) =>
                Effect.succeed(
                  HttpClientResponse.fromWeb(
                    request,
                    new Response(body, {
                      headers: { "content-type": "application/json" },
                      status: code,
                    })
                  )
                )
              )
            )
          ),
        });
        const term = yield* DocsSearchTerm.makeEffect("calculator");
        const failure = yield* requestDocsSearch({ client, term }).pipe(
          Effect.flip
        );
        expect(failure).toStrictEqual(
          Match.value(expected).pipe(
            Match.when("mismatch", () => new ApiReplyMismatch()),
            Match.when("unavailable", () => new ApiUnavailable()),
            Match.exhaustive
          )
        );
      })
  );
});
