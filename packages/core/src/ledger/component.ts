import { Schema } from "effect";
import { aud, Money, moneyAdd, moneySub } from "../primitives/money.js";
import { TraceNode } from "../trace/node.js";

export const ComponentId = Schema.String.pipe(
  Schema.brand("whattax/ComponentId"),
);
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
 */
export const ComponentEffect = Schema.Literals([
  "additive",
  "subtractive",
  "informational",
]);
export type ComponentEffect = typeof ComponentEffect.Type;

export const ComponentStatus = Schema.Literals([
  "active",
  "disabled",
  "zeroed",
]);
export type ComponentStatus = typeof ComponentStatus.Type;

export interface LedgerComponent {
  readonly _tag: "LedgerComponent";
  readonly id: ComponentId;
  readonly label: string;
  readonly amount: Money;
  readonly effect: ComponentEffect;
  readonly status: ComponentStatus;
  readonly trace: TraceNode;
}

export interface LedgerComponentEncoded {
  readonly _tag: "LedgerComponent";
  readonly id: string;
  readonly label: string;
  readonly amount: typeof Money.Encoded;
  readonly effect: typeof ComponentEffect.Encoded;
  readonly status: typeof ComponentStatus.Encoded;
  readonly trace: typeof TraceNode.Encoded;
}

export const LedgerComponent: Schema.Codec<
  LedgerComponent,
  LedgerComponentEncoded
> = Schema.TaggedStruct("LedgerComponent", {
  id: ComponentId,
  label: Schema.String,
  amount: Money,
  effect: ComponentEffect,
  status: ComponentStatus,
  trace: TraceNode,
});

/**
 * A component is `contributing` if its amount should be applied to the
 * ledger total. Disabled and zeroed components stay in the trace for
 * auditability but do not affect the result.
 */
export const isComponentContributing = (c: LedgerComponent): boolean =>
  c.status === "active";

/**
 * Sums an arbitrary list of LedgerComponents into a single Money value:
 * additive contributing components add their amount, subtractive contributing
 * components subtract theirs, informational and non-active components are
 * ignored. Currency-safety is delegated to `moneyAdd`/`moneySub`.
 */
export const sumLedgerComponents = (
  components: ReadonlyArray<LedgerComponent>,
): Money =>
  components.reduce<Money>((acc, c) => {
    if (!isComponentContributing(c)) return acc;
    switch (c.effect) {
      case "additive":
        return moneyAdd(acc, c.amount);
      case "subtractive":
        return moneySub(acc, c.amount);
      case "informational":
        return acc;
    }
  }, aud(0));
