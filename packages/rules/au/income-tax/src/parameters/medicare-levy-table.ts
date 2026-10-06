import { makeParameterDescriptor } from "@taxkit/core/parameters";
import {
  DateInterval,
  IsoDate,
  Cents,
  TaxRate,
  TaxYear,
  taxYear,
} from "@taxkit/core/primitives";
import {
  SourceArtifact,
  SourceExtract,
  SourceRef,
  sourceChecksum,
} from "@taxkit/core/trace";
import { Option, BigDecimal, Context, Layer, Schema } from "effect";

/**
 * Medicare Levy low-income threshold and rate table.
 *
 * The table contains the nil threshold, shade-in ceiling, shade-in rate, and
 * full levy rate for one tax year.
 *
 * @since 0.1.0
 */
export class MedicareLevyTable extends Schema.TaggedClass<MedicareLevyTable>()(
  "MedicareLevyTable",
  Schema.Struct({
    levyRate: TaxRate,
    shadeInMaxCents: Cents,
    shadeInRate: TaxRate,
    source: SourceRef,
    thresholdCents: Cents,
    year: TaxYear,
  }).check(
    Schema.makeFilter(
      ({ levyRate, shadeInMaxCents, shadeInRate, thresholdCents }) =>
        thresholdCents >= 0 &&
        shadeInMaxCents > thresholdCents &&
        BigDecimal.Order(levyRate, BigDecimal.make(0n, 0)) > 0 &&
        BigDecimal.Order(shadeInRate, levyRate) >= 0 &&
        BigDecimal.Order(shadeInRate, BigDecimal.make(1n, 0)) <= 0,
      {
        expected:
          "ordered non-negative Medicare thresholds with a positive levy rate no greater than the shade-in rate, both at most one",
      }
    )
  )
) {}

/**
 * Context tag for the active ATO Medicare Levy table.
 *
 * @since 0.1.0
 */
export class AtoMedicareLevyTable extends Context.Service<
  AtoMedicareLevyTable,
  MedicareLevyTable
>()("taxkit/rules-au-income-tax/parameter/AtoMedicareLevyTable") {}

/**
 * Source reference for ATO Medicare Levy low-income reduction thresholds.
 *
 * @since 0.1.0
 */
export const MedicareLevySource2025_26 = SourceRef.make({
  kind: "ato-publication",
  reference:
    "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners",
  title: "ATO Medicare levy reduction thresholds for low-income earners",
});

/**
 * Canonical extraction metadata for the Medicare Levy threshold table.
 *
 * @since 0.1.0
 */
export const MedicareLevyArtifact2025_26 = new SourceArtifact({
  checksum: sourceChecksum(
    "sha256:d3b8ab27d44a3b0dc9d84b81c09a5f1af0cfa197f9f96deab47d19362195c987"
  ),
  documentVersion: "2025-26",
  extract: new SourceExtract({
    rowContract: "MedicareLevyTable",
    rowCount: 1,
  }),
  retrievedOn: IsoDate.make("2026-05-12"),
  source: MedicareLevySource2025_26,
});

/**
 * Parameter descriptor for the ATO Medicare Levy table.
 *
 * @since 0.1.0
 */
export const AtoMedicareLevyTableDescriptor = makeParameterDescriptor({
  effectivePeriod: DateInterval.make({
    from: IsoDate.make("2025-07-01"),
    toExclusive: Option.some(Option.some(IsoDate.make("2026-07-01"))),
  }),
  id: "taxkit/rules-au-income-tax/parameter/AtoMedicareLevyTable",
  schema: MedicareLevyTable,
  source: MedicareLevySource2025_26,
  sourceArtifact: MedicareLevyArtifact2025_26,
  tag: AtoMedicareLevyTable,
  title: "ATO Medicare levy threshold and rate parameters",
});

// Single non-SAPTO 2025-26: nil at/below $27,222, shade-in to $34,027, then 2% flat.
const table2025_26 = new MedicareLevyTable({
  levyRate: TaxRate.make(BigDecimal.make(2n, 2)),
  shadeInMaxCents: Cents.make(3_402_700),
  shadeInRate: TaxRate.make(BigDecimal.make(1n, 1)),
  source: MedicareLevySource2025_26,
  thresholdCents: Cents.make(2_722_200),
  year: taxYear("2025-26"),
});

/**
 * Live ATO Medicare Levy parameter layer for 2025-26.
 *
 * @since 0.1.0
 */
export const AtoMedicareLevy_2025_26_Live =
  Layer.succeed(AtoMedicareLevyTable)(table2025_26);
