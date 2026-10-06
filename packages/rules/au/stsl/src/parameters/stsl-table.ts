import { makeParameterDescriptor } from "@taxkit/core/parameters";
import {
  IsoDate,
  Cents,
  CentsOrInfinity,
  DecimalCoefficient,
  TaxYear,
  DateInterval,
  taxYear,
} from "@taxkit/core/primitives";
import {
  SourceArtifact,
  SourceExtract,
  SourceRef,
  sourceChecksum,
} from "@taxkit/core/trace";
import { Array, Option, BigDecimal, Context, Layer, Schema } from "effect";

/**
 * ATO Schedule 8 STSL coefficient row.
 *
 * Formula: component = a * x - b
 * where x is whole weekly dollars plus 99 cents.
 *
 * @since 0.1.0
 */
export class StslRow extends Schema.TaggedClass<StslRow>()(
  "StslRow",
  Schema.Struct({
    a: DecimalCoefficient,
    bDollars: DecimalCoefficient,
    weeklyMaxCents: CentsOrInfinity,
    weeklyMinCents: Cents,
  }).check(
    Schema.makeFilter(
      ({ a, weeklyMaxCents, weeklyMinCents }) =>
        weeklyMinCents >= 0 &&
        (weeklyMaxCents === "infinity" || weeklyMaxCents >= weeklyMinCents) &&
        BigDecimal.between({
          maximum: BigDecimal.make(1n, 0),
          minimum: BigDecimal.make(0n, 0),
        })(a),
      {
        expected:
          "an ordered non-negative inclusive weekly range with a multiplier from zero to one",
      }
    )
  )
) {}

// Keep the same relationship check on the saved representation and decoded rows.
// Array class transformations otherwise remove this check under Schema.toEncoded.
const StslTableCoverageCheck = Schema.makeFilter<
  readonly (typeof StslRow.Encoded)[]
>(
  (rows) =>
    Array.head(rows).pipe(Option.exists((row) => row.weeklyMinCents === 0)) &&
    Array.last(rows).pipe(
      Option.exists((row) => row.weeklyMaxCents === "infinity")
    ) &&
    Array.every(
      rows,
      (row, index) =>
        index === 0 ||
        Array.get(rows, index - 1).pipe(
          Option.exists(
            (previous) =>
              previous.weeklyMaxCents !== "infinity" &&
              previous.weeklyMaxCents === row.weeklyMinCents - 1
          )
        )
    ),
  {
    expected:
      "complete STSL weekly rows from zero without gaps or overlaps, with only the final bound open",
  }
);

const StslTableRows = Schema.Array(Schema.toEncoded(StslRow))
  .check(StslTableCoverageCheck)
  .pipe(Schema.decodeTo(Schema.Array(StslRow)))
  .check(StslTableCoverageCheck);

/**
 * ATO Schedule 8 STSL withholding coefficient table for one tax year.
 *
 * @since 0.1.0
 */
export class StslTable extends Schema.TaggedClass<StslTable>()("StslTable", {
  rows: StslTableRows,
  source: SourceRef,
  year: TaxYear,
}) {}

/**
 * Context tag for the active ATO Schedule 8 STSL table.
 *
 * @since 0.1.0
 */
export class AtoStslTable extends Context.Service<AtoStslTable, StslTable>()(
  "taxkit/rules-au-stsl/parameter/AtoStslTable"
) {}

/**
 * Source reference for ATO Schedule 8 STSL withholding formulas for 2025-26.
 *
 * @since 0.1.0
 */
export const StslSource2025_26 = SourceRef.make({
  kind: "ato-publication",
  reference:
    "https://www.ato.gov.au/tax-rates-and-codes/schedule-8-statement-of-formulas-for-calculating-study-and-training-support-loans-components",
  title:
    "ATO Schedule 8 - Statement of formulas for calculating study and training support loans components",
});

/**
 * Canonical extraction metadata for the Schedule 8 STSL table.
 *
 * @since 0.1.0
 */
export const StslArtifact2025_26 = new SourceArtifact({
  checksum: sourceChecksum(
    "sha256:59f5c35e2b9c4a05a5c50bdf3d3993e167a57fa11a0d9fd95f0fb7cc9e884f82"
  ),
  documentVersion: "2025-09-24 to 2026-06-30",
  extract: new SourceExtract({
    rowContract: "StslRow[]",
    rowCount: 4,
  }),
  retrievedOn: IsoDate.make("2026-05-12"),
  source: StslSource2025_26,
});

/**
 * Parameter descriptor for the ATO Schedule 8 STSL coefficient table.
 *
 * @since 0.1.0
 */
export const AtoStslTableDescriptor = makeParameterDescriptor({
  effectivePeriod: DateInterval.make({
    from: IsoDate.make("2025-09-24"),
    toExclusive: Option.some(Option.some(IsoDate.make("2026-07-01"))),
  }),
  id: "taxkit/rules-au-stsl/parameter/AtoStslTable",
  schema: StslTable,
  source: StslSource2025_26,
  sourceArtifact: StslArtifact2025_26,
  tag: AtoStslTable,
  title: "ATO Schedule 8 STSL withholding coefficients",
});

const table2025_26 = new StslTable({
  rows: [
    new StslRow({
      a: DecimalCoefficient.make(BigDecimal.make(0n, 0)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(0n, 0)),
      weeklyMaxCents: Cents.make(128_799),
      weeklyMinCents: Cents.make(0),
    }),
    new StslRow({
      a: DecimalCoefficient.make(BigDecimal.make(15n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(1_932_692n, 4)),
      weeklyMaxCents: Cents.make(240_299),
      weeklyMinCents: Cents.make(128_800),
    }),
    new StslRow({
      a: DecimalCoefficient.make(BigDecimal.make(17n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(2_413_462n, 4)),
      weeklyMaxCents: Cents.make(344_699),
      weeklyMinCents: Cents.make(240_300),
    }),
    new StslRow({
      a: DecimalCoefficient.make(BigDecimal.make(1n, 1)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(0n, 0)),
      weeklyMaxCents: "infinity",
      weeklyMinCents: Cents.make(344_700),
    }),
  ],
  source: StslSource2025_26,
  year: taxYear("2025-26"),
});

/**
 * Live ATO Schedule 8 STSL parameter layer for 2025-26.
 *
 * @since 0.1.0
 */
export const AtoStsl_2025_26_Live = Layer.succeed(AtoStslTable)(table2025_26);
