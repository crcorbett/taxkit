import { describe, expect, it } from "@effect/vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { createTaxKitApiClientLayer } from "@taxkit/api-http/client/live";
import { Array, Effect, Fiber, Layer, Option } from "effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import { vi } from "vitest";

import { routeTree } from "../routeTree.gen";
import type { RouterContext } from "./route-context";

// The real route uses this fake HTTP transport through the actual generated client.
// These two methods are the test's exact framework execution host.
const createRouteContext = (client: HttpClient.HttpClient): RouterContext => {
  const clientLayer = createTaxKitApiClientLayer({
    baseUrl: "https://api.taxkit.example",
  }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)));

  return {
    api: {
      runPromise: (program, options) =>
        Effect.runPromise(program.pipe(Effect.provide(clientLayer)), options),
      runPromiseExit: (program, options) =>
        Effect.runPromiseExit(
          program.pipe(Effect.provide(clientLayer)),
          options
        ),
    },
  };
};

describe("actual web health loader", () => {
  it.effect(
    "loads health through the actual HTTP client and real file route",
    () =>
      Effect.gen(function* () {
        const requested = vi.fn();
        const client = HttpClient.make((request, url) =>
          Effect.sync(() => {
            requested(url.pathname);
            return HttpClientResponse.fromWeb(
              request,
              new Response('{"service":"taxkit","status":"ok"}', {
                headers: { "content-type": "application/json" },
              })
            );
          })
        );
        const router = yield* Effect.acquireRelease(
          Effect.sync(() =>
            createRouter({
              context: createRouteContext(client),
              history: createMemoryHistory({ initialEntries: ["/"] }),
              routeTree,
            })
          ),
          (value) => Effect.sync(() => value.history.destroy())
        );
        yield* Effect.promise(() => router.load());
        expect(requested).toHaveBeenCalledWith("/api/health");
        const match = yield* Effect.fromOption(
          Array.findFirst(
            router.state.matches,
            (value) => value.routeId === "/"
          )
        );
        expect(match.status).toBe("success");
        expect(match.loaderData).toEqual({ service: "taxkit", status: "ok" });
      }).pipe(Effect.scoped)
  );

  it.effect(
    "interrupts the actual loader's HTTP work when its preload is retired",
    () =>
      Effect.gen(function* () {
        const started = vi.fn<(signal: AbortSignal) => void>();
        const released = vi.fn();
        const client = HttpClient.make((_request, _url, signal) =>
          Effect.sync(() => started(signal)).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Effect.sync(() => released()))
          )
        );
        const router = yield* Effect.acquireRelease(
          Effect.sync(() =>
            createRouter({
              context: createRouteContext(client),
              history: createMemoryHistory({ initialEntries: ["/"] }),
              routeTree,
            })
          ),
          (value) =>
            Effect.sync(() => {
              value.clearCache();
              value.history.destroy();
            })
        );
        const preload = yield* Effect.forkChild(
          Effect.promise(() => router.preloadRoute({ to: "/" }))
        );
        yield* Effect.promise(() =>
          expect.poll(() => started.mock.calls.length).toBe(1)
        );
        router.clearCache();
        yield* Effect.promise(() =>
          expect.poll(() => released.mock.calls.length).toBe(1)
        );
        yield* Effect.promise(() =>
          expect
            .poll(() =>
              Array.head(started.mock.calls).pipe(
                Option.map(([signal]) => signal.aborted),
                Option.getOrElse(() => false)
              )
            )
            .toBe(true)
        );
        yield* Fiber.interrupt(preload);
      }).pipe(Effect.scoped)
  );
});
