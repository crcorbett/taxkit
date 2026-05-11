import { Context, Layer } from "effect";
import { SourceRef } from "@whattax/core/trace";

/**
 * Medicare Levy parameter table.
 *
 * Shade-in formula (thresholdCents < income ≤ shadeInMaxCents):
 *   levy = shadeInRate * (incomeCents - thresholdCents)
 *
 * Full rate formula (income > shadeInMaxCents):
 *   levy = levyRate * incomeCents
 *
 * The shade-in max is chosen so the two formulas produce the same value
 * at the boundary: shadeInRate*(shadeInMax-threshold) = levyRate*shadeInMax
 */
export class MedicareLevyTable {
  readonly _tag = "MedicareLevyTable";
  constructor(
    readonly fields: {
      readonly year: string;
      readonly thresholdCents: number;
      readonly shadeInMaxCents: number;
      readonly shadeInRate: number;
      readonly levyRate: number;
      readonly source: SourceRef;
    },
  ) {}
  get year(): string { return this.fields.year; }
  get thresholdCents(): number { return this.fields.thresholdCents; }
  get shadeInMaxCents(): number { return this.fields.shadeInMaxCents; }
  get shadeInRate(): number { return this.fields.shadeInRate; }
  get levyRate(): number { return this.fields.levyRate; }
  get source(): SourceRef { return this.fields.source; }
}

export class AtoMedicareLevyTable extends Context.Service<
  AtoMedicareLevyTable,
  MedicareLevyTable
>()("whattax/spike-au-income-tax/parameter/AtoMedicareLevyTable") {}

const spikeSource2025_26 = SourceRef.make({
  kind: "internal-spike",
  title: "Illustrative AU Medicare Levy table for 2025-26 spike",
  reference: "spike-fixture/medicare-levy/2025-26",
});

// Individual 2025-26: nil below $26,000, shade-in to $32,500, then 2% flat.
// Shade-in check: 10% × (3_250_000 − 2_600_000) = 65_000 = 2% × 3_250_000 ✓
const table2025_26 = new MedicareLevyTable({
  year: "2025-26",
  thresholdCents: 2_600_000,
  shadeInMaxCents: 3_250_000,
  shadeInRate: 0.10,
  levyRate: 0.02,
  source: spikeSource2025_26,
});

export const AtoMedicareLevy_2025_26_Live = Layer.succeed(AtoMedicareLevyTable)(table2025_26);
