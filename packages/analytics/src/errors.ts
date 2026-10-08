import { Schema } from "effect";

export class AnalyticsConfigurationError extends Schema.TaggedError<AnalyticsConfigurationError>()(
  "AnalyticsConfigurationError",
  { operation: Schema.Literal("configure") }
) {}
export class AnalyticsCaptureError extends Schema.TaggedError<AnalyticsCaptureError>()(
  "AnalyticsCaptureError",
  {
    operation: Schema.Literals(["pageview", "calculator-use", "shutdown"]),
    reason: Schema.Literals([
      "transport",
      "rejected",
      "deadline",
      "encoding",
      "identity",
      "response-size",
      "sdk",
      "closed",
    ]),
  }
) {}
