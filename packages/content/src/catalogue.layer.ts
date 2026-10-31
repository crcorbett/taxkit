import navigationRepresentation from "@content/docs/navigation.json" with { type: "json" };
import { Array, Effect, HashMap, HashSet, Layer, Result, Schema } from "effect";

import { DocsSourceError } from "./errors.js";
import {
  DocsNavigation,
  DocsPageSlug,
  DocsPublicCatalogue,
} from "./schemas.js";
import { ContentCatalogue, DocsPageReader, DocsSources } from "./service.js";

const catalogueFailure = (message: string) =>
  new DocsSourceError({ message, operation: "buildCatalogue" });

// The one public catalogue, built once from the bundled MDX files. The
// navigation decides each page's address and order; frontmatter decides
// whether it is published. Any unreadable page fails the Layer.
export const ContentCatalogueLive = Layer.effect(
  ContentCatalogue,
  Effect.gen(function* () {
    const sources = yield* DocsSources;
    const reader = yield* DocsPageReader;
    const navigation = yield* Schema.decodeUnknownEffect(DocsNavigation)(
      navigationRepresentation
    ).pipe(
      Effect.mapError(() => catalogueFailure("The docs navigation is invalid."))
    );
    const leaves = Array.flatMap(navigation.primaryNavigation, (item) => [
      item,
      ...(item.pages ?? []),
    ]);
    const addresses = HashMap.fromIterable(
      Array.map(leaves, (leaf) => [leaf.source, leaf.path] as const)
    );
    if (
      sources.length !== leaves.length ||
      !Array.every(sources, (source) => HashMap.has(addresses, source.path))
    ) {
      return yield* catalogueFailure(
        "The bundled MDX files must match the navigation."
      );
    }
    const pages = yield* Effect.forEach(leaves, (leaf) =>
      Effect.gen(function* () {
        const source = yield* Array.findFirst(
          sources,
          (candidate) => candidate.path === leaf.source
        ).pipe(
          Effect.fromOption,
          Effect.mapError(() =>
            catalogueFailure("The bundled MDX files must match the navigation.")
          )
        );
        const page = yield* reader.read(source);
        const slugs = yield* Effect.forEach(
          Array.filter(leaf.path.split("/"), (segment) => segment !== ""),
          (segment) => DocsPageSlug.makeEffect(segment)
        ).pipe(
          Effect.mapError(() =>
            catalogueFailure("A navigation address is invalid.")
          )
        );
        return {
          ...page,
          path: leaf.path,
          slugs,
          source: source.path,
        };
      })
    );
    const published = HashSet.fromIterable(
      Array.flatMap(pages, (page) =>
        page.frontmatter.status === "published" ? [page.path] : []
      )
    );
    // A published child needs its published section page; it is never
    // silently dropped because its parent is still a draft.
    if (
      navigation.status !== "published" ||
      Array.some(
        navigation.primaryNavigation,
        (item) =>
          !HashSet.has(published, item.path) &&
          Array.some(item.pages ?? [], (child) =>
            HashSet.has(published, child.path)
          )
      )
    ) {
      return yield* catalogueFailure(
        "Published pages need published navigation and section pages."
      );
    }
    return yield* DocsPublicCatalogue.makeEffect({
      navigation: {
        primaryNavigation: Array.map(
          Array.filter(navigation.primaryNavigation, (item) =>
            HashSet.has(published, item.path)
          ),
          (item) => ({
            ...item,
            pages: Array.filter(item.pages ?? [], (child) =>
              HashSet.has(published, child.path)
            ),
          })
        ),
      },
      pages: Array.filterMap(pages, (page) =>
        page.frontmatter.status === "published"
          ? Result.succeed({
              ...page,
              frontmatter: {
                ...page.frontmatter,
                status: "published" as const,
              },
            })
          : Result.failVoid
      ),
      schemaVersion: 1,
    }).pipe(
      Effect.mapError(() =>
        catalogueFailure("The public docs catalogue is invalid.")
      )
    );
  })
);
