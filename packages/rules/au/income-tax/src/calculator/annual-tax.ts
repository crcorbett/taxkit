import { Cents, Money } from "@taxkit/core/primitives";
import { Context, Effect, Layer, Boolean as EffectBoolean } from "effect";

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
  const liability = EffectBoolean.match(rawLiability.cents < 0, {
    onFalse: () => rawLiability,
    onTrue: () => new Money({ cents: Cents.make(0), currency: "AUD" }),
  });
  return new AnnualTaxReport({
    ledger,
    liability,
    rawLiability,
    rulePackVersion: AnnualTaxRulePackVersion.make("rules-au-income-tax/1.0.1"),
    taxableIncome: income.income,
    trace: ledger.trace,
  });
});
/**
 * The caller's decoded annual tax scenario. Supply it with
 * `Layer.succeed(AnnualTaxScenario)(input)` after decoding
 * `AnnualTaxScenarioInputSchema` at the caller's boundary.
 *
 * @since 2.0.0
 */
export class AnnualTaxScenario extends Context.Service<
  AnnualTaxScenario,
  AnnualTaxScenarioInput
>()("taxkit/rules-au-income-tax/AnnualTaxScenario") {}
/**
 * Provides annual taxable income from `AnnualTaxScenario`.
 *
 * @since 2.0.0
 */
export const AnnualTaxScenarioLive = Layer.effect(
  AnnualTaxableIncomeFact,
  AnnualTaxScenario.pipe(
    Effect.map(
      (scenario) => new AnnualTaxableIncome({ income: scenario.taxableIncome })
    )
  )
);
