import { Context } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import type { LedgerComponent } from "@whattax/core/ledger";

/**
 * Whether the employee has an STSL (Study and Training Support Loan) debt
 * and is opting into withholding for it.
 *
 * `enabled: false` is *not* the same as omitting the fact: if a pack composes
 * the STSL-aware aggregator, it requires this fact at the type level. The
 * `enabled` flag drives whether the resulting component is `disabled` (shown
 * in the trace, contributes $0) or `active`/`zeroed` (computed normally).
 */
export class StslDebt {
  readonly _tag = "StslDebt";
  constructor(readonly fields: { readonly enabled: boolean }) {}
  get enabled(): boolean {
    return this.fields.enabled;
  }
}

export class StslDebtFact extends Context.Service<StslDebtFact, StslDebt>()(
  "whattax/spike-au-stsl/fact/StslDebt",
) {}

export const StslDebtDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-stsl/fact/StslDebt",
  title: "Whether the employee has STSL debt and is opting into withholding",
  authority: "input",
  tag: StslDebtFact,
});

/**
 * STSL ledger component, produced by the StslComponentRule.
 *
 * Modeled as its own fact so the base pack's PAYG-only aggregator never
 * depends on it. The STSL-aware aggregator depends on both
 * `PaygWithholdingComponentFact` and this.
 */
export class StslComponentFact extends Context.Service<
  StslComponentFact,
  LedgerComponent
>()("whattax/spike-au-stsl/fact/StslComponent") {}

export const StslComponentDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-stsl/fact/StslComponent",
  title: "STSL withholding ledger component for a single pay period",
  authority: "derived",
  tag: StslComponentFact,
});
