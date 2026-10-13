import { Array, Context, Effect, Layer, Option, Schema } from "effect";

import {
  FumadocsPageNotFoundError,
  FumadocsSourceLoadError,
} from "./errors.js";
import { FumadocsSourcePages } from "./schemas.js";
import type { FumadocsSourcePages as FumadocsSourcePagesValue } from "./schemas.js";
import { FumadocsSource } from "./service.js";

export class FumadocsSourceFixtures extends Context.Service<
  FumadocsSourceFixtures,
  FumadocsSourcePagesValue
>()("@taxkit/docs-fumadocs/FumadocsSourceFixtures") {}

export const FumadocsSourceTest = Layer.effect(
  FumadocsSource,
  FumadocsSourceFixtures.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(FumadocsSourcePages)),
    Effect.mapError(
      () =>
        new FumadocsSourceLoadError({
          message: "The deterministic Fumadocs fixtures were invalid.",
          operation: "listPages",
        })
    ),
    Effect.map((pages) =>
      FumadocsSource.of({
        getPage: (slugs, locale) =>
          Array.findFirst(
            pages,
            (page) => page.slugs.join("/") === slugs.join("/")
          ).pipe(
            Option.match({
              onNone: () =>
                Effect.fail(
                  new FumadocsPageNotFoundError({
                    locale,
                    slugs,
                  })
                ),
              onSome: Effect.succeed,
            })
          ),
        listPages: () => Effect.succeed(pages),
      })
    )
  )
);
