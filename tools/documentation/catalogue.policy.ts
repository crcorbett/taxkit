import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import type {
  DocsContentPage,
  DocsNavigation,
  PublicPageAcceptanceRecordV2,
} from "@taxkit/content/schemas";
import { Array, Effect, HashSet } from "effect";

import { DocsCatalogueBuildError } from "./schemas.js";

// Representation decoding belongs at file ingress. This policy receives only
// checked records and compiled pages, and constructs the one public catalogue.
export const projectPublicCatalogue = Effect.fn("DocsCatalogue.project")(
  function* (
    pages: readonly DocsContentPage[],
    navigation: DocsNavigation,
    records: readonly PublicPageAcceptanceRecordV2[]
  ) {
    const accepted = Array.filter(
      pages,
      (page) => page.frontmatter.status === "published"
    );
    if (accepted.length === 0) {
      return yield* new DocsCatalogueBuildError({
        operation: "no-accepted-pages",
      });
    }
    const targets = [
      "packages/docs-content/navigation.json",
      ...Array.map(accepted, (page) => `packages/docs-content/${page.source}`),
    ];
    const recordTargets = Array.map(records, (record) => record.targetPath);
    if (
      navigation.status !== "published" ||
      records.length !== targets.length ||
      HashSet.size(HashSet.fromIterable(recordTargets)) !== records.length ||
      !Array.every(targets, (target) => Array.contains(recordTargets, target))
    ) {
      return yield* new DocsCatalogueBuildError({ operation: "project" });
    }
    const acceptedPaths = HashSet.fromIterable(
      Array.map(accepted, (page) => page.path)
    );
    // An accepted child needs its accepted section page. Do not silently lose
    // it when its parent remains a draft.
    if (
      Array.some(
        navigation.primaryNavigation,
        (item) =>
          !HashSet.has(acceptedPaths, item.path) &&
          Array.some(item.pages ?? [], (child) =>
            HashSet.has(acceptedPaths, child.path)
          )
      )
    ) {
      return yield* new DocsCatalogueBuildError({ operation: "project" });
    }
    return yield* DocsPublicCatalogue.makeEffect({
      navigation: {
        primaryNavigation: Array.map(
          Array.filter(navigation.primaryNavigation, (item) =>
            HashSet.has(acceptedPaths, item.path)
          ),
          (item) => ({
            ...item,
            pages: Array.filter(item.pages ?? [], (child) =>
              HashSet.has(acceptedPaths, child.path)
            ),
          })
        ),
      },
      pages: Array.map(accepted, (page) => ({
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
