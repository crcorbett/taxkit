import { Effect, Match, Schema } from "effect";

import type { InvalidMoneyValue } from "../primitives/errors.js";
import { aud, Cents, Money, moneyAdd, moneySub } from "../primitives/money.js";
import { TraceNode } from "../trace/node.js";

/**
 * Stable identifier for a ledger component.
 *
 * @since 0.1.0
 */
export const ComponentId = Schema.String.pipe(
  Schema.brand("taxkit/ComponentId")
);

/**
 * Stable identifier for a ledger component.
 *
 * @since 0.1.0
 */
export type ComponentId = typeof ComponentId.Type;

/**
 * How a component combines into its ledger total.
 *
 * - `additive`: amount is added to the total
 * - `subtractive`: amount is subtracted from the total
 * - `informational`: amount is ignored when computing the total but stays in
 *   the trace
 *
 * Domain context lives in the aggregator (a pay-withholdings aggregator
 * treats `additive` as "more withheld → less take-home"; an annual-tax
 * aggregator treats `additive` as "more tax owed"). The ledger value type
 * stays domain-neutral.
 *
 * @since 0.1.0
 */
export const ComponentEffect = Schema.Literals([
  "additive",
  "subtractive",
  "informational",
]);

/**
 * How a component combines into its ledger total.
 *
 * @since 0.1.0
 */
export type ComponentEffect = typeof ComponentEffect.Type;

/**
 * Whether a ledger component contributes to the computed total.
 *
 * @since 0.1.0
 */
export const ComponentStatus = Schema.Literals([
  "active",
  "disabled",
  "zeroed",
]);

/**
 * Whether a ledger component contributes to the computed total.
 *
 * @since 0.1.0
 */
export type ComponentStatus = typeof ComponentStatus.Type;

/**
 * Canonical schema for a labelled amount, its trace and total semantics.
 *
 * @since 0.1.0
 */
export const LedgerComponent = Schema.TaggedStruct("LedgerComponent", {
  amount: Money,
  effect: ComponentEffect,
  id: ComponentId,
  label: Schema.String,
  status: ComponentStatus,
  trace: TraceNode,
});

/**
 * A labelled calculation amount with trace evidence and total semantics.
 *
 * @since 0.1.0
 */
export type LedgerComponent = typeof LedgerComponent.Type;

/**
 * Encoded representation of a ledger component for persistence or transport.
 *
 * @since 0.1.0
 */
export type LedgerComponentEncoded = typeof LedgerComponent.Encoded;

/**
 * Returns whether a component should be applied to the ledger total.
 *
 * Disabled and zeroed components stay in the trace for auditability but do
 * not affect the result.
 *
 * @since 0.1.0
 */
export const isComponentContributing = (c: LedgerComponent): boolean =>
  c.status === "active";

/**
 * Sums ledger components into a single money value.
 *
 * Additive contributing components add their amount, subtractive contributing
 * components subtract theirs, and informational or non-active components are
 * ignored.
 *
 * @since 0.1.0
 */
export const sumLedgerComponents = (
  components: readonly LedgerComponent[]
): Effect.Effect<Money, InvalidMoneyValue> =>
  Effect.reduce(
    components,
    () => aud(Cents.make(0)),
    (acc, component) => {
      if (!isComponentContributing(component)) {
        return Effect.succeed(acc);
      }

      return Match.value(component.effect).pipe(
        Match.when("additive", () => moneyAdd(acc, component.amount)),
        Match.when("subtractive", () => moneySub(acc, component.amount)),
        Match.when("informational", () => Effect.succeed(acc)),
        Match.exhaustive
      );
    }
  );
