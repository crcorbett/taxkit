import { Effect, Layer } from "effect";
import type { Money } from "@whattax/core/primitives";
import type { TraceNode } from "@whattax/core/trace";
import {
  GrossPay,
  GrossPayFact,
  NetPayFact,
  type PayPeriod,
  TaxablePayFact,
  TaxFreeThresholdClaimed,
  TaxFreeThresholdClaimedFact,
} from "../facts/pay.js";
import {
  type PayWithholdingsLedger,
  PayWithholdingsLedgerFact,
} from "../facts/withholdings.js";

export class TakeHomePayReport {
  readonly _tag = "TakeHomePayReport";
  constructor(
    readonly fields: {
      readonly grossPay: Money;
      readonly taxablePay: Money;
      readonly withholdings: PayWithholdingsLedger;
      readonly withholdingsTotal: Money;
      readonly netPay: Money;
      readonly period: PayPeriod;
      readonly rulePackVersion: string;
      readonly trace: TraceNode;
    },
  ) {}
  get grossPay(): Money {
    return this.fields.grossPay;
  }
  get taxablePay(): Money {
    return this.fields.taxablePay;
  }
  get withholdings(): PayWithholdingsLedger {
    return this.fields.withholdings;
  }
  get withholdingsTotal(): Money {
    return this.fields.withholdingsTotal;
  }
  get netPay(): Money {
    return this.fields.netPay;
  }
  get period(): PayPeriod {
    return this.fields.period;
  }
  get rulePackVersion(): string {
    return this.fields.rulePackVersion;
  }
  get trace(): TraceNode {
    return this.fields.trace;
  }
}

/**
 * The calculator. Requires the derived facts and surfaces the report
 * with a stitched trace tree rooted at NetPayFact.
 */
export const CalculateTakeHomePay = Effect.gen(function* () {
  const gross = yield* GrossPayFact;
  const taxable = yield* TaxablePayFact;
  const ledger = yield* PayWithholdingsLedgerFact;
  const net = yield* NetPayFact;

  return new TakeHomePayReport({
    grossPay: gross.amount,
    taxablePay: taxable.amount,
    withholdings: ledger,
    withholdingsTotal: ledger.total,
    netPay: net.amount,
    period: gross.period,
    rulePackVersion: "spike-au-pay/0.0.0",
    trace: net.trace,
  });
});

export interface TakeHomeScenarioInput {
  readonly grossPay: GrossPay;
  readonly taxFreeThresholdClaimed: boolean;
}

export const TakeHomeScenarioLive = (input: TakeHomeScenarioInput) =>
  Layer.mergeAll(
    Layer.succeed(GrossPayFact)(input.grossPay),
    Layer.succeed(TaxFreeThresholdClaimedFact)(
      new TaxFreeThresholdClaimed({ value: input.taxFreeThresholdClaimed }),
    ),
  );
