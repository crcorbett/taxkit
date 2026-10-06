import { makeParameterDescriptor } from "@taxkit/core/parameters";
import {
  DateInterval,
  IsoDate,
  Cents,
  CentsOrInfinity,
  DecimalCoefficient,
  TaxYear,
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
 * ATO Schedule 1 scale used for residents with or without the tax-free
 * threshold.
 *
 * @since 0.1.0
 */
export const Schedule1Scale = Schema.Literals(["scale1", "scale2"]);

/**
 * ATO Schedule 1 scale literal type.
 *
 * @since 0.1.0
 */
export type Schedule1Scale = typeof Schedule1Scale.Type;

/**
 * ATO Schedule 1 coefficient row for resident Scale 1 or Scale 2.
 *
 * The ATO weekly formula is `withholding = a * weekly - b` applied to the
 * weekly-equivalent earnings, then rounded to the nearest dollar and converted
 * back to the period.
 *
 * @since 0.1.0
 */
export class Schedule1Row extends Schema.TaggedClass<Schedule1Row>()(
  "Schedule1Row",
  Schema.Struct({
    a: DecimalCoefficient,
    bDollars: DecimalCoefficient,
    scale: Schedule1Scale,
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

const hasCompleteWeeklyScale = (
  rows: readonly (typeof Schedule1Row.Encoded)[]
): boolean =>
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
  );

// Keep the same relationship check on the saved representation and decoded rows.
// Array class transformations otherwise remove this check under Schema.toEncoded.
const Schedule1TableCoverageCheck = Schema.makeFilter<
  readonly (typeof Schedule1Row.Encoded)[]
>(
  (rows) =>
    Array.every(["scale1", "scale2"] as const, (scale) =>
      hasCompleteWeeklyScale(Array.filter(rows, (row) => row.scale === scale))
    ),
  {
    expected:
      "complete Schedule 1 weekly scales from zero without gaps or overlaps, with only the final bound open",
  }
);

const Schedule1TableRows = Schema.Array(Schema.toEncoded(Schedule1Row))
  .check(Schedule1TableCoverageCheck)
  .pipe(Schema.decodeTo(Schema.Array(Schedule1Row)))
  .check(Schedule1TableCoverageCheck);

/**
 * ATO Schedule 1 withholding coefficient table for one tax year.
 *
 * @since 0.1.0
 */
export class Schedule1Table extends Schema.TaggedClass<Schedule1Table>()(
  "Schedule1Table",
  {
    rows: Schedule1TableRows,
    source: SourceRef,
    year: TaxYear,
  }
) {}

/**
 * Context tag for the active ATO Schedule 1 withholding table.
 *
 * @since 0.1.0
 */
export class AtoSchedule1Table extends Context.Service<
  AtoSchedule1Table,
  Schedule1Table
>()("taxkit/rules-au-pay/parameter/AtoSchedule1Table") {}

/**
 * Source reference for ATO Schedule 1 PAYG withholding formulas for 2025-26.
 *
 * @since 0.1.0
 */
export const Schedule1Source2025_26 = SourceRef.make({
  kind: "ato-publication",
  reference:
    "https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld",
  title:
    "ATO Schedule 1 - Statement of formulas for calculating amounts to be withheld",
});

const Schedule1Source2024_25 = Schedule1Source2025_26;

/**
 * Canonical extraction metadata for the Schedule 1 table used by this package.
 *
 * @since 0.1.0
 */
export const Schedule1Artifact2025_26 = new SourceArtifact({
  checksum: sourceChecksum(
    "sha256:4e65d8a6b04f94b2f7fb7d2f4b219c4ad05fb8a4a9938d7b8fc36c012594c9f5"
  ),
  documentVersion: "2025-26",
  extract: new SourceExtract({
    rowContract: "Schedule1Row[]",
    rowCount: 15,
  }),
  retrievedOn: IsoDate.make("2026-05-12"),
  source: Schedule1Source2025_26,
});

/**
 * Parameter descriptor for the ATO Schedule 1 withholding coefficient table.
 *
 * @since 0.1.0
 */
export const AtoSchedule1TableDescriptor = makeParameterDescriptor({
  effectivePeriod: DateInterval.make({
    from: IsoDate.make("2025-07-01"),
    toExclusive: Option.some(Option.some(IsoDate.make("2026-07-01"))),
  }),
  id: "taxkit/rules-au-pay/parameter/AtoSchedule1Table",
  schema: Schedule1Table,
  source: Schedule1Source2025_26,
  sourceArtifact: Schedule1Artifact2025_26,
  tag: AtoSchedule1Table,
  title: "ATO Schedule 1 withholding coefficients",
});

const table2025_26 = new Schedule1Table({
  rows: [
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(16n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(16n, 2)),
      scale: "scale1",
      weeklyMaxCents: Cents.make(14_999),
      weeklyMinCents: Cents.make(0),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(2117n, 4)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(7755n, 3)),
      scale: "scale1",
      weeklyMaxCents: Cents.make(37_099),
      weeklyMinCents: Cents.make(15_000),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(189n, 3)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(-6702n, 4)),
      scale: "scale1",
      weeklyMaxCents: Cents.make(51_499),
      weeklyMinCents: Cents.make(37_100),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(3227n, 4)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(682_367n, 4)),
      scale: "scale1",
      weeklyMaxCents: Cents.make(93_199),
      weeklyMinCents: Cents.make(51_500),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(32n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(657_202n, 4)),
      scale: "scale1",
      weeklyMaxCents: Cents.make(224_599),
      weeklyMinCents: Cents.make(93_200),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(39n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(222_951n, 3)),
      scale: "scale1",
      weeklyMaxCents: Cents.make(330_299),
      weeklyMinCents: Cents.make(224_600),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(47n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(4_872_587n, 4)),
      scale: "scale1",
      weeklyMaxCents: "infinity",
      weeklyMinCents: Cents.make(330_300),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(0n, 0)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(0n, 0)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(36_099),
      weeklyMinCents: Cents.make(0),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(16n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(578_462n, 4)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(49_999),
      weeklyMinCents: Cents.make(36_100),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(26n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(1_078_462n, 4)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(62_499),
      weeklyMinCents: Cents.make(50_000),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(18n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(578_462n, 4)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(72_099),
      weeklyMinCents: Cents.make(62_500),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(189n, 3)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(643_365n, 4)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(86_499),
      weeklyMinCents: Cents.make(72_100),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(3227n, 4)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(1_800_385n, 4)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(128_199),
      weeklyMinCents: Cents.make(86_500),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(32n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(1_765_769n, 4)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(259_599),
      weeklyMinCents: Cents.make(128_200),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(39n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(3_583_077n, 4)),
      scale: "scale2",
      weeklyMaxCents: Cents.make(365_299),
      weeklyMinCents: Cents.make(259_600),
    }),
    new Schedule1Row({
      a: DecimalCoefficient.make(BigDecimal.make(47n, 2)),
      bDollars: DecimalCoefficient.make(BigDecimal.make(6_506_154n, 4)),
      scale: "scale2",
      weeklyMaxCents: "infinity",
      weeklyMinCents: Cents.make(365_300),
    }),
  ],
  source: Schedule1Source2025_26,
  year: taxYear("2025-26"),
});

const table2024_25 = new Schedule1Table({
  rows: table2025_26.rows,
  source: Schedule1Source2024_25,
  year: taxYear("2024-25"),
});

/**
 * Live ATO Schedule 1 withholding parameter layer for 2025-26.
 *
 * @since 0.1.0
 */
export const AtoSchedule1_2025_26_Live =
  Layer.succeed(AtoSchedule1Table)(table2025_26);

/**
 * Live ATO Schedule 1 withholding parameter layer for 2024-25.
 *
 * @since 0.1.0
 */
export const AtoSchedule1_2024_25_Live =
  Layer.succeed(AtoSchedule1Table)(table2024_25);
