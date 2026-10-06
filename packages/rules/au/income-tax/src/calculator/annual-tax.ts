import { Cents, Money } from "@taxkit/core/primitives";
import { Effect, Layer } from "effect";

import {
  AnnualTaxableIncome,
  AnnualTaxableIncomeFact,
} from "../facts/income.js";
import { AnnualTaxLedgerFact } from "../facts/ledger.js";
import { AnnualTaxReport, AnnualTaxRulePackVersion } from "./schemas.js";
import type { AnnualTaxScenarioInput } from "./schemas.js";

export {
  AnnualTaxReport,
  AnnualTaxScenarioInputSchema,
  type AnnualTaxScenarioInput,
} from "./schemas.js";

/**
 * Calculates annual income tax from the supplied taxable income and derived
 * annual tax ledger.
 *
 * @since 0.1.0
 */
export const CalculateAnnualTax = Effect.gen(function* () {
  const income = yield* AnnualTaxableIncomeFact;
  const ledger = yield* AnnualTaxLedgerFact;

  const { rawLiability } = ledger;
  const liability =
    rawLiability.cents < 0
      ? new Money({ cents: Cents.make(0), currency: "AUD" })
      : rawLiability;

  return new AnnualTaxReport({
    ledger,
    liability,
    rawLiability,
    rulePackVersion: AnnualTaxRulePackVersion.make("rules-au-income-tax/1.0.0"),
    taxableIncome: income.income,
    trace: ledger.trace,
  });
});

/**
 * Builds the typed scenario layer for annual taxable income.
 *
 * Use this after an owning boundary has decoded `AnnualTaxScenarioInput`.
 *
 * @since 0.1.0
 */
export const AnnualTaxScenarioLiveFromInput = (input: AnnualTaxScenarioInput) =>
  Layer.succeed(AnnualTaxableIncomeFact)(
    new AnnualTaxableIncome({ income: input.taxableIncome })
  );
