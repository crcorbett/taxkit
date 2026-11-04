import { Effect, Schema } from "effect";

/**
 * Safe failure for an invalid date, interval or Australian tax-year label.
 *
 * @since 0.1.0
 */
export class InvalidCalendarValue extends Schema.TaggedError<
  InvalidCalendarValue,
  { readonly brand: unique symbol }
>()("InvalidCalendarValue", {
  code: Schema.tag("invalid-calendar-value"),
  message: Schema.tag("The calendar date, interval or tax year is invalid."),
}) {}

/** Safe, bounded reasons; never includes the rejected amount. */
export const MoneyIssue = Schema.Literals(["empty", "format", "fractional-cents", "non-finite", "range", "negative", "overflow"]);
export type MoneyIssue = typeof MoneyIssue.Type;
export class MoneyError extends Schema.TaggedError<MoneyError, { readonly brand: unique symbol }>()("MoneyError", {
  code: Schema.tag("invalid-money"),
  message: Schema.tag("The amount must fit in safe whole AUD cents."),
  reason: MoneyIssue.pipe(Schema.withConstructorDefault(Effect.succeed("range" as const))),
}) {}
/** Safe failure for an invalid exact formula coefficient. */
export class InvalidDecimalValue extends Schema.TaggedError<InvalidDecimalValue, { readonly brand: unique symbol }>()("InvalidDecimalValue", {
  code: Schema.tag("invalid-decimal-value"),
  message: Schema.tag("The decimal value is invalid."),
}) {}
