import { describe, expect, it } from "@effect/vitest";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { Array, Effect, Fiber, Option, Result, Schema } from "effect";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import { Route as RootRoute } from "../routes/__root";
import { Route as SearchRoute } from "../routes/search";
import { routeTree } from "../routeTree.gen";
import { websiteSearchParameters } from "./docs/search-location.boundary";
import type { RouterContext } from "./route-context";
import {
  WebsiteDocsSearchTransport,
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
              loadDocsSearch: () =>
                Effect.runPromise(Effect.die("Unrequested search fixture")),
              loadSettings,
            },
            history: createMemoryHistory({ initialEntries: ["/"] }),
            parseSearch: websiteSearchParameters.parse,
            routeTree,
            stringifySearch: websiteSearchParameters.stringify,
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
    "retains literal search words and reloads changed query addresses",
    () =>
      Effect.gen(function* () {
        const settings = yield* Schema.decodeUnknownEffect(
          WebsitePublicSettings
        )({
          apiOrigin: "https://api.taxkit.example",
          websiteOrigin: "https://taxkit.example",
        });
        const bootstrap = {
          catalogue: yield* Schema.encodeEffect(WebsiteCatalogueTransport)(
            Result.succeed({ calculators: [] })
          ),
          settings: yield* Schema.encodeEffect(WebsiteSettingsTransport)(
            Result.succeed(settings)
          ),
          submission: undefined,
        };
        const loadDocsSearch = vi.fn(
          (options: Parameters<RouterContext["loadDocsSearch"]>[0]) =>
            Effect.runPromise(
              Effect.fromResult(options.query).pipe(
                Effect.map((query) =>
                  Result.succeed({
                    navigation: { primaryNavigation: [] },
                    results: [],
                    settings,
                    term: query.term ?? "",
                  })
                ),
                Effect.catchTag("DocsSearchInputError", (error) =>
                  Effect.succeed(Result.fail(error))
                ),
                Effect.flatMap(Schema.encodeEffect(WebsiteDocsSearchTransport))
              ),
              { signal: options.signal }
            )
        );
        // The browser runner already owns an HTML document. Use a plain fixture
        // shell around the actual search route's loader and components.
        const rootLoader = yield* Effect.fromOption(
          Option.fromUndefinedOr(RootRoute.options.loader)
        );
        const searchLoader = yield* Effect.fromOption(
          Option.fromUndefinedOr(SearchRoute.options.loader)
        );
        const searchComponent = yield* Effect.fromOption(
          Option.fromUndefinedOr(SearchRoute.options.component)
        );
        const searchReload = yield* Effect.fromOption(
          Option.fromUndefinedOr(SearchRoute.options.shouldReload)
        );
        const fixtureRoot = createRootRouteWithContext<RouterContext>()({
          component: Outlet,
          loader: rootLoader,
        });
        const fixtureSearch = createRoute({
          component: searchComponent,
          errorComponent: SearchRoute.options.errorComponent,
          getParentRoute: () => fixtureRoot,
          loader: searchLoader,
          path: "/search",
          shouldReload: searchReload,
        });
        const router = yield* Effect.acquireRelease(
          Effect.sync(() =>
            createRouter({
              context: {
                loadDocsPage: () =>
                  Effect.runPromise(
                    Effect.die("Unrequested documentation fixture")
                  ),
                loadDocsSearch,
                loadSettings: () =>
                  Effect.runPromise(Effect.succeed(bootstrap)),
              },
              history: createMemoryHistory({
                initialEntries: ["/search?term=Quickstart"],
              }),
              parseSearch: websiteSearchParameters.parse,
              routeTree: fixtureRoot.addChildren([fixtureSearch]),
              stringifySearch: websiteSearchParameters.stringify,
            })
          ),
          (value) => Effect.sync(() => value.history.destroy())
        );
        yield* Effect.promise(() => router.load());
        // Mount the actual router consumer: its Transitioner owns history
        // subscription and completing a browser navigation after rendering.
        // A scoped detached fixture is enough for these rendered-value checks;
        // real page, focus and form interaction stay in the native journey.
        const host = yield* Effect.acquireRelease(
          Effect.sync(() => document.createElement("section")),
          (element) => Effect.sync(() => element.remove())
        );
        const reactRoot = yield* Effect.acquireRelease(
          Effect.sync(() => createRoot(host)),
          (value) => Effect.sync(() => value.unmount())
        );
        reactRoot.render(<RouterProvider router={router} />);
        yield* Effect.promise(() =>
          expect
            .poll(() => host.querySelector("h1")?.textContent)
            .toBe("Search documentation")
        );
        yield* Effect.forEach(
          ["1e3", '"null"', "税 😀", "2025", "true"],
          (term) =>
            Effect.gen(function* () {
              yield* Effect.promise(() =>
                router.navigate({
                  href: `/search?${new URLSearchParams({ term })}`,
                })
              );
              yield* Effect.promise(() =>
                expect
                  .poll(
                    () =>
                      host.querySelector<HTMLInputElement>("input[type=search]")
                        ?.value
                  )
                  .toBe(term)
              );
              const match = yield* Effect.fromOption(
                Array.findFirst(
                  router.state.matches,
                  (value) => value.routeId === "/search"
                )
              );
              const result = yield* Schema.decodeUnknownEffect(
                WebsiteDocsSearchTransport
              )(match.loaderData);
              expect(Result.isSuccess(result) && result.success.term).toBe(
                term
              );
            })
        );
        yield* Effect.promise(() =>
          router.navigate({ href: "/search?term=PRIVATE9&term=Quickstart" })
        );
        yield* Effect.promise(() =>
          expect
            .poll(() => host.textContent)
            .toContain("Enter up to 100 characters")
        );
        const match = yield* Effect.fromOption(
          Array.findFirst(
            router.state.matches,
            (value) => value.routeId === "/search"
          )
        );
        const result = yield* Schema.decodeUnknownEffect(
          WebsiteDocsSearchTransport
        )(match.loaderData);
        expect(Result.isFailure(result) && result.failure._tag).toBe(
          "DocsSearchInputError"
        );
        expect(loadDocsSearch).toHaveBeenCalledTimes(7);
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
                loadDocsSearch: () =>
                  Effect.runPromise(Effect.die("Unrequested search fixture")),
                loadSettings,
              },
              history: createMemoryHistory({ initialEntries: ["/"] }),
              parseSearch: websiteSearchParameters.parse,
              routeTree,
              stringifySearch: websiteSearchParameters.stringify,
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
