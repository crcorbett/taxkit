import { makeParameterDescriptor } from "@whattax/core/parameters";
import {
  Cents,
  CentsOrInfinity,
  DecimalCoefficient,
  TaxYear,
  australianTaxYearInterval,
  decimalCoefficient,
  isoDate,
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
  {
    a: DecimalCoefficient,
    bDollars: DecimalCoefficient,
    scale: Schedule1Scale,
    weeklyMaxCents: CentsOrInfinity,
    weeklyMinCents: Cents,
  }
) {}

/**
 * ATO Schedule 1 withholding coefficient table for one tax year.
 *
 * @since 0.1.0
 */
export class Schedule1Table extends Schema.TaggedClass<Schedule1Table>()(
  "Schedule1Table",
  {
    rows: Schema.Array(Schedule1Row),
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
>()("whattax/rules-au-pay/parameter/AtoSchedule1Table") {}

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
    rowCount: 15,
    shape: "Schedule1Row[]",
  }),
  retrievedOn: isoDate("2026-05-12"),
  source: Schedule1Source2025_26,
});

/**
 * Parameter descriptor for the ATO Schedule 1 withholding coefficient table.
 *
 * @since 0.1.0
 */
export const AtoSchedule1TableDescriptor = makeParameterDescriptor({
  effectivePeriod: australianTaxYearInterval("2025-26"),
  id: "whattax/rules-au-pay/parameter/AtoSchedule1Table",
  schema: Schedule1Table,
  source: Schedule1Source2025_26,
  sourceArtifact: Schedule1Artifact2025_26,
  tag: AtoSchedule1Table,
  title: "ATO Schedule 1 withholding coefficients",
});

const table2025_26 = new Schedule1Table({
  rows: [
    new Schedule1Row({
      a: decimalCoefficient("0.16"),
      bDollars: decimalCoefficient("0.16"),
      scale: "scale1",
      weeklyMaxCents: Cents.make(14_999),
      weeklyMinCents: Cents.make(0),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.2117"),
      bDollars: decimalCoefficient("7.755"),
      scale: "scale1",
      weeklyMaxCents: Cents.make(37_099),
      weeklyMinCents: Cents.make(15_000),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.189"),
      bDollars: decimalCoefficient("-0.6702"),
      scale: "scale1",
      weeklyMaxCents: Cents.make(51_499),
      weeklyMinCents: Cents.make(37_100),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.3227"),
      bDollars: decimalCoefficient("68.2367"),
      scale: "scale1",
      weeklyMaxCents: Cents.make(93_199),
      weeklyMinCents: Cents.make(51_500),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.32"),
      bDollars: decimalCoefficient("65.7202"),
      scale: "scale1",
      weeklyMaxCents: Cents.make(224_599),
      weeklyMinCents: Cents.make(93_200),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.39"),
      bDollars: decimalCoefficient("222.951"),
      scale: "scale1",
      weeklyMaxCents: Cents.make(330_299),
      weeklyMinCents: Cents.make(224_600),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.47"),
      bDollars: decimalCoefficient("487.2587"),
      scale: "scale1",
      weeklyMaxCents: "infinity",
      weeklyMinCents: Cents.make(330_300),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0"),
      bDollars: decimalCoefficient("0"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(36_099),
      weeklyMinCents: Cents.make(0),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.16"),
      bDollars: decimalCoefficient("57.8462"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(49_999),
      weeklyMinCents: Cents.make(36_100),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.26"),
      bDollars: decimalCoefficient("107.8462"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(62_499),
      weeklyMinCents: Cents.make(50_000),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.18"),
      bDollars: decimalCoefficient("57.8462"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(72_099),
      weeklyMinCents: Cents.make(62_500),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.189"),
      bDollars: decimalCoefficient("64.3365"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(86_499),
      weeklyMinCents: Cents.make(72_100),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.3227"),
      bDollars: decimalCoefficient("180.0385"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(128_199),
      weeklyMinCents: Cents.make(86_500),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.32"),
      bDollars: decimalCoefficient("176.5769"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(259_599),
      weeklyMinCents: Cents.make(128_200),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.39"),
      bDollars: decimalCoefficient("358.3077"),
      scale: "scale2",
      weeklyMaxCents: Cents.make(365_299),
      weeklyMinCents: Cents.make(259_600),
    }),
    new Schedule1Row({
      a: decimalCoefficient("0.47"),
      bDollars: decimalCoefficient("650.6154"),
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
