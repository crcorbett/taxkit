import { Effect, Layer, Schema } from "effect";
import { Money, aud } from "@whattax/core/primitives";
import { TraceNode } from "@whattax/core/trace";
import { AnnualTaxableIncome, AnnualTaxableIncomeFact } from "../facts/income.js";
import { AnnualTaxLedger, AnnualTaxLedgerFact } from "../facts/ledger.js";

export class AnnualTaxReport
  extends Schema.TaggedClass<AnnualTaxReport>()("AnnualTaxReport", {
    taxableIncome: Money,
    ledger: AnnualTaxLedger,
    rawLiability: Money,
    liability: Money,
    rulePackVersion: Schema.String,
    trace: TraceNode,
  }) {}

export const CalculateAnnualTax = Effect.gen(function* () {
  const income = yield* AnnualTaxableIncomeFact;
  const ledger = yield* AnnualTaxLedgerFact;

  const rawLiability = ledger.rawLiability;
  const liability = rawLiability.cents < 0 ? aud(0) : rawLiability;

  return new AnnualTaxReport({
    taxableIncome: income.income,
    ledger,
    rawLiability,
    liability,
    rulePackVersion: "rules-au-income-tax/0.0.0",
    trace: ledger.trace,
  });
});

export interface AnnualTaxScenarioInput {
  readonly taxableIncome: Money;
}

export const AnnualTaxScenarioLive = (input: AnnualTaxScenarioInput) =>
  Layer.succeed(AnnualTaxableIncomeFact)(
    new AnnualTaxableIncome({ income: input.taxableIncome }),
  );
