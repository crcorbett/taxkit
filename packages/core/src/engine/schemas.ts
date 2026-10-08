import { Schema } from "effect";

import { GraphValidationIssue } from "../graph/rule-graph.js";

/**
 * Diagnostics returned by the calculation engine.
 *
 * @since 0.1.0
 */
export class CalculationDiagnostics extends Schema.TaggedClass<CalculationDiagnostics>()(
  "CalculationDiagnostics",
  {
    graphIssues: Schema.Array(GraphValidationIssue),
  }
) {}
