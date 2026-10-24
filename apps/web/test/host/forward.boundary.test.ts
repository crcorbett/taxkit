import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Result } from "effect";
import { TestClock } from "effect/testing";
import { vi } from "vitest";

import { WebsiteApiLive } from "../../src/lib/host/binding.adapter.layer";
import { WebsiteBindings } from "../../src/lib/host/config.ingress";
import { WebsiteApi } from "../../src/lib/host/service";

it.effect.each(["headers", "body"] as const)(
  "bounds discovery %s stalls and cancels the request",
  (stall) =>
    Effect.gen(function* () {
      const aborted = vi.fn<(...args: readonly unknown[]) => void>();
      // Promise and stream callbacks are the native fetch host fixture.
      const binding = {
        connect: vi.fn<(...args: readonly unknown[]) => void>(),
        fetch: vi.fn((_url: string, init?: RequestInit) => {
          init?.signal?.addEventListener("abort", aborted);
          return stall === "headers"
            ? Effect.runPromise(Effect.never, {
                signal: init?.signal ?? undefined,
              })
            : Promise.resolve(
                new Response(new ReadableStream({ cancel: aborted }))
              );
        }),
      };
      const host = yield* WebsiteApi.pipe(
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.taxkit.example",
                TAXKIT_API: binding,
                TAXKIT_PUBLICATION_ORIGIN: "https://taxkit.example",
                WEBSITE_PUBLIC_ORIGIN: "https://preview.taxkit.example",
              })
            )
          )
        )
      );
      const fiber = yield* host
        .forward("/api/v1/docs/discovery/robots.txt")
        .pipe(Effect.result, Effect.forkScoped);
      yield* TestClock.adjust("10 seconds");
      const result = yield* Fiber.join(fiber);
      expect(Result.isFailure(result) && result.failure._tag).toBe(
        "ApiDeadlineExceeded"
      );
      expect(aborted).toHaveBeenCalled();
    }).pipe(Effect.scoped)
);

it.effect.each([
  { body: "User-agent: *", status: 200, succeeds: true },
  { body: "missing", status: 404, succeeds: true },
  { body: null, status: 204, succeeds: true },
  { body: "x".repeat(2 * 1024 * 1024 + 1), status: 200, succeeds: false },
])(
  "finishes discovery replies with status $status and enforces the body limit",
  ({ status, body, succeeds }) =>
    Effect.gen(function* () {
      const binding = {
        connect: vi.fn<(...args: readonly unknown[]) => void>(),
        fetch: vi.fn(() =>
          Promise.resolve(
            new Response(body, {
              headers: {
                "cache-control": "public, max-age=60",
                "content-type": "text/plain",
              },
              status,
            })
          )
        ),
      };
      const host = yield* WebsiteApi.pipe(
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.taxkit.example",
                TAXKIT_API: binding,
                TAXKIT_PUBLICATION_ORIGIN: "https://taxkit.example",
                WEBSITE_PUBLIC_ORIGIN: "https://preview.taxkit.example",
              })
            )
          )
        )
      );
      const result = yield* host
        .forward("/api/v1/docs/discovery/robots.txt")
        .pipe(Effect.result);
      expect(Result.isSuccess(result)).toBe(succeeds);
      if (Result.isSuccess(result)) {
        expect(result.success.status).toBe(status);
        expect(result.success.headers.get("cache-control")).toBe(
          "public, max-age=60"
        );
        expect(yield* Effect.promise(() => result.success.text())).toBe(
          body ?? ""
        );
      }
    })
);
