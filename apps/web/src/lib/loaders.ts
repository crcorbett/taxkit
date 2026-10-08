import { createServerFn } from "@tanstack/react-start";
import { Effect, Result, Schema } from "effect";

import type { readDocsSearchLocation } from "./docs/search-location.boundary";
import {
  loadWebsiteDocsSearchServer,
  loadWebsiteDocsPageServer,
  loadWebsiteSettingsServer,
} from "./loaders.server";
import { WebsiteDocsSearchHeader, WebsiteDocsSearchTransport } from "./schemas";
import type { WebsiteServerRenderContext } from "./schemas";

const websiteSettings = createServerFn({ method: "GET" }).handler(() =>
  loadWebsiteSettingsServer()
);
// Use the native generated identity at ingress; never mirror a build-time ID.
export const WebsiteSettingsFunctionPath = websiteSettings.url;
const websiteDocsPage = createServerFn({ method: "GET" }).handler(() =>
  loadWebsiteDocsPageServer()
);
export const WebsiteDocsPageFunctionPath = websiteDocsPage.url;

export const loadWebsiteDocsPage = (options: {
  readonly path: string;
  readonly signal: AbortSignal;
}) =>
  Effect.runPromise(
    Effect.promise(() =>
      websiteDocsPage({
        headers: { "x-taxkit-docs-page": options.path },
        signal: options.signal,
      })
    ),
    { signal: options.signal }
  );

const websiteDocsSearch = createServerFn({ method: "GET" }).handler(() =>
  loadWebsiteDocsSearchServer()
);
export const WebsiteDocsSearchFunctionPath = websiteDocsSearch.url;
export const loadWebsiteDocsSearch = (options: {
  readonly query: ReturnType<typeof readDocsSearchLocation>;
  readonly signal: AbortSignal;
}) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const query = yield* Effect.fromResult(options.query);
      const header = yield* Schema.encodeEffect(WebsiteDocsSearchHeader)(
        query.term ?? ""
      ).pipe(Effect.orDie);
      return yield* Effect.promise(() =>
        websiteDocsSearch({
          headers: { "x-taxkit-docs-search": header },
          signal: options.signal,
        })
      );
    }).pipe(
      Effect.catchTag("DocsSearchInputError", (error) =>
        Schema.encodeEffect(WebsiteDocsSearchTransport)(
          Result.fail(error)
        ).pipe(Effect.orDie)
      )
    ),
    { signal: options.signal }
  );

// The framework owns this plain Promise transport. Its small Effect carries
// the request signal and encoded SSR submission; it owns no client or Layer.
export const loadWebsiteSettings = (options: {
  readonly signal: AbortSignal;
  readonly submission?: WebsiteServerRenderContext["submission"];
}) =>
  Effect.runPromise(
    Effect.promise(() => websiteSettings({ signal: options.signal })).pipe(
      Effect.map((bootstrap) => ({
        catalogue: "catalogue" in bootstrap ? bootstrap.catalogue : undefined,
        settings: "settings" in bootstrap ? bootstrap.settings : undefined,
        submission: options.submission,
      }))
    ),
    { signal: options.signal }
  );
