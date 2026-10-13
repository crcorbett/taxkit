import { Context } from "effect";
import type { Effect, Schema } from "effect";

import type {
  FumadocsPageNotFoundError,
  FumadocsSourceLoadError,
} from "./errors.js";
import type { FumadocsSourcePage } from "./schemas.js";

export interface FumadocsSourceContract {
  readonly getPage: (
    slugs: readonly string[],
    locale?: string
  ) => Effect.Effect<
    FumadocsSourcePage,
    FumadocsPageNotFoundError | FumadocsSourceLoadError
  >;
  readonly listPages: (
    locale?: string
  ) => Effect.Effect<readonly FumadocsSourcePage[], FumadocsSourceLoadError>;
}

export class FumadocsSource extends Context.Service<
  FumadocsSource,
  FumadocsSourceContract
>()("@taxkit/docs-fumadocs/FumadocsSource") {}

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

// The generated collection owner supplies its adapter at composition. The live
// Layer is the only consumer of these untrusted generated representations.
export class FumadocsGeneratedCollection extends Context.Service<
  FumadocsGeneratedCollection,
  FumadocsGeneratedCollectionAdapter
>()("@taxkit/docs-fumadocs/FumadocsGeneratedCollection") {}
