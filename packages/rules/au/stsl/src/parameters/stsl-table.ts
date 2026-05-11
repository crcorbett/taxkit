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
import { Context, Layer, Schema } from "effect";

/**
 * ATO Schedule 8 STSL coefficient row.
 *
 * Formula: component = a * x - b
 * where x is whole weekly dollars plus 99 cents.
 */
export class StslRow extends Schema.TaggedClass<StslRow>()("StslRow", {
  weeklyMinCents: Cents,
  weeklyMaxCents: CentsOrInfinity,
  a: DecimalCoefficient,
  bDollars: DecimalCoefficient,
}) {}

export class StslTable extends Schema.TaggedClass<StslTable>()("StslTable", {
  year: TaxYear,
  rows: Schema.Array(StslRow),
  source: SourceRef,
}) {}

export class AtoStslTable extends Context.Service<AtoStslTable, StslTable>()(
  "whattax/rules-au-stsl/parameter/AtoStslTable"
) {}

export const StslSource2025_26 = SourceRef.make({
  kind: "ato-publication",
  title:
    "ATO Schedule 8 - Statement of formulas for calculating study and training support loans components",
  reference:
    "https://www.ato.gov.au/tax-rates-and-codes/schedule-8-statement-of-formulas-for-calculating-study-and-training-support-loans-components",
});

export const AtoStslTableDescriptor = makeParameterDescriptor({
  id: "whattax/rules-au-stsl/parameter/AtoStslTable",
  title: "ATO Schedule 8 STSL withholding coefficients",
  schema: StslTable,
  tag: AtoStslTable,
  source: StslSource2025_26,
});

const table2025_26 = new StslTable({
  year: taxYear("2025-26"),
  rows: [
    new StslRow({
      weeklyMinCents: Cents.make(0),
      weeklyMaxCents: Cents.make(128_799),
      a: decimalCoefficient(0),
      bDollars: decimalCoefficient(0),
    }),
    new StslRow({
      weeklyMinCents: Cents.make(128_800),
      weeklyMaxCents: Cents.make(240_299),
      a: decimalCoefficient(0.15),
      bDollars: decimalCoefficient(193.2692),
    }),
    new StslRow({
      weeklyMinCents: Cents.make(240_300),
      weeklyMaxCents: Cents.make(344_699),
      a: decimalCoefficient(0.17),
      bDollars: decimalCoefficient(241.3462),
    }),
    new StslRow({
      weeklyMinCents: Cents.make(344_700),
      weeklyMaxCents: "infinity",
      a: decimalCoefficient(0.1),
      bDollars: decimalCoefficient(0),
    }),
  ],
  source: StslSource2025_26,
});

export const AtoStsl_2025_26_Live = Layer.succeed(AtoStslTable)(table2025_26);
