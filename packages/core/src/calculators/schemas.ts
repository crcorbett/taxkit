import { Schema } from "effect";

import { GraphValidationIssue } from "../graph/rule-graph.js";
/**
 * Rule-graph diagnostics returned with every defined calculation.
 *
 * @since 0.1.0
 */
export class CalculationDiagnostics extends Schema.TaggedClass<
  CalculationDiagnostics,
  {
    readonly brand: unique symbol;
  }
>()("CalculationDiagnostics", {
  graphIssues: Schema.Array(GraphValidationIssue),
}) {}

/**
 * Result envelope returned by a defined calculator.
 *
 * @since 0.1.0
 */
export interface CalculationResult<A> {
  readonly diagnostics: CalculationDiagnostics;
  readonly report: A;
}
