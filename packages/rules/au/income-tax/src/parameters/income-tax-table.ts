import { makeParameterDescriptor } from "@whattax/core/parameters";
import {
  Cents,
  CentsOrInfinity,
  TaxRate,
  TaxYear,
  taxRate,
  taxYear,
} from "@whattax/core/primitives";
import { SourceRef } from "@whattax/core/trace";
import { Context, Layer, Schema } from "effect";

/**
 * Marginal-rate income tax bracket.
 *
 * Formula: tax = baseTaxCents + rate * (incomeCents - thresholdCents)
 *
 * `thresholdCents` is the ATO's "each $1 over X" boundary in cents
 * (e.g. $18,200 → 1_820_000). `baseTaxCents` is the cumulative tax
 * already owed at the threshold — zero for the first two brackets.
 */
export class IncomeTaxBracket extends Schema.TaggedClass<IncomeTaxBracket>()(
  "IncomeTaxBracket",
  {
    thresholdCents: Cents,
    maxCents: CentsOrInfinity,
    rate: TaxRate,
    baseTaxCents: Cents,
  }
) {}

export class IncomeTaxTable extends Schema.TaggedClass<IncomeTaxTable>()(
  "IncomeTaxTable",
  {
    year: TaxYear,
    brackets: Schema.Array(IncomeTaxBracket),
    source: SourceRef,
  }
) {}

export class AtoIncomeTaxTable extends Context.Service<
  AtoIncomeTaxTable,
  IncomeTaxTable
>()("whattax/rules-au-income-tax/parameter/AtoIncomeTaxTable") {}

export const IncomeTaxSource2025_26 = SourceRef.make({
  kind: "ato-publication",
  title: "ATO tax rates - Australian resident 2025-26",
  reference:
    "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
});

export const AtoIncomeTaxTableDescriptor = makeParameterDescriptor({
  id: "whattax/rules-au-income-tax/parameter/AtoIncomeTaxTable",
  title: "ATO resident income tax rates",
  schema: IncomeTaxTable,
  tag: AtoIncomeTaxTable,
  source: IncomeTaxSource2025_26,
});

// Resident individual tax rates 2025-26.
// Each bracket covers: thresholdCents < income ≤ maxCents.
// The nil-rate band (0 – $18,200) has threshold=0 and rate=0.
const table2025_26 = new IncomeTaxTable({
  year: taxYear("2025-26"),
  brackets: [
    new IncomeTaxBracket({
      thresholdCents: Cents.make(0),
      maxCents: Cents.make(1_820_000),
      rate: taxRate(0),
      baseTaxCents: Cents.make(0),
    }),
    new IncomeTaxBracket({
      thresholdCents: Cents.make(1_820_000),
      maxCents: Cents.make(4_500_000),
      rate: taxRate(0.16),
      baseTaxCents: Cents.make(0),
    }),
    new IncomeTaxBracket({
      thresholdCents: Cents.make(4_500_000),
      maxCents: Cents.make(13_500_000),
      rate: taxRate(0.3),
      baseTaxCents: Cents.make(428_800),
    }),
    new IncomeTaxBracket({
      thresholdCents: Cents.make(13_500_000),
      maxCents: Cents.make(19_000_000),
      rate: taxRate(0.37),
      baseTaxCents: Cents.make(3_128_800),
    }),
    new IncomeTaxBracket({
      thresholdCents: Cents.make(19_000_000),
      maxCents: "infinity",
      rate: taxRate(0.45),
      baseTaxCents: Cents.make(5_163_800),
    }),
  ],
  source: IncomeTaxSource2025_26,
});

export const AtoIncomeTax_2025_26_Live =
  Layer.succeed(AtoIncomeTaxTable)(table2025_26);
