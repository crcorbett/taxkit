import { makeParameterDescriptor } from "@whattax/core/parameters";
import {
  Cents,
  TaxRate,
  TaxYear,
  taxRate,
  taxYear,
} from "@whattax/core/primitives";
import { SourceRef } from "@whattax/core/trace";
import { Context, Layer, Schema } from "effect";

/**
 * Medicare Levy parameter table.
 *
 * Shade-in formula (thresholdCents < income ≤ shadeInMaxCents):
 *   levy = shadeInRate * (incomeCents - thresholdCents)
 *
 * Full rate formula (income > shadeInMaxCents):
 *   levy = levyRate * incomeCents
 *
 * The shade-in max is chosen so the two formulas produce the same value
 * at the boundary: shadeInRate*(shadeInMax-threshold) = levyRate*shadeInMax
 */
export class MedicareLevyTable extends Schema.TaggedClass<MedicareLevyTable>()(
  "MedicareLevyTable",
  {
    year: TaxYear,
    thresholdCents: Cents,
    shadeInMaxCents: Cents,
    shadeInRate: TaxRate,
    levyRate: TaxRate,
    source: SourceRef,
  }
) {}

export class AtoMedicareLevyTable extends Context.Service<
  AtoMedicareLevyTable,
  MedicareLevyTable
>()("whattax/rules-au-income-tax/parameter/AtoMedicareLevyTable") {}

export const MedicareLevySource2025_26 = SourceRef.make({
  kind: "ato-publication",
  title: "ATO Medicare levy reduction thresholds for low-income earners",
  reference:
    "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners",
});

export const AtoMedicareLevyTableDescriptor = makeParameterDescriptor({
  id: "whattax/rules-au-income-tax/parameter/AtoMedicareLevyTable",
  title: "ATO Medicare levy threshold and rate parameters",
  schema: MedicareLevyTable,
  tag: AtoMedicareLevyTable,
  source: MedicareLevySource2025_26,
});

// Single non-SAPTO 2025-26: nil at/below $27,222, shade-in to $34,027, then 2% flat.
const table2025_26 = new MedicareLevyTable({
  year: taxYear("2025-26"),
  thresholdCents: Cents.make(2_722_200),
  shadeInMaxCents: Cents.make(3_402_700),
  shadeInRate: taxRate(0.1),
  levyRate: taxRate(0.02),
  source: MedicareLevySource2025_26,
});

export const AtoMedicareLevy_2025_26_Live =
  Layer.succeed(AtoMedicareLevyTable)(table2025_26);
