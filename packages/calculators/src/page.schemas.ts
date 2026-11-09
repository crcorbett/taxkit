import { Schema } from "effect";

import { CalculatorForm, CalculatorFormField } from "./form.ingress.js";
import { CalculatorId, CalculatorRunReport } from "./schemas.js";
// One calculator page's presentation value. A retained answer stays visible, with an explicit stale flag
// after an edit, failed refresh or cancelled attempt. `invalidField` names the
// visible field the current message belongs to; a calculation failure has none.
export const CalculatorViewState = Schema.Struct({
  busy: Schema.Boolean,
  calculatorId: CalculatorId,
  form: CalculatorForm,
  invalidField: Schema.Option(CalculatorFormField),
  message: Schema.Option(Schema.String),
  report: Schema.Option(CalculatorRunReport),
  stale: Schema.Boolean,
});
export type CalculatorViewState = typeof CalculatorViewState.Type;
