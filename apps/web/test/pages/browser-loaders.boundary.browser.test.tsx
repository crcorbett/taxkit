import { describe, expect, it } from "@effect/vitest";
import { isNotFound } from "@tanstack/react-router";
import { TaxKitApi } from "@taxkit/api-http/api";
import { DocsPageUnavailable } from "@taxkit/content/errors";
import { DocsPublicNavigation, DocsPublicPage } from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import {
  Schedule,
  Function as EffectFunction,
  Array,
  Effect,
  Fiber,
  Layer,
  Match,
  Option,
  Ref,
  Result,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { TestClock } from "effect/testing";
import { vi } from "vitest";

import {
  ApiClient,
  apiClientRuntime,
  publicSettingsAtom,
} from "../../src/lib/api-client.atoms";
import { WebsiteDocsSearchView } from "../../src/lib/docs/schemas";
import { readDocsSearchTerm } from "../../src/lib/docs/search-location.ingress";
import { WebsiteLoadError } from "../../src/lib/host/errors";
import {
  WebsitePublicSettings,
  WebsiteRootView,
} from "../../src/lib/host/schemas";
import {
  loadDocsPage,
  loadDocsSearch,
  loadRoot,
} from "../../src/lib/runtime.client";

const json = { headers: { "content-type": "application/json" } };
// A real generated client over a controlled transport, with the actual
// one-registry loader runner.
const fixture = Effect.fnUntraced(function* ({
  respond,
}: {
  readonly respond: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<Response>;
}) {
  const builds = yield* Ref.make(0);
  const settings = yield* Schema.decodeUnknownEffect(WebsitePublicSettings)({
    apiOrigin: "https://api.taxkit.example",
    publicationOrigin: "https://taxkit.example",
    websiteOrigin: "https://preview.taxkit.example",
  });
  const client = Layer.effect(
    ApiClient,
    Ref.update(builds, (count) => count + 1).pipe(
      Effect.andThen(
        HttpApiClient.makeWith(TaxKitApi, {
          baseUrl: settings.apiOrigin,
          httpClient: HttpClient.make((request) =>
            respond(request).pipe(
              Effect.map((response) =>
                HttpClientResponse.fromWeb(request, response)
              )
            )
          ),
        })
      )
    )
  );
  const registry = yield* Effect.acquireRelease(
    Effect.sync(() =>
      AtomRegistry.make({
        initialValues: [
          [publicSettingsAtom, Option.some(settings)],
          [apiClientRuntime.layer, client],
        ],
      })
    ),
    (value) =>
      Effect.sync(() => {
        value.dispose();
      })
  );
  return { builds, context: { registry: Option.some(registry) } };
});
describe("browser route loaders", () => {
  it.effect.each([
    { reply: "matching", succeeds: true },
    { reply: "mismatched", succeeds: false },
    { reply: "malformed", succeeds: false },
  ] as const)(
    "checks a $reply docs reply through the browser loader",
    ({ reply, succeeds }) =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const page = yield* Array.head(catalogue.pages).pipe(Effect.fromOption);
        const navigation = yield* Schema.encodeEffect(
          Schema.fromJsonString(DocsPublicNavigation)
        )(catalogue.navigation);
        const encodedPage = yield* Schema.encodeEffect(
          Schema.fromJsonString(DocsPublicPage)
        )(page);
        const { context } = yield* fixture({
          respond: (request) =>
            Effect.succeed(
              new Response(
                EffectBoolean.match(request.url.includes("navigation"), {
                  onFalse: () =>
                    Match.value(reply).pipe(
                      Match.when("malformed", (): "{}" => "{}"),
                      Match.orElse(() => encodedPage)
                    ),
                  onTrue: () => navigation,
                }),
                json
              )
            ),
        });
        const result = yield* Effect.tryPromise({
          catch: (error) => ({
            loadError: Schema.is(WebsiteLoadError)(error),
            notFound: isNotFound(error),
          }),
          try: () =>
            loadDocsPage({
              context,
              path: Match.value(reply).pipe(
                Match.when(
                  "mismatched",
                  (): "/start/quickstart" => "/start/quickstart"
                ),
                Match.orElse(() => page.path)
              ),
              signal: new AbortController().signal,
            }),
        }).pipe(Effect.result);
        EffectFunction.pipe(Result.isSuccess(result), (actual) => {
          expect(actual).toBe(succeeds);
        });
        if (Result.isSuccess(result)) {
          expect(result.success.page.path).toBe(page.path);
        } else {
          expect(result.failure).toStrictEqual({
            loadError: true,
            notFound: false,
          });
        }
      }).pipe(Effect.scoped)
  );
  it.effect("loads root without catalogue I/O and reuses the docs client", () =>
    Effect.gen(function* () {
      const catalogue = yield* exampleContentCatalogue;
      const navigation = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPublicNavigation)
      )(catalogue.navigation);
      const page = yield* Array.head(catalogue.pages).pipe(Effect.fromOption);
      const encodedPage = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPublicPage)
      )(page);
      const { builds, context } = yield* fixture({
        respond: (request) =>
          EffectBoolean.match(
            // A valid catalogue transport can stall while Content stays healthy.
            // Root completion must not start or wait for that optional operation.
            request.url.includes("/calculators"),
            {
              onFalse: () =>
                Effect.sync(() =>
                  EffectBoolean.match(request.url.includes("/navigation"), {
                    onFalse: () => new Response(encodedPage, json),
                    onTrue: () => new Response(navigation, json),
                  })
                ),
              onTrue: () => Effect.never,
            }
          ),
      });
      const { signal } = new AbortController();
      const root = yield* Effect.promise(() => loadRoot({ context, signal }));
      const view = yield* Schema.decodeUnknownEffect(WebsiteRootView)(
        root.view
      );
      expect({
        RefGetBuilds: yield* Ref.get(builds),
        viewSettingsPublicationOriginHref: view.settings.publicationOrigin.href,
      }).toStrictEqual({
        RefGetBuilds: 0,
        viewSettingsPublicationOriginHref: "https://taxkit.example/",
      });
      const loaded = yield* Effect.promise(() =>
        loadDocsPage({ context, path: page.path, signal })
      );
      expect(loaded.page.path).toBe(page.path);
      expect(loaded.metadata.canonical).toBe(
        `https://taxkit.example${page.path}`
      );
      yield* Effect.promise(() =>
        loadDocsPage({ context, path: page.path, signal })
      );
      expect(yield* Ref.get(builds)).toBe(1);
      expect(loaded.metadata.markdown).toBe(
        `https://taxkit.example${page.path}.md`
      );
    }).pipe(Effect.scoped)
  );
  it.effect("translates missing pages to the native not found", () =>
    Effect.gen(function* () {
      const catalogue = yield* exampleContentCatalogue;
      const navigation = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPublicNavigation)
      )(catalogue.navigation);
      const unavailable = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPageUnavailable)
      )(
        new DocsPageUnavailable({
          message: "The documentation page was not found.",
        })
      );
      const { context } = yield* fixture({
        respond: (request) =>
          Effect.sync(() =>
            EffectBoolean.match(request.url.includes("/navigation"), {
              onFalse: () =>
                new Response(unavailable, { ...json, status: 404 }),
              onTrue: () => new Response(navigation, json),
            })
          ),
      });
      const { signal } = new AbortController();
      const invalid = yield* Effect.tryPromise({
        // Read the rejection as TanStack does: native not-found or our load error.
        catch: (error) => ({
          loadError: Schema.is(WebsiteLoadError)(error),
          notFound: isNotFound(error),
        }),
        try: () => loadDocsPage({ context, path: "/Not A Page", signal }),
      }).pipe(Effect.flip);
      expect(invalid).toStrictEqual({ loadError: false, notFound: true });
      const missing = yield* Effect.tryPromise({
        // Read the rejection as TanStack does: native not-found or our load error.
        catch: (error) => ({
          loadError: Schema.is(WebsiteLoadError)(error),
          notFound: isNotFound(error),
        }),
        try: () => loadDocsPage({ context, path: "/start/missing", signal }),
      }).pipe(Effect.flip);
      expect(missing).toStrictEqual({ loadError: false, notFound: true });
    }).pipe(Effect.scoped)
  );
  it.effect("reports an unavailable API as a load error, not a page", () =>
    Effect.gen(function* () {
      const { context } = yield* fixture({
        respond: () => Effect.succeed(new Response(null, { status: 503 })),
      });
      const failure = yield* Effect.tryPromise({
        // Read the rejection as TanStack does: native not-found or our load error.
        catch: (error) => ({
          loadError: Schema.is(WebsiteLoadError)(error),
          notFound: isNotFound(error),
        }),
        try: () =>
          loadDocsPage({
            context,
            path: "/start/quickstart",
            signal: new AbortController().signal,
          }),
      }).pipe(Effect.flip);
      expect(failure).toStrictEqual({ loadError: true, notFound: false });
    }).pipe(Effect.scoped)
  );
  it.effect("cancels the HTTP call when the loader is aborted", () =>
    Effect.gen(function* () {
      const started = vi.fn<(...args: readonly unknown[]) => void>();
      const interrupted = vi.fn<(...args: readonly unknown[]) => void>();
      const { context } = yield* fixture({
        respond: () =>
          Effect.sync(started).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Effect.sync(interrupted))
          ),
      });
      const controller = new AbortController();
      const pending = yield* Effect.forkChild(
        Effect.tryPromise({
          // Read the rejection as TanStack does: native not-found or our load error.
          catch: (error) => ({
            loadError: Schema.is(WebsiteLoadError)(error),
            notFound: isNotFound(error),
          }),
          try: () =>
            loadDocsSearch({
              context,
              query: readDocsSearchTerm("term=tax"),
              signal: controller.signal,
            }),
        }).pipe(Effect.flip)
      );
      yield* Effect.sync(() => started.mock.calls.length).pipe(
        Effect.repeat({
          until: (observed) => observed > 0,
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toBeGreaterThan(0);
          })
        )
      );
      controller.abort();
      yield* Fiber.join(pending);
      yield* Effect.sync(() => interrupted.mock.calls.length).pipe(
        Effect.repeat({
          until: (observed) => observed > 0,
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toBeGreaterThan(0);
          })
        )
      );
    }).pipe(Effect.scoped)
  );
  it.effect("returns invalid search words as a page state", () =>
    Effect.gen(function* () {
      const { context } = yield* fixture({
        respond: () => Effect.die("No request for invalid words"),
      });
      const result = yield* Effect.promise(() =>
        loadDocsSearch({
          context,
          query: readDocsSearchTerm(`term=${"x".repeat(101)}`),
          signal: new AbortController().signal,
        })
      );
      expect(result).toStrictEqual(WebsiteDocsSearchView.InvalidSearch());
    }).pipe(Effect.scoped)
  );
});
