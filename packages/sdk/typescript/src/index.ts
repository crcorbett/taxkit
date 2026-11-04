import { createPlainClient } from "./client.runtime.js";
import { TaxKitLive } from "./live.layer.js";

export { calculate, calculateSafe, run } from "./client.runtime.js";
export type { TaxKitClient } from "./client.runtime.js";
export type {
  CalculationInput,
  CalculationOutput,
  CalculationRun,
} from "./types.js";
export {
  TaxKitError,
  TaxKitUnexpectedError,
  TaxKitClientDisposedError,
  TaxKitClientDisposeError,
} from "./errors.js";
export const createClient = () => createPlainClient(TaxKitLive);
