import { Schema } from "effect";

import { CalculatorForm } from "./form.ingress.js";
import {
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "./schemas.js";
// One presentation value is shared by a calculator page's visible form and its
// browser tools. A retained answer stays visible, with an explicit stale flag
// after an edit, failed refresh or cancelled attempt.
export const CalculatorViewState = Schema.Struct({
  busy: Schema.Boolean,
  calculatorId: CalculatorRunServiceRequest.fields.calculatorId,
  form: CalculatorForm,
  message: Schema.Option(Schema.String),
  report: Schema.Option(CalculatorRunResponse.fields.report),
  stale: Schema.Boolean,
});
export type CalculatorViewState = typeof CalculatorViewState.Type;
// A page tool's safe answer when it cannot complete. It names what the agent
// may do next and never carries a transport Cause or provider message.
export class CalculatorToolFailure extends Schema.TaggedClass<
  CalculatorToolFailure,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorToolFailure", {
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
}) {}
