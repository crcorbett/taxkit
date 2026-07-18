import { Money, aud } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import { Effect, Layer, Schema } from "effect";

import {
  AnnualTaxableIncome,
  AnnualTaxableIncomeFact,
} from "../facts/income.js";
import { AnnualTaxLedger, AnnualTaxLedgerFact } from "../facts/ledger.js";

/**
 * Independent version of the Australian annual-income-tax ruleset represented
 * by this report.
 *
 * @since 1.0.0
 */
const AnnualTaxRulePackVersion = Schema.Literal("rules-au-income-tax/1.0.0");

/**
 * Annual Australian income tax report for one taxable-income scenario.
 *
 * `rawLiability` is the ledger total before flooring. `liability` is floored
 * at zero so offsets cannot produce a negative payable amount.
 *
 * @since 0.1.0
 */
export class AnnualTaxReport extends Schema.TaggedClass<AnnualTaxReport>()(
  "AnnualTaxReport",
  {
    ledger: AnnualTaxLedger,
    liability: Money,
    rawLiability: Money,
    rulePackVersion: AnnualTaxRulePackVersion,
    taxableIncome: Money,
    trace: TraceNode,
  }
) {}

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
  const liability = rawLiability.cents < 0 ? aud(0) : rawLiability;

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
 * Input schema for the annual-tax scenario helper.
 *
 * @since 0.1.0
 */
export const AnnualTaxScenarioInputSchema = Schema.Struct({
  taxableIncome: Money,
});

/**
 * Input type for the annual-tax scenario helper.
 *
 * @since 0.1.0
 */
export type AnnualTaxScenarioInput = typeof AnnualTaxScenarioInputSchema.Type;

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
