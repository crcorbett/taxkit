import { subtract } from "@taxkit/core/primitives";
import { CalculationError } from "@taxkit/core/errors";
import { Context, Effect, Layer } from "effect";

import {
  GrossPay, GrossPayFact,
  NetPayFact,
  TaxablePayFact,
  TaxFreeThresholdClaimed,
  TaxFreeThresholdClaimedFact,
} from "../facts/pay.js";
import { PayWithholdingsLedgerFact } from "../facts/withholdings.js";
import { SalarySacrifice, SalarySacrificeFact } from "../facts/sacrifice.js";
import { TakeHomeWithSacrificeScenarioInput, PayRulePackVersion, TakeHomePayReport } from "./schemas.js";
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

  const salarySacrifice = yield* subtract(gross.amount, taxable.amount).pipe(Effect.mapError(() => new CalculationError({ message: "Pay adjustment is outside the supported range." })));
  return yield* TakeHomePayReport.makeEffect({
    grossPay: gross.amount,
    netPay: net.amount,
    salarySacrifice,
    period: gross.period,
    rulePackVersion: PayRulePackVersion.make("rules-au-pay/1.0.2"),
    taxablePay: taxable.amount,
    trace: net.trace,
    withholdings: ledger,
    withholdingsTotal: ledger.total,
  }).pipe(Effect.mapError(() => new CalculationError({ message: "Pay report invariant failed." })));
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
    TakeHomeScenario.pipe(Effect.map((scenario) => new GrossPay({ amount: scenario.grossPay, period: scenario.period })))
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

export class TakeHomeWithSacrificeScenario extends Context.Service<TakeHomeWithSacrificeScenario, TakeHomeWithSacrificeScenarioInput>()("taxkit/rules-au-pay/TakeHomeWithSacrificeScenario") {}
export const TakeHomeWithSacrificeScenarioLive = Layer.mergeAll(
  Layer.effect(GrossPayFact, TakeHomeWithSacrificeScenario.pipe(Effect.map((scenario) => new GrossPay({ amount: scenario.grossPay, period: scenario.period })))),
  Layer.effect(SalarySacrificeFact, TakeHomeWithSacrificeScenario.pipe(Effect.map((scenario) => new SalarySacrifice({ amount: scenario.salarySacrifice, period: scenario.period })))),
  Layer.effect(TaxFreeThresholdClaimedFact, TakeHomeWithSacrificeScenario.pipe(Effect.map((scenario) => new TaxFreeThresholdClaimed({ value: scenario.taxFreeThresholdClaimed }))))
);
