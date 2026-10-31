import navigationRepresentation from "@content/docs/navigation.json" with { type: "json" };
import repositoryRepresentation from "@content/docs/repository.json" with { type: "json" };
import { LinkResolveError } from "@taxkit/mdx/errors";
import { LinkDestination } from "@taxkit/mdx/schemas";
import { LinkResolver } from "@taxkit/mdx/service";
import { Array, Effect, HashMap, Layer, Schema } from "effect";

import { DocsSourceError } from "./errors.js";
import { DocsLinkTargets, resolveDocsHref } from "./links.js";
import {
  DocsNavigation,
  DocsRepositoryProfile,
  DocsSourcePath,
} from "./schemas.js";

export const DocsLinkTargetsLive = Layer.effect(
  DocsLinkTargets,
  Effect.gen(function* () {
    const fail = new DocsSourceError({
      message: "The publication link policy is invalid.",
      operation: "buildCatalogue",
    });
    const navigation = yield* Schema.decodeUnknownEffect(DocsNavigation)(
      navigationRepresentation
    ).pipe(Effect.mapError(() => fail));
    const repository = yield* Schema.decodeEffect(DocsRepositoryProfile)(
      repositoryRepresentation
    ).pipe(Effect.mapError(() => fail));
    return {
      pages: HashMap.fromIterable(
        Array.map(
          Array.flatMap(navigation.primaryNavigation, (item) => [
            item,
            ...(item.pages ?? []),
          ]),
          (leaf) => [leaf.source, leaf.path] as const
        )
      ),
      repository,
    };
  })
);
export const ContentLinkResolverLive = Layer.effect(
  LinkResolver,
  Effect.gen(function* () {
    const targets = yield* DocsLinkTargets;
    return LinkResolver.of({
      resolve: Effect.fn("LinkResolver.resolve")(function* (reference) {
        const source = yield* DocsSourcePath.makeEffect(
          reference.sourceId
        ).pipe(Effect.mapError(() => new LinkResolveError({ reason: "link" })));
        return yield* resolveDocsHref(reference.target, {
          ...targets,
          source,
        }).pipe(
          Effect.flatMap((href) => LinkDestination.makeEffect(href)),
          Effect.mapError(() => new LinkResolveError({ reason: "link" }))
        );
      }),
    });
  })
);
