import { Schema } from "effect";

export class CalculatorRequestBodyTooLarge extends Schema.TaggedError<CalculatorRequestBodyTooLarge>()(
  "CalculatorRequestBodyTooLarge",
  {
    code: Schema.tag("request-too-large"),
    message: Schema.tag(
      "This request is too large. Reduce it to 64 KiB or less and try again."
    ),
    retry: Schema.tag("reduce-request"),
  }
) {}

export class CalculatorRequestBodyTimedOut extends Schema.TaggedError<CalculatorRequestBodyTimedOut>()(
  "CalculatorRequestBodyTimedOut",
  {
    code: Schema.tag("request-timeout"),
    message: Schema.tag(
      "This request could not be read within five seconds. Try again when you are ready."
    ),
    retry: Schema.tag("try-again-manually"),
  }
) {}

export const CalculatorRequestBodyErrorEnvelope = Schema.Struct({
  error: Schema.Union([
    CalculatorRequestBodyTooLarge,
    CalculatorRequestBodyTimedOut,
  ]),
});

export const CalculatorRequestBodyPolicy = Schema.Struct({
  responseFormat: Schema.Literals(["json", "html"]),
});
export type CalculatorRequestBodyPolicy =
  typeof CalculatorRequestBodyPolicy.Type;

export class CalculatorRequestBodyRejected extends Schema.TaggedError<CalculatorRequestBodyRejected>()(
  "CalculatorRequestBodyRejected",
  { reason: Schema.Literals(["size", "deadline"]) }
) {}
