import { CalculatorCatalogueLive } from "@taxkit/calculators/live";
import {
  DocsPageSlug,
  DocsPublicPage,
  DocsPublicPagePath,
  DocsSourcePath,
} from "@taxkit/content/schemas";
import { ContentService } from "@taxkit/content/service";
import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import { apiWorkerNativeInit, apiWorkerProps } from "api/composition";
import { ApiContentLive } from "api/content";
import { Context, Effect, Layer } from "effect";

// Native fixture entry: the real API composition whose Content answers every
// page read with another page's identity, to qualify the Website's check.
const MismatchedContent = Layer.effect(
  ContentService,
  ApiContentLive.pipe(
    Layer.build,
    Effect.map((context) => Context.get(context, ContentService)),
    Effect.map((content) =>
      ContentService.of({
        getNavigation: Effect.fn("ContentService.getNavigation")(() =>
          content.getNavigation()
        ),
        listPages: Effect.fn("ContentService.listPages")(() =>
          content.listPages()
        ),
        searchPages: Effect.fn("ContentService.searchPages")((input) =>
          content.searchPages(input)
        ),
        getPage: Effect.fn("ContentService.getPage")((path) =>
          content.getPage(path).pipe(
            Effect.map((page) =>
              DocsPublicPage.make({
                ...page,
                path: DocsPublicPagePath.make("/private9"),
                slugs: [DocsPageSlug.make("private9")],
                source: DocsSourcePath.make("private9.mdx"),
              })
            )
          )
        ),
      })
    )
  )
);
// The replacement Content comes last, so it answers ContentService reads.
const DocsAddressInit = Layer.mergeAll(
  ApiContentLive,
  CalculatorCatalogueLive,
  MismatchedContent
).pipe(apiWorkerNativeInit);

export default TaxKitApiWorker.make(
  { ...apiWorkerProps, main: import.meta.url },
  DocsAddressInit
);
