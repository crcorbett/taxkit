import { Context, Schema } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import { LedgerComponent } from "@whattax/core/ledger";
import { Money } from "@whattax/core/primitives";
import { TraceNode } from "@whattax/core/trace";

/**
 * Aggregated annual tax ledger.
 *
 * `rawLiability` is the direct sum of all components (may be negative when
 * offsets exceed tax). `rawLiability` is the ledger's responsibility.
 * Flooring to zero is the *calculator's* responsibility — kept out of the
 * ledger so callers can inspect the raw arithmetic.
 */
export class AnnualTaxLedger
  extends Schema.TaggedClass<AnnualTaxLedger>()("AnnualTaxLedger", {
    components: Schema.Array(LedgerComponent),
    rawLiability: Money,
    trace: TraceNode,
  }) {}

export class AnnualTaxLedgerFact extends Context.Service<
  AnnualTaxLedgerFact,
  AnnualTaxLedger
>()("whattax/rules-au-income-tax/fact/AnnualTaxLedger") {}

export const AnnualTaxLedgerDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-income-tax/fact/AnnualTaxLedger",
  title: "Aggregated annual tax ledger",
  authority: "derived",
  schema: AnnualTaxLedger,
  tag: AnnualTaxLedgerFact,
});
