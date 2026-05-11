import { Effect, Layer } from "effect";
import { aud } from "@whattax/core/primitives";
import type { Money } from "@whattax/core/primitives";
import type { TraceNode } from "@whattax/core/trace";
import { AnnualTaxableIncome, AnnualTaxableIncomeFact } from "../facts/income.js";
import { type AnnualTaxLedger, AnnualTaxLedgerFact } from "../facts/ledger.js";

export class AnnualTaxReport {
  readonly _tag = "AnnualTaxReport";
  constructor(
    readonly fields: {
      readonly taxableIncome: Money;
      readonly ledger: AnnualTaxLedger;
      /** Raw sum of all components — may be negative if offsets exceed tax. */
      readonly rawLiability: Money;
      /** Tax payable — floored at $0. Negative raw liabilities mean no tax is owed. */
      readonly liability: Money;
      readonly rulePackVersion: string;
      readonly trace: TraceNode;
    },
  ) {}
  get taxableIncome(): Money { return this.fields.taxableIncome; }
  get ledger(): AnnualTaxLedger { return this.fields.ledger; }
  get rawLiability(): Money { return this.fields.rawLiability; }
  get liability(): Money { return this.fields.liability; }
  get rulePackVersion(): string { return this.fields.rulePackVersion; }
  get trace(): TraceNode { return this.fields.trace; }
}

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
    rulePackVersion: "spike-au-income-tax/0.0.0",
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
