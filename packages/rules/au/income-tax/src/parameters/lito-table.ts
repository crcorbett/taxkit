import { makeParameterDescriptor } from "@whattax/core/parameters";
import {
  Cents,
  CentsOrInfinity,
  TaxRate,
  TaxYear,
  australianTaxYearInterval,
  isoDate,
  taxRate,
  taxYear,
} from "@whattax/core/primitives";
import {
  SourceArtifact,
  SourceExtract,
  SourceRef,
  sourceChecksum,
} from "@whattax/core/trace";
import { Context, Layer, Schema } from "effect";

/**
 * Low Income Tax Offset phase-out bracket.
 *
 * @since 0.1.0
 */
export class LitoBracket extends Schema.TaggedClass<LitoBracket>()(
  "LitoBracket",
  {
    fullOffsetCents: Cents,
    maxCents: CentsOrInfinity,
    phaseOutRate: TaxRate,
    thresholdCents: Cents,
  }
) {}

/**
 * ATO Low Income Tax Offset table for one tax year.
 *
 * @since 0.1.0
 */
export class LitoTable extends Schema.TaggedClass<LitoTable>()("LitoTable", {
  brackets: Schema.Array(LitoBracket),
  source: SourceRef,
  year: TaxYear,
}) {}

/**
 * Context tag for the active ATO Low Income Tax Offset table.
 *
 * @since 0.1.0
 */
export class AtoLitoTable extends Context.Service<AtoLitoTable, LitoTable>()(
  "whattax/rules-au-income-tax/parameter/AtoLitoTable"
) {}

/**
 * Source reference for ATO Low Income Tax Offset parameters.
 *
 * @since 0.1.0
 */
export const LitoSource2025_26 = SourceRef.make({
  kind: "ato-publication",
  reference:
    "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset",
  title: "ATO low income tax offset",
});

/**
 * Canonical extraction metadata for the LITO table.
 *
 * @since 0.1.0
 */
export const LitoArtifact2025_26 = new SourceArtifact({
  checksum: sourceChecksum(
    "sha256:c31c69c4417f08f7bc9dced2c3a95d80e19885b7ee5e16b8931fe6ea0c761d9f"
  ),
  documentVersion: "2025-26",
  extract: new SourceExtract({
    rowCount: 4,
    shape: "LitoBracket[]",
  }),
  retrievedOn: isoDate("2026-05-12"),
  source: LitoSource2025_26,
});

/**
 * Parameter descriptor for the ATO Low Income Tax Offset table.
 *
 * @since 0.1.0
 */
export const AtoLitoTableDescriptor = makeParameterDescriptor({
  effectivePeriod: australianTaxYearInterval("2025-26"),
  id: "whattax/rules-au-income-tax/parameter/AtoLitoTable",
  schema: LitoTable,
  source: LitoSource2025_26,
  sourceArtifact: LitoArtifact2025_26,
  tag: AtoLitoTable,
  title: "ATO low income tax offset parameters",
});

// LITO 2025-26: max $700, phases out in two stages.
// Bracket 1: income ≤ $37,500 — full $700 offset (flat)
// Bracket 2: $37,501–$45,000 — phases out at 5c per $1 ($700 → $325)
// Bracket 3: $45,001–$66,667 — phases out at 1.5c per $1 ($325 → $0)
// Bracket 4: > $66,667 — nil
const table2025_26 = new LitoTable({
  brackets: [
    new LitoBracket({
      fullOffsetCents: Cents.make(70_000),
      maxCents: Cents.make(3_750_000),
      phaseOutRate: taxRate("0"),
      thresholdCents: Cents.make(0),
    }),
    new LitoBracket({
      fullOffsetCents: Cents.make(70_000),
      maxCents: Cents.make(4_500_000),
      phaseOutRate: taxRate("0.05"),
      thresholdCents: Cents.make(3_750_000),
    }),
    new LitoBracket({
      fullOffsetCents: Cents.make(32_500),
      maxCents: Cents.make(6_666_700),
      phaseOutRate: taxRate("0.015"),
      thresholdCents: Cents.make(4_500_000),
    }),
    new LitoBracket({
      fullOffsetCents: Cents.make(0),
      maxCents: "infinity",
      phaseOutRate: taxRate("0"),
      thresholdCents: Cents.make(6_666_700),
    }),
  ],
  source: LitoSource2025_26,
  year: taxYear("2025-26"),
});

/**
 * Live ATO Low Income Tax Offset parameter layer for 2025-26.
 *
 * @since 0.1.0
 */
export const AtoLito_2025_26_Live = Layer.succeed(AtoLitoTable)(table2025_26);
