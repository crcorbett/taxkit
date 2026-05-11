import { Context } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import type { LedgerComponent } from "@whattax/core/ledger";
import type { Money } from "@whattax/core/primitives";
import type { TraceNode } from "@whattax/core/trace";

/**
 * Aggregated annual tax ledger.
 *
 * `rawLiability` is the direct sum of all components (may be negative when
 * offsets exceed tax). `rawLiability` is the ledger's responsibility.
 * Flooring to zero is the *calculator's* responsibility — kept out of the
 * ledger so callers can inspect the raw arithmetic.
 */
export class AnnualTaxLedger {
  readonly _tag = "AnnualTaxLedger";
  constructor(
    readonly fields: {
      readonly components: ReadonlyArray<LedgerComponent>;
      readonly rawLiability: Money;
      readonly trace: TraceNode;
    },
  ) {}
  get components(): ReadonlyArray<LedgerComponent> {
    return this.fields.components;
  }
  get rawLiability(): Money {
    return this.fields.rawLiability;
  }
  get trace(): TraceNode {
    return this.fields.trace;
  }
}

export class AnnualTaxLedgerFact extends Context.Service<
  AnnualTaxLedgerFact,
  AnnualTaxLedger
>()("whattax/spike-au-income-tax/fact/AnnualTaxLedger") {}

export const AnnualTaxLedgerDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-income-tax/fact/AnnualTaxLedger",
  title: "Aggregated annual tax ledger",
  authority: "derived",
  tag: AnnualTaxLedgerFact,
});
