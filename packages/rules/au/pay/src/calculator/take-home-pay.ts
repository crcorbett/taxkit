import { Money } from "@whattax/core/primitives";
import { TraceNode } from "@whattax/core/trace";
import { Effect, Layer, Schema } from "effect";

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

/**
 * Take-home pay report for one Australian pay-period scenario.
 *
 * The report preserves gross pay, taxable pay, the withholding ledger,
 * final net pay, and the trace rooted at the net-pay rule.
 *
 * @since 0.1.0
 */
export class TakeHomePayReport extends Schema.TaggedClass<TakeHomePayReport>()(
  "TakeHomePayReport",
  {
    grossPay: Money,
    netPay: Money,
    period: PayPeriod,
    rulePackVersion: Schema.String,
    taxablePay: Money,
    trace: TraceNode,
    withholdings: PayWithholdingsLedger,
    withholdingsTotal: Money,
  }
) {}

/**
 * Calculates the take-home pay report from the facts supplied by a rule pack.
 *
 * Requires the derived `TaxablePayFact`, `PayWithholdingsLedgerFact`, and
 * `NetPayFact`; scenario input is supplied separately by `TakeHomeScenarioLive`.
 *
 * @since 0.1.0
 */
export const CalculateTakeHomePay = Effect.gen(function* () {
  const gross = yield* GrossPayFact;
  const taxable = yield* TaxablePayFact;
  const ledger = yield* PayWithholdingsLedgerFact;
  const net = yield* NetPayFact;

  return new TakeHomePayReport({
    grossPay: gross.amount,
    netPay: net.amount,
    period: gross.period,
    rulePackVersion: "rules-au-pay/0.0.0",
    taxablePay: taxable.amount,
    trace: net.trace,
    withholdings: ledger,
    withholdingsTotal: ledger.total,
  });
});

/**
 * Calculates the pay-period withholding ledger from the standard pay scenario.
 *
 * This is the withholding-specific calculator entrypoint over the same
 * scenario and PAYG ledger facts used by take-home pay.
 *
 * @since 0.1.0
 */
export const CalculatePayWithholdings = Effect.gen(function* () {
  return yield* PayWithholdingsLedgerFact;
});

/**
 * Input schema for the standard take-home-pay scenario helper.
 *
 * @since 0.1.0
 */
export const TakeHomeScenarioInputSchema = Schema.Struct({
  grossPay: GrossPay,
  taxFreeThresholdClaimed: Schema.Boolean,
});

/**
 * Input type for the standard take-home-pay scenario helper.
 *
 * @since 0.1.0
 */
export type TakeHomeScenarioInput = typeof TakeHomeScenarioInputSchema.Type;

/**
 * Builds the typed scenario layer for gross pay and tax-free-threshold status.
 *
 * Use this after an owning boundary has decoded `TakeHomeScenarioInput`.
 *
 * @since 0.1.0
 */
export const TakeHomeScenarioLiveFromInput = (input: TakeHomeScenarioInput) =>
  Layer.mergeAll(
    Layer.succeed(GrossPayFact)(input.grossPay),
    Layer.succeed(TaxFreeThresholdClaimedFact)(
      new TaxFreeThresholdClaimed({
        value: input.taxFreeThresholdClaimed,
      })
    )
  );
