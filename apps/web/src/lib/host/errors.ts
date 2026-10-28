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

// TanStack renders the route's error component with 503 for unavailable API
// reads or 500 for internal defects and mismatched checked replies.
export class WebsiteLoadError extends Schema.TaggedError<WebsiteLoadError>()(
  "WebsiteLoadError",
  { status: Schema.Literals([500, 503]) }
) {}
