import { Context, Layer, Schema } from "effect";
import { Cents, TaxRate, TaxYear, taxRate, taxYear } from "@whattax/core/primitives";
import { SourceRef } from "@whattax/core/trace";

/**
 * Current STSL table: single-bracket simplification of the real ATO STSL
 * formula. Real STSL is a multi-bracket percentage-of-income; the validation model's
 * job is to prove a *new package can add a withholding component* using the
 * same parameter-table pattern as Schedule 1 — not to compute realistic
 * STSL.
 */
export class StslTable extends Schema.TaggedClass<StslTable>()("StslTable", {
  year: TaxYear,
  weeklyThresholdCents: Cents,
  rate: TaxRate,
  source: SourceRef,
}) {}

export class AtoStslTable extends Context.Service<AtoStslTable, StslTable>()(
  "whattax/rules-au-stsl/parameter/AtoStslTable",
) {}

const validationSource2025_26 = SourceRef.make({
  kind: "internal-validation",
  title: "Illustrative AU STSL single-bracket table for 2025-26 validation",
  reference: "validation-fixture/stsl/2025-26",
});

const table2025_26 = new StslTable({
  year: taxYear("2025-26"),
  weeklyThresholdCents: Cents.make(110_000),
  rate: taxRate(0.04),
  source: validationSource2025_26,
});

export const AtoStsl_2025_26_Live = Layer.succeed(AtoStslTable)(table2025_26);
