import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import type { DocsContentPage, DocsNavigation } from "@taxkit/content/schemas";
import { Array, Effect, HashSet } from "effect";

import { DocsCatalogueBuildError } from "./errors.js";

// The authored frontmatter and navigation status own publication. This policy
// receives compiled pages and constructs the one public catalogue from them.
export const projectPublicCatalogue = Effect.fn("DocsCatalogue.project")(
  function* (pages: readonly DocsContentPage[], navigation: DocsNavigation) {
    const published = Array.filter(
      pages,
      (page) => page.frontmatter.status === "published"
    );
    if (published.length === 0) {
      return yield* new DocsCatalogueBuildError({
        operation: "no-published-pages",
      });
    }
    if (navigation.status !== "published") {
      return yield* new DocsCatalogueBuildError({ operation: "project" });
    }
    const publishedPaths = HashSet.fromIterable(
      Array.map(published, (page) => page.path)
    );
    // A published child needs its published section page. Do not silently
    // lose it when its parent remains a draft.
    if (
      Array.some(
        navigation.primaryNavigation,
        (item) =>
          !HashSet.has(publishedPaths, item.path) &&
          Array.some(item.pages ?? [], (child) =>
            HashSet.has(publishedPaths, child.path)
          )
      )
    ) {
      return yield* new DocsCatalogueBuildError({ operation: "project" });
    }
    return yield* DocsPublicCatalogue.makeEffect({
      navigation: {
        primaryNavigation: Array.map(
          Array.filter(navigation.primaryNavigation, (item) =>
            HashSet.has(publishedPaths, item.path)
          ),
          (item) => ({
            ...item,
            pages: Array.filter(item.pages ?? [], (child) =>
              HashSet.has(publishedPaths, child.path)
            ),
          })
        ),
      },
      pages: Array.map(published, (page) => ({
        ...page,
        frontmatter: { ...page.frontmatter, status: "published" as const },
      })),
      schemaVersion: 1,
    }).pipe(
      Effect.mapError(
        () => new DocsCatalogueBuildError({ operation: "project" })
      )
    );
  }
);
