import { requestDocsPage, requestDocsSearch } from "@taxkit/api-http/requests";
import type { TaxKitClient } from "@taxkit/api-http/requests";
import { docsPageMetadata } from "@taxkit/content/publication";
import { Effect } from "effect";

import { WebsiteDocsSearchView, docsStartPath } from "../docs/schemas";
import type { WebsiteDocsPageView } from "../docs/schemas";
import type { WebsiteDocsSearchQuery } from "../docs/search-location.ingress";
import type {
  TaxKitWebConfigError,
  WebsiteApiConfigError,
} from "../host/errors";
import type { WebsitePublicSettings } from "../host/schemas";
import { routeLoadFailures, withSafeDefects } from "./load.failure";
import type { RouteLoadFailure } from "./load.failure";

// Each runtime supplies its own checked settings and generated client; both
// may fail only with the Website's named configuration errors.
type WebsiteConfigFailure = TaxKitWebConfigError | WebsiteApiConfigError;

// The failures one documentation read can produce, each translated once.
const docsReadFailures = {
  ApiDeadlineExceeded: "unavailable",
  ApiReplyMismatch: "invalid-reply",
  ApiReplyTooLarge: "unavailable",
  ApiUnavailable: "unavailable",
  TaxKitWebConfigError: "unavailable",
  WebsiteApiConfigError: "unavailable",
} as const;

/** One documentation page with its navigation and publication metadata. */
export const loadDocsPageView = <RC, RS>({
  client,
  path,
  settings,
}: Readonly<{
  client: Effect.Effect<TaxKitClient, WebsiteConfigFailure, RC>;
  path: string;
  settings: Effect.Effect<WebsitePublicSettings, WebsiteConfigFailure, RS>;
}>): Effect.Effect<WebsiteDocsPageView, RouteLoadFailure, RC | RS> =>
  Effect.gen(function* () {
    const current = yield* settings;
    const { navigation, page } = yield* requestDocsPage({
      address: path,
      client: yield* client,
    });
    return {
      metadata: yield* docsPageMetadata({
        origin: current.publicationOrigin,
        page,
      }),
      navigation,
      page,
    };
  }).pipe(
    Effect.catchTags(
      routeLoadFailures({
        ...docsReadFailures,
        DocsMetadataError: "invalid-reply",
        DocsPageUnavailable: "missing",
      })
    ),
    withSafeDefects,
    Effect.withSpan("Website.loadDocsPageView")
  );

/**
 * The search page. Invalid words are a normal page state; valid words read
 * the matching pages and the start page's navigation together.
 */
export const loadDocsSearchView = <R>({
  client,
  query,
}: Readonly<{
  client: Effect.Effect<TaxKitClient, WebsiteConfigFailure, R>;
  query: WebsiteDocsSearchQuery;
}>): Effect.Effect<WebsiteDocsSearchView, RouteLoadFailure, R> =>
  Effect.fromResult(query).pipe(
    Effect.matchEffect({
      onFailure: () => Effect.succeed(WebsiteDocsSearchView.InvalidSearch()),
      onSuccess: (term) =>
        client.pipe(
          Effect.flatMap((generated) =>
            Effect.all(
              {
                home: requestDocsPage({
                  address: docsStartPath,
                  client: generated,
                }),
                results: requestDocsSearch({ client: generated, term }),
              },
              { concurrency: "unbounded" }
            )
          ),
          Effect.map(({ home, results }) =>
            WebsiteDocsSearchView.Found({
              navigation: home.navigation,
              results,
              term,
              theme: home.page.theme,
            })
          ),
          // The start page is part of the search frame, so its absence is a
          // broken deployment rather than a missing search page.
          Effect.catchTags(
            routeLoadFailures({
              ...docsReadFailures,
              DocsPageUnavailable: "invalid-reply",
              DocsSearchUnavailable: "unavailable",
            })
          )
        ),
    }),
    withSafeDefects,
    Effect.withSpan("Website.loadDocsSearchView")
  );
