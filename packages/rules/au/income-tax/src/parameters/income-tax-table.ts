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
 * Marginal-rate bracket for resident individual income tax.
 *
 * `baseTaxCents` is the cumulative tax already owed at `thresholdCents`; the
 * bracket formula adds `rate * (income - thresholdCents)`.
 *
 * @since 0.1.0
 */
export class IncomeTaxBracket extends Schema.TaggedClass<IncomeTaxBracket>()(
  "IncomeTaxBracket",
  {
    baseTaxCents: Cents,
    maxCents: CentsOrInfinity,
    rate: TaxRate,
    thresholdCents: Cents,
  }
) {}

/**
 * ATO resident individual income tax table for one tax year.
 *
 * @since 0.1.0
 */
export class IncomeTaxTable extends Schema.TaggedClass<IncomeTaxTable>()(
  "IncomeTaxTable",
  {
    brackets: Schema.Array(IncomeTaxBracket),
    source: SourceRef,
    year: TaxYear,
  }
) {}

/**
 * Context tag for the active ATO resident income tax table.
 *
 * @since 0.1.0
 */
export class AtoIncomeTaxTable extends Context.Service<
  AtoIncomeTaxTable,
  IncomeTaxTable
>()("whattax/rules-au-income-tax/parameter/AtoIncomeTaxTable") {}

/**
 * Source reference for ATO resident income tax rates for 2025-26.
 *
 * @since 0.1.0
 */
export const IncomeTaxSource2025_26 = SourceRef.make({
  kind: "ato-publication",
  reference:
    "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
  title: "ATO tax rates - Australian resident 2025-26",
});

/**
 * Canonical extraction metadata for resident income-tax brackets.
 *
 * @since 0.1.0
 */
export const IncomeTaxArtifact2025_26 = new SourceArtifact({
  checksum: sourceChecksum(
    "sha256:7cc3b3d6e7823ff7a9b8f145c2809db0e5f8c8cf19d01c56dbd511f52ff33e63"
  ),
  documentVersion: "2025-26",
  extract: new SourceExtract({
    rowCount: 5,
    shape: "IncomeTaxBracket[]",
  }),
  retrievedOn: isoDate("2026-05-12"),
  source: IncomeTaxSource2025_26,
});

/**
 * Parameter descriptor for the ATO resident income tax table.
 *
 * @since 0.1.0
 */
export const AtoIncomeTaxTableDescriptor = makeParameterDescriptor({
  effectivePeriod: australianTaxYearInterval("2025-26"),
  id: "whattax/rules-au-income-tax/parameter/AtoIncomeTaxTable",
  schema: IncomeTaxTable,
  source: IncomeTaxSource2025_26,
  sourceArtifact: IncomeTaxArtifact2025_26,
  tag: AtoIncomeTaxTable,
  title: "ATO resident income tax rates",
});

// Resident individual tax rates 2025-26.
// Each bracket covers: thresholdCents < income ≤ maxCents.
// The nil-rate band (0 – $18,200) has threshold=0 and rate=0.
const table2025_26 = new IncomeTaxTable({
  brackets: [
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(0),
      maxCents: Cents.make(1_820_000),
      rate: taxRate("0"),
      thresholdCents: Cents.make(0),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(0),
      maxCents: Cents.make(4_500_000),
      rate: taxRate("0.16"),
      thresholdCents: Cents.make(1_820_000),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(428_800),
      maxCents: Cents.make(13_500_000),
      rate: taxRate("0.3"),
      thresholdCents: Cents.make(4_500_000),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(3_128_800),
      maxCents: Cents.make(19_000_000),
      rate: taxRate("0.37"),
      thresholdCents: Cents.make(13_500_000),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(5_163_800),
      maxCents: "infinity",
      rate: taxRate("0.45"),
      thresholdCents: Cents.make(19_000_000),
    }),
  ],
  source: IncomeTaxSource2025_26,
  year: taxYear("2025-26"),
});

/**
 * Live ATO resident income tax parameter layer for 2025-26.
 *
 * @since 0.1.0
 */
export const AtoIncomeTax_2025_26_Live =
  Layer.succeed(AtoIncomeTaxTable)(table2025_26);
