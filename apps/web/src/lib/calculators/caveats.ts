import type { CalculatorRunRequest } from "@taxkit/calculators/schemas";
import { Match, Option } from "effect";

// The one owner of the known annual-tax limitation. The calculator page, its
// answer's assumptions and the agent guide all render this sentence.
export const medicareThresholdCaveat =
  "The annual income-tax calculator’s Medicare levy thresholds are awaiting correction. Its answer may overstate the levy for some lower incomes.";

// A page-level notice shown before the visitor relies on an answer.
export const calculatorCaveat = (
  calculatorId: CalculatorRunRequest["calculatorId"]
) =>
  Match.value(calculatorId).pipe(
    Match.when("au.income-tax.annual", () =>
      Option.some(medicareThresholdCaveat)
    ),
    Match.whenOr("au.pay.take-home", "au.pay.withholdings", () =>
      Option.none<string>()
    ),
    Match.exhaustive
  );
