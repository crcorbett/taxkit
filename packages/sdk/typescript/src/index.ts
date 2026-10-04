import {
  calculate,
  calculateSafe,
  createPlainClient,
} from "./client.runtime.js";
import type { TaxKitClient } from "./client.runtime.js";
import { SdkCalculatorServiceLive } from "./live.layer.js";
import type { AnyTaxKitModule } from "./types.js";

export { calculate, calculateSafe } from "./client.runtime.js";
export type { TaxKitClient } from "./client.runtime.js";
export type {
  AnySdkCalculation,
  AnyTaxKitModule,
  CalculationInput,
  CalculationOutput,
  ModuleCalculation,
  SdkCalculation,
  SdkCalculationDefinition,
  TaxKitModule,
} from "./types.js";
export {
  TaxKitCalculationError,
  TaxKitClientDisposedError,
  TaxKitClientDisposeError,
  TaxKitFailure,
  TaxKitSchemaDecodeError,
  TaxKitSuccess,
  TaxKitUnexpectedError,
} from "./errors.js";
export type {
  TaxKitCalculationErrorDetail,
  TaxKitError,
  TaxKitSafeResult,
} from "./errors.js";

export const createClient = <const Modules extends readonly AnyTaxKitModule[]>(
  ...modules: Modules
): TaxKitClient<Modules> =>
  createPlainClient(SdkCalculatorServiceLive, ...modules);

export const TaxKit = {
  calculate,
  createClient,
  safe: { calculate: calculateSafe },
} as const;
