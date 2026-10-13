import { Context, Effect, Layer } from "effect";

import {
  GrossPayFact,
  NetPayFact,
  TaxablePayFact,
  TaxFreeThresholdClaimed,
  TaxFreeThresholdClaimedFact,
} from "../facts/pay.js";
import { PayWithholdingsLedgerFact } from "../facts/withholdings.js";
import { PayRulePackVersion, TakeHomePayReport } from "./schemas.js";
import type { TakeHomeScenarioInput } from "./schemas.js";

export {
  TakeHomePayReport,
  TakeHomeScenarioInputSchema,
  type TakeHomeScenarioInput,
} from "./schemas.js";

export { PayWithholdingsLedgerFact as CalculatePayWithholdings } from "../facts/withholdings.js";

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
    rulePackVersion: PayRulePackVersion.make("rules-au-pay/1.0.0"),
    taxablePay: taxable.amount,
    trace: net.trace,
    withholdings: ledger,
    withholdingsTotal: ledger.total,
  });
});

/**
 * The caller's decoded take-home scenario. Supply it with
 * `Layer.succeed(TakeHomeScenario)(input)` after decoding
 * `TakeHomeScenarioInputSchema` at the caller's boundary.
 *
 * @since 2.0.0
 */
export class TakeHomeScenario extends Context.Service<
  TakeHomeScenario,
  TakeHomeScenarioInput
>()("taxkit/rules-au-pay/TakeHomeScenario") {}

/**
 * Provides gross pay and tax-free-threshold status from `TakeHomeScenario`.
 *
 * @since 2.0.0
 */
export const TakeHomeScenarioLive = Layer.mergeAll(
  Layer.effect(
    GrossPayFact,
    TakeHomeScenario.pipe(Effect.map((scenario) => scenario.grossPay))
  ),
  Layer.effect(
    TaxFreeThresholdClaimedFact,
    TakeHomeScenario.pipe(
      Effect.map(
        (scenario) =>
          new TaxFreeThresholdClaimed({
            value: scenario.taxFreeThresholdClaimed,
          })
      )
    )
  )
);
