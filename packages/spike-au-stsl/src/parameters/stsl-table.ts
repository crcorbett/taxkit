import { Context, Layer } from "effect";
import { SourceRef } from "@whattax/core/trace";

/**
 * Spike STSL table: single-bracket simplification of the real ATO STSL
 * formula. Real STSL is a multi-bracket percentage-of-income; the spike's
 * job is to prove a *new package can add a withholding component* using the
 * same parameter-table pattern as Schedule 1 — not to compute realistic
 * STSL.
 */
export class StslTable {
  readonly _tag = "StslTable";
  constructor(
    readonly fields: {
      readonly year: string;
      readonly weeklyThresholdCents: number;
      readonly rate: number;
      readonly source: SourceRef;
    },
  ) {}
  get year(): string {
    return this.fields.year;
  }
  get weeklyThresholdCents(): number {
    return this.fields.weeklyThresholdCents;
  }
  get rate(): number {
    return this.fields.rate;
  }
  get source(): SourceRef {
    return this.fields.source;
  }
}

export class AtoStslTable extends Context.Service<AtoStslTable, StslTable>()(
  "whattax/spike-au-stsl/parameter/AtoStslTable",
) {}

const spikeSource2025_26 = SourceRef.make({
  kind: "internal-spike",
  title: "Illustrative AU STSL single-bracket table for 2025-26 spike",
  reference: "spike-fixture/stsl/2025-26",
});

const table2025_26 = new StslTable({
  year: "2025-26",
  weeklyThresholdCents: 110_000,
  rate: 0.04,
  source: spikeSource2025_26,
});

export const AtoStsl_2025_26_Live = Layer.succeed(AtoStslTable)(table2025_26);
