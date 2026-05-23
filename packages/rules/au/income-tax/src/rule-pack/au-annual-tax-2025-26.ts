import { Layer } from "effect";

import { AtoIncomeTax_2025_26_Live } from "../parameters/income-tax-table.js";
import { AtoLito_2025_26_Live } from "../parameters/lito-table.js";
import { AtoMedicareLevy_2025_26_Live } from "../parameters/medicare-levy-table.js";
import { AnnualTaxLedgerLive } from "../rules/annual-tax-ledger.js";
import { IncomeTaxLive } from "../rules/income-tax.js";
import { LitoLive } from "../rules/lito.js";
import { MedicareLevyLive } from "../rules/medicare-levy.js";

/**
 * AU annual income tax 2025-26: income tax + LITO + Medicare Levy.
 *
 * Provides: AnnualTaxLedgerFact
 * Requires (from a scenario layer): AnnualTaxableIncomeFact
 *
 * @since 0.1.0
 */
export const AuAnnualTax2025_26_Live = AnnualTaxLedgerLive.pipe(
  Layer.provideMerge(IncomeTaxLive),
  Layer.provideMerge(LitoLive),
  Layer.provideMerge(MedicareLevyLive),
  Layer.provideMerge(AtoIncomeTax_2025_26_Live),
  Layer.provideMerge(AtoLito_2025_26_Live),
  Layer.provideMerge(AtoMedicareLevy_2025_26_Live)
);
