import { Data } from "effect";

export class TaxKitWebConfigError extends Data.TaggedError(
  "TaxKitWebConfigError"
)<{
  readonly cause: unknown;
  readonly message: string;
}> {}
