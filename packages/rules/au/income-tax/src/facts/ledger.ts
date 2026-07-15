import { makeFactDescriptor } from "@taxkit/core";
import { LedgerComponent } from "@taxkit/core/ledger";
import { Money } from "@taxkit/core/primitives";
import { TraceNode } from "@taxkit/core/trace";
import { Context, Schema } from "effect";

/**
 * Aggregated annual tax ledger before calculator-level liability flooring.
 *
 * `rawLiability` is the direct sum of income tax, subtractive offsets, and
 * Medicare Levy. It can be negative when offsets exceed positive components.
 *
 * @since 0.1.0
 */
export class AnnualTaxLedger extends Schema.TaggedClass<AnnualTaxLedger>()(
  "AnnualTaxLedger",
  {
    components: Schema.Array(LedgerComponent),
    rawLiability: Money,
    trace: TraceNode,
  }
) {}

/**
 * Context tag for the derived annual tax ledger.
 *
 * @since 0.1.0
 */
export class AnnualTaxLedgerFact extends Context.Service<
  AnnualTaxLedgerFact,
  AnnualTaxLedger
>()("taxkit/rules-au-income-tax/fact/AnnualTaxLedger") {}

/**
 * Fact descriptor for the aggregated annual tax ledger.
 *
 * @since 0.1.0
 */
export const AnnualTaxLedgerDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "taxkit/rules-au-income-tax/fact/AnnualTaxLedger",
  schema: AnnualTaxLedger,
  tag: AnnualTaxLedgerFact,
  title: "Aggregated annual tax ledger",
});
