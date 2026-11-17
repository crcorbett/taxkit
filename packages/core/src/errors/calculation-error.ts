import { Schema } from "effect";

import { MoneyIssue } from "../primitives/errors.js";

/**
 * Safe, bounded reasons why a checked scenario cannot be calculated. Money
 * reasons are copied from the `MoneyError` that caused the failure; a period
 * mismatch names facts supplied for different pay periods.
 *
 * @since 7.0.0
 */
export const CalculationFailureReason = Schema.Literals([
  "period-mismatch",
  ...MoneyIssue.literals,
]);
export type CalculationFailureReason = typeof CalculationFailureReason.Type;

/**
 * An expected failure that depends on the caller's scenario: its amounts do
 * not fit the rules (for example sacrifice above gross pay, or a total beyond
 * safe cents), or its facts disagree. Callers can change the scenario and try
 * again. Engine faults are never reported with this error.
 *
 * @since 0.1.0
 */
export class CalculationError extends Schema.TaggedError<
  CalculationError,
  { readonly brand: unique symbol }
>()("CalculationError", {
  message: Schema.String,
  reason: CalculationFailureReason,
}) {}

/**
 * A defect, not an expected failure: a calculator's rule graph, checked
 * parameter table or report invariant is broken. No scenario can avoid it, so
 * programs raise it with `Effect.die` and hosts report it as a server fault.
 * It is never encoded into a public reply.
 *
 * @since 7.0.0
 */
export class CalculationInvariantViolation extends Schema.TaggedError<
  CalculationInvariantViolation,
  { readonly brand: unique symbol }
>()("CalculationInvariantViolation", {
  invariant: Schema.Literals(["rule-graph", "table-coverage", "report"]),
  message: Schema.String,
}) {}
