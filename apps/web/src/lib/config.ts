import { Schema } from "effect";

// Build and ingress share the data-free native settings function's route base.
export const WebsiteServerFunctionBase = "/_serverFn";

export class TaxKitWebConfigError extends Schema.TaggedError<TaxKitWebConfigError>()(
  "TaxKitWebConfigError",
  {
    message: Schema.Literal("TaxKit web settings are missing or invalid."),
    operation: Schema.Literal("settings"),
    runtime: Schema.Literals(["client", "server"]),
  }
) {}
