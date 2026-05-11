import { Context, Layer } from "effect";
import { SourceRef } from "@whattax/core/trace";

/**
 * LITO phase-out bracket.
 *
 * Formula: offset = max(0, fullOffsetCents - phaseOutRate * (incomeCents - thresholdCents))
 *
 * `fullOffsetCents` is the offset at the start of this bracket.
 * `phaseOutRate` is the per-cent reduction in offset per cent of income.
 * Phase-out brackets with phaseOutRate=0 are flat (no reduction).
 */
export class LitoBracket {
  readonly _tag = "LitoBracket";
  constructor(
    readonly fields: {
      readonly thresholdCents: number;
      readonly maxCents: number | "infinity";
      readonly fullOffsetCents: number;
      readonly phaseOutRate: number;
    },
  ) {}
  get thresholdCents(): number { return this.fields.thresholdCents; }
  get maxCents(): number | "infinity" { return this.fields.maxCents; }
  get fullOffsetCents(): number { return this.fields.fullOffsetCents; }
  get phaseOutRate(): number { return this.fields.phaseOutRate; }
}

export class LitoTable {
  readonly _tag = "LitoTable";
  constructor(
    readonly fields: {
      readonly year: string;
      readonly brackets: ReadonlyArray<LitoBracket>;
      readonly source: SourceRef;
    },
  ) {}
  get year(): string { return this.fields.year; }
  get brackets(): ReadonlyArray<LitoBracket> { return this.fields.brackets; }
  get source(): SourceRef { return this.fields.source; }
}

export class AtoLitoTable extends Context.Service<
  AtoLitoTable,
  LitoTable
>()("whattax/spike-au-income-tax/parameter/AtoLitoTable") {}

const spikeSource2025_26 = SourceRef.make({
  kind: "internal-spike",
  title: "Illustrative AU LITO table for 2025-26 spike",
  reference: "spike-fixture/lito/2025-26",
});

// LITO 2025-26: max $700, phases out in two stages.
// Bracket 1: income ≤ $37,500 — full $700 offset (flat)
// Bracket 2: $37,501–$45,000 — phases out at 5c per $1 ($700 → $325)
// Bracket 3: $45,001–$66,667 — phases out at 1.5c per $1 ($325 → $0)
// Bracket 4: > $66,667 — nil
const table2025_26 = new LitoTable({
  year: "2025-26",
  brackets: [
    new LitoBracket({ thresholdCents: 0,          maxCents: 3_750_000,  fullOffsetCents: 70_000, phaseOutRate: 0 }),
    new LitoBracket({ thresholdCents: 3_750_000,  maxCents: 4_500_000,  fullOffsetCents: 70_000, phaseOutRate: 0.05 }),
    new LitoBracket({ thresholdCents: 4_500_000,  maxCents: 6_666_700,  fullOffsetCents: 32_500, phaseOutRate: 0.015 }),
    new LitoBracket({ thresholdCents: 6_666_700,  maxCents: "infinity", fullOffsetCents: 0,      phaseOutRate: 0 }),
  ],
  source: spikeSource2025_26,
});

export const AtoLito_2025_26_Live = Layer.succeed(AtoLitoTable)(table2025_26);
