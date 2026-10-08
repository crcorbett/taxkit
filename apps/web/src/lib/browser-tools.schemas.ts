import { Schema } from "effect";

export class WebsiteBrowserToolFailure extends Schema.TaggedClass<WebsiteBrowserToolFailure>()(
  "WebsiteBrowserToolFailure",
  {
    code: Schema.Literals([
      "invalid-input",
      "calculation-busy",
      "no-current-result",
      "service-unavailable",
    ]),
    message: Schema.tag("This page tool could not complete the request."),
    retry: Schema.Literals([
      "check-the-visible-form",
      "wait-then-try-manually",
      "try-again-manually",
    ]),
  }
) {}

export class WebsiteBrowserToolRegistrationFailed extends Schema.TaggedError<WebsiteBrowserToolRegistrationFailed>()(
  "WebsiteBrowserToolRegistrationFailed",
  {
    reason: Schema.Literals([
      "AbortError",
      "DataCloneError",
      "InvalidStateError",
      "NotAllowedError",
      "NotSupportedError",
      "SecurityError",
      "registration-timeout",
      "unexpected-host-refusal",
    ]),
    tool: Schema.String.check(Schema.isMaxLength(128)),
  }
) {}
