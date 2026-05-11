import { Money, aud } from "@whattax/core/primitives";
import { TraceNode } from "@whattax/core/trace";
import { Context, Effect, Layer, Schema } from "effect";

import {
  AnnualTaxableIncome,
  AnnualTaxableIncomeFact,
} from "../facts/income.js";
import { AnnualTaxLedger, AnnualTaxLedgerFact } from "../facts/ledger.js";

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
    rulePackVersion: Schema.String,
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
    rulePackVersion: "rules-au-income-tax/0.0.0",
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
 * Builds the scenario layer for annual taxable income.
 *
 * @param input - Unknown input decoded by `AnnualTaxScenarioInputSchema`.
 * @returns A layer providing `AnnualTaxableIncomeFact`.
 * @since 0.1.0
 */
export const AnnualTaxScenarioLive = (input: unknown) =>
  Layer.effectContext(
    Schema.decodeUnknownEffect(AnnualTaxScenarioInputSchema)(input).pipe(
      Effect.map((scenario) =>
        Context.make(
          AnnualTaxableIncomeFact,
          new AnnualTaxableIncome({ income: scenario.taxableIncome })
        )
      )
    )
  );
