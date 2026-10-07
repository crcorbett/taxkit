import { Schema } from "effect";

export class WebsiteRelayFailure extends Schema.TaggedError<WebsiteRelayFailure>()(
  "WebsiteRelayFailure",
  {
    reason: Schema.Literals([
      "configuration",
      "origin",
      "metadata",
      "request",
      "request-size",
      "transport",
      "redirect",
      "response-size",
      "deadline",
    ]),
  }
) {}
