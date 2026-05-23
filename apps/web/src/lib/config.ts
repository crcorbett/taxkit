import { Data } from "effect";

export class WhatTaxWebConfigError extends Data.TaggedError(
  "WhatTaxWebConfigError"
)<{
  readonly cause: unknown;
  readonly message: string;
}> {}
