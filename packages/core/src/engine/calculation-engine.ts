import { Context } from "effect";
import type { Effect, Layer } from "effect";

import type { CalculationDiagnostics } from "./schemas.js";

export { CalculationDiagnostics } from "./schemas.js";

/**
 * Input accepted by the core calculation engine.
 *
 * The engine is deliberately generic: rule packs and scenario layers are
 * selected by the caller, while the core service handles Effect-native
 * provisioning and returns the calculation result.
 *
 * @since 0.1.0
 */
export interface CalculationRequest<A, E, R> {
  readonly calculation: Effect.Effect<A, E, R>;
  readonly layer: Layer.Layer<R, E>;
  readonly validationIssues?: CalculationDiagnostics["graphIssues"];
}

/**
 * Result envelope returned by the calculation engine.
 *
 * @since 0.1.0
 */
export interface CalculationResult<A> {
  readonly diagnostics: CalculationDiagnostics;
  readonly report: A;
}

/**
 * Effect-native service for running typed core calculations.
 *
 * @since 0.1.0
 */
export interface CalculationEngineService {
  readonly run: <A, E, R>(
    request: CalculationRequest<A, E, R>
  ) => Effect.Effect<CalculationResult<A>, E>;
}

/**
 * Context tag for the core calculation engine service.
 *
 * @since 0.1.0
 */
export class CalculationEngine extends Context.Service<
  CalculationEngine,
  CalculationEngineService
>()("taxkit/core/CalculationEngine") {}
