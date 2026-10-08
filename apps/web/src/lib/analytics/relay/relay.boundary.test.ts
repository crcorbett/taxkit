import { BunHttpServer } from "@effect/platform-bun";
import { expect, it } from "@effect/vitest";
import {
  Array,
  ConfigProvider,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Match,
  Option,
  Ref,
  Schema,
  Scope,
  Stream,
} from "effect";
import {
  FetchHttpClient,
  Headers,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { TestClock } from "effect/testing";

import { WebsiteAnalyticsRelayLive } from "./relay.adapter.layer";
import { WebsiteRelayByteLimit, WebsiteRelayQuery } from "./schemas";
import { WebsiteAnalyticsRelay } from "./service";

const settings = {
  POSTHOG_CAPTURE_TOKEN: "phc_synthetic_taxkit_capture_fixture_only",
  POSTHOG_COLLECTION_MODE: "controlled-preview",
  POSTHOG_PROJECT_ID: 79,
  POSTHOG_REGION: "us",
  POSTHOG_STAGE: "pr-179",
  WEBSITE_PUBLIC_ORIGIN: "https://website.example.com",
};
const body = new TextEncoder().encode("owned-event-uuid-and-timestamp");
const input = HttpClientRequest.post(
  "https://website.example.com/ingest/e/"
).pipe(
  HttpClientRequest.bodyUint8Array(body, "text/plain"),
  HttpClientRequest.setHeaders({
    authorization: "Bearer PRIVATE9",
    cookie: "private=PRIVATE9",
    origin: "https://website.example.com",
    traceparent: "00-private-trace",
    "x-forwarded-for": "203.0.113.9",
    "x-taxkit-collection-policy": "allow",
  })
);
const fixture = (
  mode:
    | "accepted"
    | "redirect"
    | "rejected"
    | "empty"
    | "oversized"
    | "headers"
    | "reply"
    | "late-reply"
) =>
  Effect.gen(function* () {
    const calls = yield* Ref.make<readonly Uint8Array[]>([]);
    const released = yield* Ref.make(0);
    const started = yield* Deferred.make<boolean>();
    const bodyStarted = yield* Deferred.make<boolean>();
    const http = HttpClient.make((request, address) =>
      Effect.gen(function* () {
        expect(address.origin).toBe("https://us.i.posthog.com");
        expect(address.pathname).toBe("/e/");
        expect(request.method).toBe("POST");
        expect(Headers.get(request.headers, "cookie")).toEqual(Option.none());
        expect(Headers.get(request.headers, "authorization")).toEqual(
          Option.none()
        );
        expect(Headers.get(request.headers, "traceparent")).toEqual(
          Option.none()
        );
        expect(Headers.get(request.headers, "x-forwarded-for")).toEqual(
          Option.none()
        );
        expect(
          yield* Effect.serviceOption(FetchHttpClient.RequestInit)
        ).toEqual(
          Option.some({
            cache: "no-store",
            credentials: "omit",
            redirect: "manual",
          })
        );
        expect((yield* HttpClient.TracerDisabledWhen)(request)).toBe(true);
        const bytes = Match.value(request.body).pipe(
          Match.tag("Uint8Array", (value) => value.body),
          Match.orElse(() => new Uint8Array())
        );
        yield* Ref.update(calls, (items) => Array.append(items, bytes));
        yield* Effect.serviceOption(Scope.Scope).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () =>
                Effect.die("Fixture must run inside a request scope"),
              onSome: (scope) =>
                Scope.addFinalizer(
                  scope,
                  Ref.update(released, (count) => count + 1)
                ),
            })
          )
        );
        if (mode === "headers") {
          yield* Deferred.succeed(started, true);
          return yield* Effect.never;
        }
        if (mode === "late-reply") {
          yield* Deferred.succeed(started, true);
          yield* Effect.sleep("4 seconds");
        }
        const response = Match.value(mode).pipe(
          Match.when("redirect", () =>
            HttpServerResponse.text("PRIVATE9", {
              headers: { location: "https://foreign.example/PRIVATE9" },
              status: 302,
            })
          ),
          Match.when("rejected", () =>
            HttpServerResponse.text("rejected", {
              headers: { "retry-after": "5", "set-cookie": "PRIVATE9" },
              status: 429,
            })
          ),
          Match.when("empty", () => HttpServerResponse.empty({ status: 204 })),
          Match.when("oversized", () =>
            HttpServerResponse.uint8Array(
              new Uint8Array(WebsiteRelayByteLimit + 1)
            )
          ),
          Match.when("reply", () =>
            HttpServerResponse.stream(
              Stream.fromEffect(Deferred.succeed(started, true)).pipe(
                Stream.flatMap(() => Stream.never)
              )
            )
          ),
          Match.when("late-reply", () =>
            HttpServerResponse.stream(
              Stream.fromEffect(Deferred.succeed(bodyStarted, true)).pipe(
                Stream.flatMap(() => Stream.never)
              )
            )
          ),
          Match.orElse(() => HttpServerResponse.text("accepted"))
        );
        return HttpServerResponse.toClientResponse(response, { request });
      })
    );
    return {
      bodyStarted,
      calls,
      layer: WebsiteAnalyticsRelayLive.pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
        Layer.provide(
          ConfigProvider.layer(ConfigProvider.fromUnknown(settings))
        )
      ),
      released,
      started,
    };
  });

it.effect(
  "forwards complete unchanged bytes once and strips private caller headers",
  () =>
    Effect.gen(function* () {
      const native = yield* fixture("accepted");
      const reply = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(Effect.provide(native.layer), Effect.withSpan("relay-fixture"));
      expect(reply.status).toBe(200);
      expect(Headers.get(reply.headers, "cache-control")).toEqual(
        Option.some("no-store")
      );
      expect(yield* Ref.get(native.calls)).toEqual([body]);
      expect(yield* Ref.get(native.released)).toBe(1);
    })
);

it.effect("late headers do not renew the one whole-operation deadline", () =>
  Effect.gen(function* () {
    const native = yield* fixture("late-reply");
    const fibre = yield* WebsiteAnalyticsRelay.use((relay) =>
      relay.handle(HttpServerRequest.fromClientRequest(input))
    ).pipe(Effect.provide(native.layer), Effect.flip, Effect.forkChild);
    yield* Deferred.await(native.started);
    yield* TestClock.adjust("4 seconds");
    yield* Deferred.await(native.bodyStarted);
    yield* TestClock.adjust("1 second");
    expect((yield* Fiber.join(fibre)).reason).toBe("deadline");
    expect(yield* Ref.get(native.released)).toBe(1);
  })
);

it.effect(
  "interrupting a stalled reply releases that request's resources",
  () =>
    Effect.gen(function* () {
      const native = yield* fixture("reply");
      const fibre = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(Effect.provide(native.layer), Effect.forkChild);
      yield* Deferred.await(native.started);
      yield* Fiber.interrupt(fibre);
      expect(yield* Ref.get(native.released)).toBe(1);
      expect(yield* Ref.get(native.calls)).toEqual([body]);
    })
);

it.effect(
  "concurrent requests keep complete bodies and request scopes separate",
  () =>
    Effect.gen(function* () {
      const native = yield* fixture("accepted");
      const other = new TextEncoder().encode("another-owned-event");
      const replies = yield* WebsiteAnalyticsRelay.use((relay) =>
        Effect.all(
          [
            relay.handle(HttpServerRequest.fromClientRequest(input)),
            relay.handle(
              HttpServerRequest.fromClientRequest(
                input.pipe(
                  HttpClientRequest.bodyUint8Array(other, "text/plain")
                )
              )
            ),
          ],
          { concurrency: 2 }
        )
      ).pipe(Effect.provide(native.layer));
      expect(Array.map(replies, (reply) => reply.status)).toEqual([200, 200]);
      expect(yield* Ref.get(native.calls)).toHaveLength(2);
      expect(yield* Ref.get(native.calls)).toEqual(
        expect.arrayContaining([body, other])
      );
      expect(yield* Ref.get(native.released)).toBe(2);
    })
);

it.effect.each([
  {
    name: "foreign origin",
    reason: "origin",
    request: input.pipe(
      HttpClientRequest.setHeader("origin", "https://foreign.example")
    ),
  },
  {
    name: "missing origin",
    reason: "origin",
    request: input.pipe(HttpClientRequest.removeHeader("origin")),
  },
  {
    name: "origin with a path",
    reason: "origin",
    request: input.pipe(
      HttpClientRequest.setHeader(
        "origin",
        "https://website.example.com/PRIVATE9"
      )
    ),
  },
  {
    name: "unknown query",
    reason: "metadata",
    request: input.pipe(HttpClientRequest.setUrlParam("PRIVATE9", "PRIVATE9")),
  },
  {
    name: "duplicate retry",
    reason: "metadata",
    request: input.pipe(
      HttpClientRequest.setUrlParams([
        ["retry_count", "1"],
        ["retry_count", "2"],
      ])
    ),
  },
  {
    name: "large retry",
    reason: "metadata",
    request: input.pipe(HttpClientRequest.setUrlParam("retry_count", "11")),
  },
  {
    name: "unsupported type",
    reason: "metadata",
    request: input.pipe(
      HttpClientRequest.setHeader("content-type", "application/octet-stream")
    ),
  },
] as const)(
  "refuses $name before any outbound request",
  ({ request, reason }) =>
    Effect.gen(function* () {
      const native = yield* fixture("accepted");
      const failure = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(request))
      ).pipe(Effect.provide(native.layer), Effect.flip);
      expect(failure.reason).toBe(reason);
      expect(yield* Ref.get(native.calls)).toEqual([]);
    })
);

it.effect.each(["dnt", "x-taxkit-collection-policy"] as const)(
  "refuses collection via %s without reading or forwarding a body",
  (header) =>
    Effect.gen(function* () {
      const native = yield* fixture("accepted");
      const request = input.pipe(
        HttpClientRequest.bodyStream(
          Stream.die("Denied bodies must not be read"),
          { contentType: "text/plain" }
        ),
        HttpClientRequest.setHeader(header, header === "dnt" ? "1" : "deny")
      );
      const reply = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(request))
      ).pipe(Effect.provide(native.layer));
      expect(reply.status).toBe(204);
      expect(yield* Ref.get(native.calls)).toEqual([]);
    })
);

it.effect.each([WebsiteRelayByteLimit, WebsiteRelayByteLimit + 1])(
  "checks the complete %i-byte stream without Content-Length",
  (length) =>
    Effect.gen(function* () {
      const native = yield* fixture("accepted");
      const first = new Uint8Array(WebsiteRelayByteLimit - 1);
      const last = new Uint8Array(length - first.byteLength);
      const request = input.pipe(
        HttpClientRequest.bodyStream(Stream.make(first, last), {
          contentType: "text/plain",
        })
      );
      const operation = WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(request))
      ).pipe(Effect.provide(native.layer));
      if (length === WebsiteRelayByteLimit) {
        expect((yield* operation).status).toBe(200);
        expect(yield* Ref.get(native.calls)).toEqual([new Uint8Array(length)]);
      } else {
        expect((yield* operation.pipe(Effect.flip)).reason).toBe(
          "request-size"
        );
        expect(yield* Ref.get(native.calls)).toEqual([]);
      }
    })
);

it.effect.each([
  { mode: "redirect", reason: "redirect" },
  { mode: "oversized", reason: "response-size" },
] as const)(
  "refuses $mode replies without repeating the request",
  ({ mode, reason }) =>
    Effect.gen(function* () {
      const native = yield* fixture(mode);
      const failure = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(Effect.provide(native.layer), Effect.flip);
      expect(failure.reason).toBe(reason);
      expect(yield* Ref.get(native.calls)).toEqual([body]);
      expect(yield* Ref.get(native.released)).toBe(1);
    })
);

it.effect.each(["empty", "rejected"] as const)(
  "preserves %s provider status and only checked retry advice",
  (mode) =>
    Effect.gen(function* () {
      const native = yield* fixture(mode);
      const reply = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(Effect.provide(native.layer));
      expect(reply.status).toBe(mode === "empty" ? 204 : 429);
      expect(Headers.get(reply.headers, "set-cookie")).toEqual(Option.none());
      expect(Headers.get(reply.headers, "location")).toEqual(Option.none());
      expect(Headers.get(reply.headers, "retry-after")).toEqual(
        mode === "empty" ? Option.none() : Option.some("5")
      );
      expect(yield* Ref.get(native.calls)).toEqual([body]);
    })
);

it.effect.each(["headers", "reply"] as const)(
  "one five-second deadline closes stalled %s",
  (mode) =>
    Effect.gen(function* () {
      const native = yield* fixture(mode);
      const fibre = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(Effect.provide(native.layer), Effect.flip, Effect.forkChild);
      yield* Deferred.await(native.started);
      yield* TestClock.adjust("5 seconds");
      expect((yield* Fiber.join(fibre)).reason).toBe("deadline");
      expect(yield* Ref.get(native.released)).toBe(1);
      expect(yield* Ref.get(native.calls)).toEqual([body]);
    })
);

it.effect(
  "the same deadline includes a stalled incoming body and makes no request",
  () =>
    Effect.gen(function* () {
      const native = yield* fixture("accepted");
      const request = input.pipe(
        HttpClientRequest.bodyStream(
          Stream.fromEffect(Deferred.succeed(native.started, true)).pipe(
            Stream.flatMap(() => Stream.never)
          ),
          { contentType: "text/plain" }
        )
      );
      const fibre = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(request))
      ).pipe(Effect.provide(native.layer), Effect.flip, Effect.forkChild);
      yield* Deferred.await(native.started);
      yield* TestClock.adjust("5 seconds");
      expect((yield* Fiber.join(fibre)).reason).toBe("deadline");
      expect(yield* Ref.get(native.calls)).toEqual([]);
    })
);

it.effect(
  "configured off needs no credential; invalid enabled configuration has its own failure",
  () =>
    Effect.gen(function* () {
      const noNetwork = Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make(() => Effect.die("Unexpected relay request"))
      );
      const off = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(
        Effect.provide(
          WebsiteAnalyticsRelayLive.pipe(
            Layer.provide(noNetwork),
            Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({})))
          )
        )
      );
      expect(off.status).toBe(404);
      const invalid = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(
        Effect.provide(
          WebsiteAnalyticsRelayLive.pipe(
            Layer.provide(noNetwork),
            Layer.provide(
              ConfigProvider.layer(
                ConfigProvider.fromUnknown({
                  POSTHOG_COLLECTION_MODE: "production",
                })
              )
            )
          )
        ),
        Effect.flip
      );
      expect(invalid.reason).toBe("configuration");
    })
);

it.effect(
  "the query codec rejects unknown and duplicate fields, and keeps checked optional retry identity",
  () =>
    Effect.gen(function* () {
      expect(
        (yield* Schema.decodeEffect(WebsiteRelayQuery)("")).retry_count
      ).toEqual(Option.none());
      expect(
        (yield* Schema.decodeEffect(WebsiteRelayQuery)("?retry_count=1"))
          .retry_count
      ).toEqual(Option.some("1"));
    })
);

it.effect(
  "closes the native request when refusing a redirect before reading its body",
  () =>
    Effect.gen(function* () {
      const seen = yield* Ref.make<readonly AbortSignal[]>([]);
      const http = HttpClient.make((request, _address, signal) =>
        Ref.update(seen, (items) => Array.append(items, signal)).pipe(
          Effect.as(
            HttpClientResponse.fromWeb(
              request,
              new Response("redirect", { status: 302 })
            )
          )
        )
      );
      const failure = yield* WebsiteAnalyticsRelay.use((relay) =>
        relay.handle(HttpServerRequest.fromClientRequest(input))
      ).pipe(
        Effect.provide(
          WebsiteAnalyticsRelayLive.pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
            Layer.provide(
              ConfigProvider.layer(ConfigProvider.fromUnknown(settings))
            )
          )
        ),
        Effect.flip
      );
      expect(failure.reason).toBe("redirect");
      const signals = yield* Ref.get(seen);
      expect(signals).toHaveLength(1);
      expect(Array.every(signals, (signal) => signal.aborted)).toBe(true);
    })
);

it.live("the actual native fetch client never follows a relay redirect", () =>
  Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer;
    const address = Match.value(server.address).pipe(
      Match.tag("InetAddressV4", (value) => `http://127.0.0.1:${value.port}`),
      Match.orElse(() => "invalid-address")
    );
    const seen = yield* Ref.make<readonly string[]>([]);
    yield* server.serve(
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        yield* Ref.update(seen, (items) => Array.append(items, request.url));
        expect(Headers.get(request.headers, "traceparent")).toEqual(
          Option.none()
        );
        return HttpServerResponse.text("redirect", {
          headers: { location: `${address}/redirected` },
          status: 302,
        });
      })
    );
    const client = yield* HttpClient.HttpClient;
    const local = Layer.succeed(
      HttpClient.HttpClient,
      client.pipe(
        HttpClient.mapRequest(HttpClientRequest.setUrl(`${address}/e/`))
      )
    );
    const failure = yield* WebsiteAnalyticsRelay.use((relay) =>
      relay.handle(HttpServerRequest.fromClientRequest(input))
    ).pipe(
      Effect.provide(
        WebsiteAnalyticsRelayLive.pipe(
          Layer.provide(local),
          Layer.provide(
            ConfigProvider.layer(ConfigProvider.fromUnknown(settings))
          )
        )
      ),
      Effect.withSpan("relay-native-redirect"),
      Effect.flip
    );
    expect(failure.reason).toBe("redirect");
    expect(yield* Ref.get(seen)).toEqual(["/e/"]);
  }).pipe(
    Effect.provide(
      Layer.merge(
        FetchHttpClient.layer,
        BunHttpServer.layer({ hostname: "127.0.0.1", port: 0 })
      )
    )
  )
);
