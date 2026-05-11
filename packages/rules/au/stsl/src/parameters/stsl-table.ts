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
 *
 * @since 0.1.0
 */
export class StslRow extends Schema.TaggedClass<StslRow>()("StslRow", {
  a: DecimalCoefficient,
  bDollars: DecimalCoefficient,
  weeklyMaxCents: CentsOrInfinity,
  weeklyMinCents: Cents,
}) {}

/**
 * ATO Schedule 8 STSL withholding coefficient table for one tax year.
 *
 * @since 0.1.0
 */
export class StslTable extends Schema.TaggedClass<StslTable>()("StslTable", {
  rows: Schema.Array(StslRow),
  source: SourceRef,
  year: TaxYear,
}) {}

/**
 * Context tag for the active ATO Schedule 8 STSL table.
 *
 * @since 0.1.0
 */
export class AtoStslTable extends Context.Service<AtoStslTable, StslTable>()(
  "whattax/rules-au-stsl/parameter/AtoStslTable"
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
 * Parameter descriptor for the ATO Schedule 8 STSL coefficient table.
 *
 * @since 0.1.0
 */
export const AtoStslTableDescriptor = makeParameterDescriptor({
  effectivePeriod: {
    from: taxYear("2025-26"),
    to: taxYear("2025-26"),
  },
  id: "whattax/rules-au-stsl/parameter/AtoStslTable",
  schema: StslTable,
  source: StslSource2025_26,
  tag: AtoStslTable,
  title: "ATO Schedule 8 STSL withholding coefficients",
});

const table2025_26 = new StslTable({
  rows: [
    new StslRow({
      a: decimalCoefficient(0),
      bDollars: decimalCoefficient(0),
      weeklyMaxCents: Cents.make(128_799),
      weeklyMinCents: Cents.make(0),
    }),
    new StslRow({
      a: decimalCoefficient(0.15),
      bDollars: decimalCoefficient(193.2692),
      weeklyMaxCents: Cents.make(240_299),
      weeklyMinCents: Cents.make(128_800),
    }),
    new StslRow({
      a: decimalCoefficient(0.17),
      bDollars: decimalCoefficient(241.3462),
      weeklyMaxCents: Cents.make(344_699),
      weeklyMinCents: Cents.make(240_300),
    }),
    new StslRow({
      a: decimalCoefficient(0.1),
      bDollars: decimalCoefficient(0),
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
