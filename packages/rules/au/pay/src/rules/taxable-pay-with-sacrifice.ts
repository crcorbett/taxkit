import { CalculationError } from "@taxkit/core/errors";
import { moneySub } from "@taxkit/core/primitives";
import { RuleId, TraceNode } from "@taxkit/core/trace";
import { Effect, Layer } from "effect";

import { GrossPayFact, TaxablePay, TaxablePayFact } from "../facts/pay.js";
import { SalarySacrificeFact } from "../facts/sacrifice.js";

/**
 * Rule id for deriving taxable pay after pre-tax salary sacrifice.
 *
 * @since 0.1.0
 */
export const TaxablePayWithSacrificeRuleId = RuleId.make(
  "taxkit/rules-au-pay/rule/TaxablePayWithSacrifice"
);

/**
 * Variant of the TaxablePay rule that subtracts pre-tax salary sacrifice.
 *
 * Replaces (does not augment) the base `TaxablePayLive`: a pack composes
 * one or the other. Period mismatch between gross and sacrifice fails the
 * effect — pre-rate-table conversion is not a concern of this implementation.
 *
 * @throws CalculationError when gross pay and salary sacrifice periods differ.
 * @since 0.1.0
 */
export const TaxablePayWithSacrificeLive = Layer.effect(TaxablePayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const sacrifice = yield* SalarySacrificeFact;

    if (gross.period !== sacrifice.period) {
      return yield* new CalculationError({
        message: `taxkit/rules-au-pay: salary sacrifice period (${sacrifice.period}) must match gross pay period (${gross.period})`,
      });
    }

    const taxableAmount = moneySub(gross.amount, sacrifice.amount);

    const trace = TraceNode.make({
      children: [],
      formula: "taxable = gross - sacrifice",
      inputs: {
        grossCents: gross.amount.cents,
        period: gross.period,
        sacrificeCents: sacrifice.amount.cents,
      },
      result: taxableAmount.cents,
      ruleId: TaxablePayWithSacrificeRuleId,
      sources: [],
      title: "Taxable pay with pre-tax salary sacrifice",
    });

    return new TaxablePay({
      amount: taxableAmount,
      period: gross.period,
      trace,
    });
  })
);
