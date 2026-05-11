import { Context, Layer, Schema } from "effect";
import { makeParameterDescriptor } from "@whattax/core/parameters";
import {
  Cents,
  CentsOrInfinity,
  DecimalCoefficient,
  TaxYear,
  decimalCoefficient,
  taxYear,
} from "@whattax/core/primitives";
import { SourceRef } from "@whattax/core/trace";

export const Schedule1Scale = Schema.Literals(["scale1", "scale2"]);
export type Schedule1Scale = typeof Schedule1Scale.Type;

/**
 * ATO Schedule 1 coefficient row for resident Scale 1 or Scale 2.
 *
 * The ATO weekly formula is `withholding = a * weekly - b` applied to the
 * weekly-equivalent earnings, then rounded to the nearest dollar and converted
 * back to the period.
 */
export class Schedule1Row
  extends Schema.TaggedClass<Schedule1Row>()("Schedule1Row", {
    scale: Schedule1Scale,
    weeklyMinCents: Cents,
    weeklyMaxCents: CentsOrInfinity,
    a: DecimalCoefficient,
    bDollars: DecimalCoefficient,
  }) {}

export class Schedule1Table
  extends Schema.TaggedClass<Schedule1Table>()("Schedule1Table", {
    year: TaxYear,
    rows: Schema.Array(Schedule1Row),
    source: SourceRef,
  }) {}

export class AtoSchedule1Table extends Context.Service<
  AtoSchedule1Table,
  Schedule1Table
>()("whattax/rules-au-pay/parameter/AtoSchedule1Table") {}

export const Schedule1Source2025_26 = SourceRef.make({
  kind: "ato-publication",
  title: "ATO Schedule 1 - Statement of formulas for calculating amounts to be withheld",
  reference:
    "https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld",
});

export const Schedule1Source2024_25 = Schedule1Source2025_26;

export const AtoSchedule1TableDescriptor = makeParameterDescriptor({
  id: "whattax/rules-au-pay/parameter/AtoSchedule1Table",
  title: "ATO Schedule 1 withholding coefficients",
  schema: Schedule1Table,
  tag: AtoSchedule1Table,
  source: Schedule1Source2025_26,
});

const table2025_26 = new Schedule1Table({
  year: taxYear("2025-26"),
  rows: [
    new Schedule1Row({
      scale: "scale1",
      weeklyMinCents: Cents.make(0),
      weeklyMaxCents: Cents.make(14_999),
      a: decimalCoefficient(0.16),
      bDollars: decimalCoefficient(0.16),
    }),
    new Schedule1Row({
      scale: "scale1",
      weeklyMinCents: Cents.make(15_000),
      weeklyMaxCents: Cents.make(37_099),
      a: decimalCoefficient(0.2117),
      bDollars: decimalCoefficient(7.755),
    }),
    new Schedule1Row({
      scale: "scale1",
      weeklyMinCents: Cents.make(37_100),
      weeklyMaxCents: Cents.make(51_499),
      a: decimalCoefficient(0.189),
      bDollars: decimalCoefficient(-0.6702),
    }),
    new Schedule1Row({
      scale: "scale1",
      weeklyMinCents: Cents.make(51_500),
      weeklyMaxCents: Cents.make(93_199),
      a: decimalCoefficient(0.3227),
      bDollars: decimalCoefficient(68.2367),
    }),
    new Schedule1Row({
      scale: "scale1",
      weeklyMinCents: Cents.make(93_200),
      weeklyMaxCents: Cents.make(224_599),
      a: decimalCoefficient(0.32),
      bDollars: decimalCoefficient(65.7202),
    }),
    new Schedule1Row({
      scale: "scale1",
      weeklyMinCents: Cents.make(224_600),
      weeklyMaxCents: Cents.make(330_299),
      a: decimalCoefficient(0.39),
      bDollars: decimalCoefficient(222.951),
    }),
    new Schedule1Row({
      scale: "scale1",
      weeklyMinCents: Cents.make(330_300),
      weeklyMaxCents: "infinity",
      a: decimalCoefficient(0.47),
      bDollars: decimalCoefficient(487.2587),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(0),
      weeklyMaxCents: Cents.make(36_099),
      a: decimalCoefficient(0),
      bDollars: decimalCoefficient(0),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(36_100),
      weeklyMaxCents: Cents.make(49_999),
      a: decimalCoefficient(0.16),
      bDollars: decimalCoefficient(57.8462),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(50_000),
      weeklyMaxCents: Cents.make(62_499),
      a: decimalCoefficient(0.26),
      bDollars: decimalCoefficient(107.8462),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(62_500),
      weeklyMaxCents: Cents.make(72_099),
      a: decimalCoefficient(0.18),
      bDollars: decimalCoefficient(57.8462),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(72_100),
      weeklyMaxCents: Cents.make(86_499),
      a: decimalCoefficient(0.189),
      bDollars: decimalCoefficient(64.3365),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(86_500),
      weeklyMaxCents: Cents.make(128_199),
      a: decimalCoefficient(0.3227),
      bDollars: decimalCoefficient(180.0385),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(128_200),
      weeklyMaxCents: Cents.make(259_599),
      a: decimalCoefficient(0.32),
      bDollars: decimalCoefficient(176.5769),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(259_600),
      weeklyMaxCents: Cents.make(365_299),
      a: decimalCoefficient(0.39),
      bDollars: decimalCoefficient(358.3077),
    }),
    new Schedule1Row({
      scale: "scale2",
      weeklyMinCents: Cents.make(365_300),
      weeklyMaxCents: "infinity",
      a: decimalCoefficient(0.47),
      bDollars: decimalCoefficient(650.6154),
    }),
  ],
  source: Schedule1Source2025_26,
});

const table2024_25 = new Schedule1Table({
  year: taxYear("2024-25"),
  rows: table2025_26.rows,
  source: Schedule1Source2024_25,
});

export const AtoSchedule1_2025_26_Live = Layer.succeed(AtoSchedule1Table)(
  table2025_26,
);

export const AtoSchedule1_2024_25_Live = Layer.succeed(AtoSchedule1Table)(
  table2024_25,
);
