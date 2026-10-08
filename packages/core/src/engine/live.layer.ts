import { Effect, Layer } from "effect";

import { CalculationEngine } from "./calculation-engine.js";
import { CalculationDiagnostics } from "./schemas.js";

/**
 * Live core calculation engine implementation.
 *
 * @since 0.1.0
 */
export const CalculationEngineLive = Layer.succeed(CalculationEngine)({
  run: (request) =>
    request.calculation.pipe(
      Effect.provide(request.layer),
      Effect.map((report) => ({
        diagnostics: new CalculationDiagnostics({
          graphIssues: [...(request.validationIssues ?? [])],
        }),
        report,
      }))
    ),
});
