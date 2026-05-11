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

const validationSource2025_26 = SourceRef.make({
  kind: "internal-validation",
  title: "Illustrative AU Schedule 1 (Scale 2) for 2025-26 validation",
  reference: "validation-fixture/2025-26",
});

const validationSource2024_25 = SourceRef.make({
  kind: "internal-validation",
  title: "Illustrative AU Schedule 1 (Scale 2) for 2024-25 validation",
  reference: "validation-fixture/2024-25",
});

const table2025_26 = new Schedule1Table({
  year: taxYear("2025-26"),
  rows: [
    new Schedule1Row({
      weeklyMinCents: Cents.make(0),
      weeklyMaxCents: Cents.make(36_000),
      a: decimalCoefficient(0),
      bDollars: decimalCoefficient(0),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(36_001),
      weeklyMaxCents: Cents.make(86_500),
      a: decimalCoefficient(0.19),
      bDollars: decimalCoefficient(68.3462),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(86_501),
      weeklyMaxCents: "infinity",
      a: decimalCoefficient(0.32),
      bDollars: decimalCoefficient(180.0385),
    }),
  ],
  source: validationSource2025_26,
});

const table2024_25 = new Schedule1Table({
  year: taxYear("2024-25"),
  rows: [
    new Schedule1Row({
      weeklyMinCents: Cents.make(0),
      weeklyMaxCents: Cents.make(36_000),
      a: decimalCoefficient(0),
      bDollars: decimalCoefficient(0),
    }),
    new Schedule1Row({
      weeklyMinCents: Cents.make(36_001),
      weeklyMaxCents: "infinity",
      a: decimalCoefficient(0.18),
      bDollars: decimalCoefficient(64),
    }),
  ],
  source: validationSource2024_25,
});

export const AtoSchedule1_2025_26_Live = Layer.succeed(AtoSchedule1Table)(
  table2025_26,
);

export const AtoSchedule1_2024_25_Live = Layer.succeed(AtoSchedule1Table)(
  table2024_25,
);
