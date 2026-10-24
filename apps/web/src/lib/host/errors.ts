import { Schema } from "effect";

export class TaxKitWebConfigError extends Schema.TaggedError<TaxKitWebConfigError>()(
  "TaxKitWebConfigError",
  {
    message: Schema.Literal("TaxKit web settings are missing or invalid."),
    operation: Schema.Literal("settings"),
    runtime: Schema.Literals(["client", "server"]),
  }
) {}

// API binding/configuration fails independently of public Website settings.
export class WebsiteApiConfigError extends Schema.TaggedError<WebsiteApiConfigError>()(
  "WebsiteApiConfigError",
  { message: Schema.tag("TaxKit API settings are missing or invalid.") }
) {}

// A page load that could not reach or use the API. TanStack renders the
// route's error component; the server reply carries this status.
export class WebsiteLoadError extends Schema.TaggedError<WebsiteLoadError>()(
  "WebsiteLoadError",
  { status: Schema.Literal(503) }
) {}
