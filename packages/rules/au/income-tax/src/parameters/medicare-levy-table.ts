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
 * Medicare Levy low-income threshold and rate table.
 *
 * The table contains the nil threshold, shade-in ceiling, shade-in rate, and
 * full levy rate for one tax year.
 *
 * @since 0.1.0
 */
export class MedicareLevyTable extends Schema.TaggedClass<MedicareLevyTable>()(
  "MedicareLevyTable",
  {
    levyRate: TaxRate,
    shadeInMaxCents: Cents,
    shadeInRate: TaxRate,
    source: SourceRef,
    thresholdCents: Cents,
    year: TaxYear,
  }
) {}

/**
 * Context tag for the active ATO Medicare Levy table.
 *
 * @since 0.1.0
 */
export class AtoMedicareLevyTable extends Context.Service<
  AtoMedicareLevyTable,
  MedicareLevyTable
>()("whattax/rules-au-income-tax/parameter/AtoMedicareLevyTable") {}

/**
 * Source reference for ATO Medicare Levy low-income reduction thresholds.
 *
 * @since 0.1.0
 */
export const MedicareLevySource2025_26 = SourceRef.make({
  kind: "ato-publication",
  reference:
    "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners",
  title: "ATO Medicare levy reduction thresholds for low-income earners",
});

/**
 * Parameter descriptor for the ATO Medicare Levy table.
 *
 * @since 0.1.0
 */
export const AtoMedicareLevyTableDescriptor = makeParameterDescriptor({
  effectivePeriod: {
    from: taxYear("2025-26"),
    to: taxYear("2025-26"),
  },
  id: "whattax/rules-au-income-tax/parameter/AtoMedicareLevyTable",
  schema: MedicareLevyTable,
  source: MedicareLevySource2025_26,
  tag: AtoMedicareLevyTable,
  title: "ATO Medicare levy threshold and rate parameters",
});

// Single non-SAPTO 2025-26: nil at/below $27,222, shade-in to $34,027, then 2% flat.
const table2025_26 = new MedicareLevyTable({
  levyRate: taxRate(0.02),
  shadeInMaxCents: Cents.make(3_402_700),
  shadeInRate: taxRate(0.1),
  source: MedicareLevySource2025_26,
  thresholdCents: Cents.make(2_722_200),
  year: taxYear("2025-26"),
});

/**
 * Live ATO Medicare Levy parameter layer for 2025-26.
 *
 * @since 0.1.0
 */
export const AtoMedicareLevy_2025_26_Live =
  Layer.succeed(AtoMedicareLevyTable)(table2025_26);
