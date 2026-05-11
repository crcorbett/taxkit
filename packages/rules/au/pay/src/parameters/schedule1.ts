import { Context, Layer, Schema } from "effect";
import {
  Cents,
  CentsOrInfinity,
  DecimalCoefficient,
  TaxYear,
  decimalCoefficient,
  taxYear,
} from "@whattax/core/primitives";
import { SourceRef } from "@whattax/core/trace";

/**
 * ATO Schedule 1 coefficient row, scale 2 (resident, tax-free threshold claimed).
 *
 * The ATO weekly formula is `withholding = a * weekly - b` applied to the
 * weekly-equivalent earnings, then rounded to the nearest dollar and converted
 * back to the period.
 */
export class Schedule1Row
  extends Schema.TaggedClass<Schedule1Row>()("Schedule1Row", {
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

const table2025_26 = new Schedule1Table({
  year: taxYear("2025-26"),
  rows: [
    new Schedule1Row({
      weeklyMinCents: Cents.make(0),
      weeklyMaxCents: Cents.make(36_099),
      a: decimalCoefficient(0),
      bDollars: decimalCoefficient(0),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(36_100),
      weeklyMaxCents: Cents.make(49_999),
      a: decimalCoefficient(0.16),
      bDollars: decimalCoefficient(57.8462),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(50_000),
      weeklyMaxCents: Cents.make(62_499),
      a: decimalCoefficient(0.26),
      bDollars: decimalCoefficient(107.8462),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(62_500),
      weeklyMaxCents: Cents.make(72_099),
      a: decimalCoefficient(0.18),
      bDollars: decimalCoefficient(57.8462),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(72_100),
      weeklyMaxCents: Cents.make(86_499),
      a: decimalCoefficient(0.189),
      bDollars: decimalCoefficient(64.3365),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(86_500),
      weeklyMaxCents: Cents.make(128_199),
      a: decimalCoefficient(0.3227),
      bDollars: decimalCoefficient(180.0385),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(128_200),
      weeklyMaxCents: Cents.make(259_599),
      a: decimalCoefficient(0.32),
      bDollars: decimalCoefficient(176.5769),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(259_600),
      weeklyMaxCents: Cents.make(365_299),
      a: decimalCoefficient(0.39),
      bDollars: decimalCoefficient(358.3077),
    }),
    new Schedule1Row({
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
