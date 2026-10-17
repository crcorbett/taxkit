import { Schema } from "effect";

export class DocsDiscoveryUnavailable extends Schema.TaggedError<DocsDiscoveryUnavailable>()(
  "DocsDiscoveryUnavailable",
  {
    message: Schema.Literal(
      "Documentation discovery is temporarily unavailable."
    ),
  }
) {}
