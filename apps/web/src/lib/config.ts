import { Schema } from "effect";

export class TaxKitWebConfigError extends Schema.TaggedError<TaxKitWebConfigError>()(
  "TaxKitWebConfigError",
  {
    message: Schema.Literal("TaxKit web settings are missing or invalid."),
    operation: Schema.Literal("settings"),
    runtime: Schema.Literals(["client", "server"]),
  }
) {}
