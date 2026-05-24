import { createEffectClient } from "./effect.js";
import {
  AuIncomeTax2025_26Module,
  AuPay2025_26Module,
} from "./internal/au-descriptors.js";

export {
  AuAnnualIncomeTaxCalculation,
  AuIncomeTax2025_26Module,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "./internal/au-descriptors.js";

export const auEffect = {
  createClient: () =>
    createEffectClient(AuPay2025_26Module, AuIncomeTax2025_26Module),
} as const;
