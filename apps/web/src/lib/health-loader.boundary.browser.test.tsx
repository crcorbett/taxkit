import { describe, expect, it } from "@effect/vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { Array, Effect, Fiber, Option, Result, Schema } from "effect";
import { vi } from "vitest";

import { routeTree } from "../routeTree.gen";
import {
  WebsiteCatalogueTransport,
  WebsitePublicSettings,
  WebsiteSettingsTransport,
} from "./schemas";

describe("actual website settings loader", () => {
  it.effect("loads plain transport data through the real root route", () =>
    Effect.gen(function* () {
      const apiOrigin = yield* Schema.decodeUnknownEffect(
        WebsitePublicSettings.fields.apiOrigin
      )("https://api.taxkit.example");
      const websiteOrigin = yield* Schema.decodeUnknownEffect(
        WebsitePublicSettings.fields.websiteOrigin
      )("https://taxkit.example");
      const encoded = yield* Schema.encodeEffect(WebsiteSettingsTransport)(
        Result.succeed(WebsitePublicSettings.make({ apiOrigin, websiteOrigin }))
      );
      const catalogue = yield* Schema.encodeEffect(WebsiteCatalogueTransport)(
        Result.succeed({ calculators: [] })
      );
      const loadSettings = vi.fn(() =>
        Effect.runPromise(
          Effect.succeed({
            catalogue,
            settings: encoded,
            submission: undefined,
          })
        )
      );
      const router = yield* Effect.acquireRelease(
        Effect.sync(() =>
          createRouter({
            context: {
              loadDocsPage: () =>
                Effect.runPromise(
                  Effect.die("Unrequested documentation fixture")
                ),
              loadSettings,
            },
            history: createMemoryHistory({ initialEntries: ["/"] }),
            routeTree,
          })
        ),
        (value) => Effect.sync(() => value.history.destroy())
      );
      yield* Effect.promise(() => router.load());
      const match = yield* Effect.fromOption(
        Array.findFirst(
          router.state.matches,
          (value) => value.routeId === "__root__"
        )
      );
      expect(match.status).toBe("success");
      expect(match.loaderData).toEqual({
        catalogue,
        settings: encoded,
        submission: undefined,
      });
      expect(loadSettings).toHaveBeenCalledOnce();
    }).pipe(Effect.scoped)
  );
  it.effect(
    "aborts the named settings transport when its preload is retired",
    () =>
      Effect.gen(function* () {
        const started = vi.fn<(signal: AbortSignal) => void>();
        const released = vi.fn();
        const loadSettings = ({ signal }: { readonly signal: AbortSignal }) =>
          Effect.runPromise(
            Effect.sync(() => started(signal)).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Effect.sync(() => released()))
            ),
            { signal }
          );
        const router = yield* Effect.acquireRelease(
          Effect.sync(() =>
            createRouter({
              context: {
                loadDocsPage: () =>
                  Effect.runPromise(
                    Effect.die("Unrequested documentation fixture")
                  ),
                loadSettings,
              },
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
        expect(
          Array.head(started.mock.calls).pipe(
            Option.map(([signal]) => signal.aborted),
            Option.getOrElse(() => false)
          )
        ).toBe(true);
        yield* Fiber.interrupt(preload);
      }).pipe(Effect.scoped)
  );
});
