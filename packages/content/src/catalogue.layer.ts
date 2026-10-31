import navigationRepresentation from "@content/docs/navigation.json" with { type: "json" };
import {
  Function as EffectFunction,
  Array,
  Effect,
  HashMap,
  HashSet,
  Layer,
  Match,
  Result,
  Schema,
} from "effect";

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
    const leaves = EffectFunction.pipe(
      navigation.primaryNavigation,
      Array.flatMap((item) => [item, ...(item.pages ?? [])])
    );
    const addresses = HashMap.fromIterable(
      EffectFunction.pipe(
        leaves,
        Array.map((leaf) => [leaf.source, leaf.path] as const)
      )
    );
    if (
      sources.length !== leaves.length ||
      !EffectFunction.pipe(
        sources,
        Array.every((source) => HashMap.has(addresses, source.path))
      )
    ) {
      return yield* catalogueFailure(
        "The bundled MDX files must match the navigation."
      );
    }
    const pages = yield* EffectFunction.pipe(
      leaves,
      Effect.forEach((leaf) =>
        Effect.gen(function* () {
          const source = yield* EffectFunction.pipe(
            sources,
            Array.findFirst((candidate) => candidate.path === leaf.source),
            Effect.fromOption,
            Effect.mapError(() =>
              catalogueFailure(
                "The bundled MDX files must match the navigation."
              )
            )
          );
          const page = yield* reader.read(source);
          const slugs = yield* EffectFunction.pipe(
            EffectFunction.pipe(
              leaf.path.split("/"),
              Array.filter((segment) => segment !== "")
            ),
            Effect.forEach((segment) => DocsPageSlug.makeEffect(segment)),
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
      )
    );
    const published = HashSet.fromIterable(
      EffectFunction.pipe(
        pages,
        Array.flatMap((page) =>
          Match.value(page.frontmatter.status).pipe(
            Match.when("published", () => [page.path]),
            Match.when("draft", () => []),
            Match.exhaustive
          )
        )
      )
    );
    // A published child needs its published section page; it is never
    // silently dropped because its parent is still a draft.
    if (
      navigation.status !== "published" ||
      EffectFunction.pipe(
        navigation.primaryNavigation,
        Array.some(
          (item) =>
            !HashSet.has(published, item.path) &&
            EffectFunction.pipe(
              item.pages ?? [],
              Array.some((child) => HashSet.has(published, child.path))
            )
        )
      )
    ) {
      return yield* catalogueFailure(
        "Published pages need published navigation and section pages."
      );
    }
    return yield* DocsPublicCatalogue.makeEffect({
      navigation: {
        primaryNavigation: EffectFunction.pipe(
          navigation.primaryNavigation,
          Array.filter((item) => HashSet.has(published, item.path)),
          Array.map((item) => ({
            ...item,
            pages: EffectFunction.pipe(
              item.pages ?? [],
              Array.filter((child) => HashSet.has(published, child.path))
            ),
          }))
        ),
      },
      pages: EffectFunction.pipe(
        pages,
        Array.filterMap((page) =>
          Match.value(page.frontmatter).pipe(
            Match.when({ status: "published" }, (frontmatter) =>
              Result.succeed({ ...page, frontmatter })
            ),
            Match.when({ status: "draft" }, () => Result.failVoid),
            Match.exhaustive
          )
        )
      ),
      schemaVersion: 1,
    }).pipe(
      Effect.mapError(() =>
        catalogueFailure("The public docs catalogue is invalid.")
      )
    );
  })
);
