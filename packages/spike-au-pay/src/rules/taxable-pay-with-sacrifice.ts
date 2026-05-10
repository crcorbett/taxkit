import { Effect, Layer } from "effect";
import { moneySub } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import {
  GrossPayFact,
  TaxablePay,
  TaxablePayFact,
} from "../facts/pay.js";
import { SalarySacrificeFact } from "../facts/sacrifice.js";

export const TaxablePayWithSacrificeRuleId = RuleId.make(
  "whattax/spike-au-pay/rule/TaxablePayWithSacrifice",
);

/**
 * Variant of the TaxablePay rule that subtracts pre-tax salary sacrifice.
 *
 * Replaces (does not augment) the base `TaxablePayLive`: a pack composes
 * one or the other. Period mismatch between gross and sacrifice fails the
 * effect — pre-rate-table conversion is not a concern of this spike.
 */
export const TaxablePayWithSacrificeLive = Layer.effect(TaxablePayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const sacrifice = yield* SalarySacrificeFact;

    if (gross.period !== sacrifice.period) {
      return yield* Effect.die(
        new Error(
          `whattax/spike-au-pay: salary sacrifice period (${sacrifice.period}) must match gross pay period (${gross.period})`,
        ),
      );
    }

    const taxableAmount = moneySub(gross.amount, sacrifice.amount);

    const trace = TraceNode.make({
      ruleId: TaxablePayWithSacrificeRuleId,
      title: "Taxable pay with pre-tax salary sacrifice",
      inputs: {
        grossCents: gross.amount.cents,
        sacrificeCents: sacrifice.amount.cents,
        period: gross.period,
      },
      formula: "taxable = gross - sacrifice",
      result: taxableAmount,
      sources: [],
      children: [],
    });

    return new TaxablePay({
      amount: taxableAmount,
      period: gross.period,
      trace,
    });
  }),
);
