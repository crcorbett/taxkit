import { Effect, Layer, Option, Schema } from "effect";

import {
  FumadocsPageNotFoundError,
  FumadocsSourceLoadError,
} from "./errors.js";
import { FumadocsSourcePage, FumadocsSourcePages } from "./schemas.js";
import type { FumadocsSourcePage as FumadocsSourcePageValue } from "./schemas.js";
import { FumadocsSource } from "./service.js";

type UntrustedFumadocsPage = typeof Schema.Unknown.Type;

export interface FumadocsGeneratedCollectionAdapter {
  readonly getPage: (
    slugs: readonly string[],
    locale?: string
  ) => Effect.Effect<UntrustedFumadocsPage, FumadocsSourceLoadError>;
  readonly listPages: (
    locale?: string
  ) => Effect.Effect<UntrustedFumadocsPage, FumadocsSourceLoadError>;
}

export const makeFumadocsSourceLive = (
  adapter: FumadocsGeneratedCollectionAdapter
) =>
  Layer.succeed(
    FumadocsSource,
    FumadocsSource.of({
      getPage: (slugs, locale) =>
        adapter.getPage(slugs, locale).pipe(
          Effect.mapError(
            () =>
              new FumadocsSourceLoadError({
                message: "The Fumadocs page lookup failed.",
                operation: "getPage",
              })
          ),
          Effect.flatMap((candidate) =>
            Option.fromUndefinedOr(candidate).pipe(
              Option.match({
                onNone: (): Effect.Effect<
                  FumadocsSourcePageValue,
                  FumadocsPageNotFoundError | FumadocsSourceLoadError
                > =>
                  Effect.fail(
                    new FumadocsPageNotFoundError({
                      locale,
                      slugs,
                    })
                  ),
                onSome: (
                  page
                ): Effect.Effect<
                  FumadocsSourcePageValue,
                  FumadocsPageNotFoundError | FumadocsSourceLoadError
                > =>
                  Schema.decodeUnknownEffect(FumadocsSourcePage)(page).pipe(
                    Effect.mapError(
                      () =>
                        new FumadocsSourceLoadError({
                          message:
                            "The Fumadocs page representation was invalid.",
                          operation: "getPage",
                        })
                    )
                  ),
              })
            )
          )
        ),
      listPages: (locale) =>
        adapter.listPages(locale).pipe(
          Effect.mapError(
            () =>
              new FumadocsSourceLoadError({
                message: "The Fumadocs page listing failed.",
                operation: "listPages",
              })
          ),
          Effect.flatMap((candidate) =>
            Schema.decodeUnknownEffect(FumadocsSourcePages)(candidate).pipe(
              Effect.mapError(
                () =>
                  new FumadocsSourceLoadError({
                    message:
                      "The Fumadocs page-list representation was invalid.",
                    operation: "listPages",
                  })
              )
            )
          )
        ),
    })
  );
