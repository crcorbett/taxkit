import { describe, expect, it } from "@effect/vitest";
import { isNotFound } from "@tanstack/react-router";
import { TaxKitApi } from "@taxkit/api-http/api";
import { CalculatorCatalogResponse } from "@taxkit/calculators/schemas";
import { DocsPageUnavailable } from "@taxkit/content/errors";
import {
  DocsPublicationOrigin,
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import {
  Array,
  Effect,
  Fiber,
  Layer,
  Match,
  Option,
  Ref,
  Result,
  Schema,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { vi } from "vitest";

import {
  ApiClient,
  apiClientRuntime,
  publicSettingsAtom,
} from "./api/client.atoms";
import { WebsiteLoadError } from "./api/errors";
import { readDocsSearchTerm } from "./docs/search-location.boundary";
import { loadDocsPage, loadDocsSearch, loadRoot } from "./runtime.client";
import {
  WebsiteDocsSearchView,
  WebsitePublicSettings,
  WebsiteRootView,
} from "./schemas";

const json = { headers: { "content-type": "application/json" } };

// A real generated client over a controlled transport, with the actual
// one-registry loader runner.
const fixture = Effect.fnUntraced(function* (
  respond: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<Response>
) {
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
    (value) => Effect.sync(() => value.dispose())
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
        const { context } = yield* fixture((request) =>
          Effect.succeed(
            new Response(
              request.url.includes("navigation")
                ? navigation
                : Match.value(reply).pipe(
                    Match.when("malformed", () => "{}"),
                    Match.orElse(() => encodedPage)
                  ),
              json
            )
          )
        );
        const result = yield* Effect.tryPromise({
          catch: (error) => ({
            loadError: Schema.is(WebsiteLoadError)(error),
            notFound: isNotFound(error),
          }),
          try: () =>
            loadDocsPage({
              context,
              path: reply === "mismatched" ? "/start/quickstart" : page.path,
              signal: new AbortController().signal,
            }),
        }).pipe(Effect.result);
        expect(Result.isSuccess(result)).toBe(succeeds);
        if (Result.isSuccess(result)) {
          expect(result.success.page.path).toBe(page.path);
        } else {
          expect(result.failure).toEqual({ loadError: true, notFound: false });
        }
      }).pipe(Effect.scoped)
  );

  it.effect("reuses one native client from the shared registry", () =>
    Effect.gen(function* () {
      const catalogue = yield* exampleContentCatalogue;
      const navigation = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPublicNavigation)
      )(catalogue.navigation);
      const page = yield* Array.head(catalogue.pages).pipe(Effect.fromOption);
      const encodedPage = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPublicPage)
      )(page);
      const emptyCatalogue = yield* Schema.encodeEffect(
        Schema.fromJsonString(CalculatorCatalogResponse)
      )({ calculators: [] });
      const { builds, context } = yield* fixture((request) =>
        Effect.sync(() => {
          if (request.url.includes("/navigation")) {
            return new Response(navigation, json);
          }
          return request.url.includes("/page")
            ? new Response(encodedPage, json)
            : new Response(emptyCatalogue, json);
        })
      );
      const { signal } = new AbortController();
      const root = yield* Effect.promise(() =>
        loadRoot({ context, signal, submission: undefined })
      );
      const view = yield* Schema.decodeUnknownEffect(WebsiteRootView)(
        root.view
      );
      expect(Option.isSome(view.catalogue)).toBe(true);
      expect(view.settings.publicationOrigin.href).toBe(
        "https://taxkit.example/"
      );
      const loaded = yield* Effect.promise(() =>
        loadDocsPage({ context, path: page.path, signal })
      );
      expect(loaded.page.path).toBe(page.path);
      expect(loaded.publicationOrigin).toBe("https://taxkit.example/");
      expect(yield* Ref.get(builds)).toBe(1);
      expect(
        DocsPublicationOrigin.make(new URL(loaded.publicationOrigin))
      ).toBeInstanceOf(URL);
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
      const { context } = yield* fixture((request) =>
        Effect.sync(() =>
          request.url.includes("/navigation")
            ? new Response(navigation, json)
            : new Response(unavailable, { ...json, status: 404 })
        )
      );
      const { signal } = new AbortController();
      const invalid = yield* Effect.tryPromise({
        // Read the rejection as TanStack does: native not-found or our load error.
        catch: (error) => ({
          loadError: Schema.is(WebsiteLoadError)(error),
          notFound: isNotFound(error),
        }),
        try: () => loadDocsPage({ context, path: "/Not A Page", signal }),
      }).pipe(Effect.flip);
      expect(invalid).toEqual({ loadError: false, notFound: true });
      const missing = yield* Effect.tryPromise({
        // Read the rejection as TanStack does: native not-found or our load error.
        catch: (error) => ({
          loadError: Schema.is(WebsiteLoadError)(error),
          notFound: isNotFound(error),
        }),
        try: () => loadDocsPage({ context, path: "/start/missing", signal }),
      }).pipe(Effect.flip);
      expect(missing).toEqual({ loadError: false, notFound: true });
    }).pipe(Effect.scoped)
  );

  it.effect("reports an unavailable API as a load error, not a page", () =>
    Effect.gen(function* () {
      const { context } = yield* fixture(() =>
        Effect.succeed(new Response(null, { status: 503 }))
      );
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
      expect(failure).toEqual({ loadError: true, notFound: false });
    }).pipe(Effect.scoped)
  );

  it.effect("cancels the HTTP call when the loader is aborted", () =>
    Effect.gen(function* () {
      const started = vi.fn();
      const interrupted = vi.fn();
      const { context } = yield* fixture(() =>
        Effect.sync(started).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() => Effect.sync(interrupted))
        )
      );
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
      yield* Effect.promise(() =>
        expect.poll(() => started.mock.calls.length).toBeGreaterThan(0)
      );
      controller.abort();
      yield* Fiber.join(pending);
      yield* Effect.promise(() =>
        expect.poll(() => interrupted.mock.calls.length).toBeGreaterThan(0)
      );
    }).pipe(Effect.scoped)
  );

  it.effect("returns invalid search words as a page state", () =>
    Effect.gen(function* () {
      const { context } = yield* fixture(() =>
        Effect.die("No request for invalid words")
      );
      const result = yield* Effect.promise(() =>
        loadDocsSearch({
          context,
          query: readDocsSearchTerm(`term=${"x".repeat(101)}`),
          signal: new AbortController().signal,
        })
      );
      expect(result).toEqual(WebsiteDocsSearchView.InvalidSearch());
    }).pipe(Effect.scoped)
  );
});
