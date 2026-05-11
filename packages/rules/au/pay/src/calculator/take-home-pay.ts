import { Money } from "@whattax/core/primitives";
import { TraceNode } from "@whattax/core/trace";
import { Context, Effect, Layer, Schema } from "effect";

import {
  GrossPay,
  GrossPayFact,
  NetPayFact,
  PayPeriod,
  TaxablePayFact,
  TaxFreeThresholdClaimed,
  TaxFreeThresholdClaimedFact,
} from "../facts/pay.js";
import {
  PayWithholdingsLedger,
  PayWithholdingsLedgerFact,
} from "../facts/withholdings.js";

export class TakeHomePayReport extends Schema.TaggedClass<TakeHomePayReport>()(
  "TakeHomePayReport",
  {
    grossPay: Money,
    taxablePay: Money,
    withholdings: PayWithholdingsLedger,
    withholdingsTotal: Money,
    netPay: Money,
    period: PayPeriod,
    rulePackVersion: Schema.String,
    trace: TraceNode,
  }
) {}

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
    rulePackVersion: "rules-au-pay/0.0.0",
    trace: net.trace,
  });
});

export const TakeHomeScenarioInputSchema = Schema.Struct({
  grossPay: GrossPay,
  taxFreeThresholdClaimed: Schema.Boolean,
});

export type TakeHomeScenarioInput = typeof TakeHomeScenarioInputSchema.Type;

export const TakeHomeScenarioLive = (input: unknown) =>
  Layer.effectContext(
    Schema.decodeUnknownEffect(TakeHomeScenarioInputSchema)(input).pipe(
      Effect.map((scenario) =>
        Context.mergeAll(
          Context.make(GrossPayFact, scenario.grossPay),
          Context.make(
            TaxFreeThresholdClaimedFact,
            new TaxFreeThresholdClaimed({
              value: scenario.taxFreeThresholdClaimed,
            })
          )
        )
      )
    )
  );
