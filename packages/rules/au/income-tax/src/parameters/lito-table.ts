import { Context, Layer, Schema } from "effect";
import { Cents, CentsOrInfinity, TaxRate, TaxYear, taxRate, taxYear } from "@whattax/core/primitives";
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
export class LitoBracket extends Schema.TaggedClass<LitoBracket>()("LitoBracket", {
  thresholdCents: Cents,
  maxCents: CentsOrInfinity,
  fullOffsetCents: Cents,
  phaseOutRate: TaxRate,
}) {}

export class LitoTable extends Schema.TaggedClass<LitoTable>()("LitoTable", {
  year: TaxYear,
  brackets: Schema.Array(LitoBracket),
  source: SourceRef,
}) {}

export class AtoLitoTable extends Context.Service<
  AtoLitoTable,
  LitoTable
>()("whattax/rules-au-income-tax/parameter/AtoLitoTable") {}

const validationSource2025_26 = SourceRef.make({
  kind: "ato-publication",
  title: "ATO low income tax offset",
  reference:
    "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset",
});

// LITO 2025-26: max $700, phases out in two stages.
// Bracket 1: income ≤ $37,500 — full $700 offset (flat)
// Bracket 2: $37,501–$45,000 — phases out at 5c per $1 ($700 → $325)
// Bracket 3: $45,001–$66,667 — phases out at 1.5c per $1 ($325 → $0)
// Bracket 4: > $66,667 — nil
const table2025_26 = new LitoTable({
  year: taxYear("2025-26"),
  brackets: [
    new LitoBracket({ thresholdCents: Cents.make(0),          maxCents: Cents.make(3_750_000),  fullOffsetCents: Cents.make(70_000), phaseOutRate: taxRate(0) }),
    new LitoBracket({ thresholdCents: Cents.make(3_750_000),  maxCents: Cents.make(4_500_000),  fullOffsetCents: Cents.make(70_000), phaseOutRate: taxRate(0.05) }),
    new LitoBracket({ thresholdCents: Cents.make(4_500_000),  maxCents: Cents.make(6_666_700),  fullOffsetCents: Cents.make(32_500), phaseOutRate: taxRate(0.015) }),
    new LitoBracket({ thresholdCents: Cents.make(6_666_700),  maxCents: "infinity", fullOffsetCents: Cents.make(0),      phaseOutRate: taxRate(0) }),
  ],
  source: validationSource2025_26,
});

export const AtoLito_2025_26_Live = Layer.succeed(AtoLitoTable)(table2025_26);
