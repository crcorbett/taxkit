import { Schema } from "effect";

/**
 * Safe failure for an invalid date, interval or Australian tax-year label.
 *
 * @since 0.1.0
 */
export class InvalidCalendarValue extends Schema.TaggedError<InvalidCalendarValue>()(
  "InvalidCalendarValue",
  {
    code: Schema.tag("invalid-calendar-value"),
    message: Schema.tag("The calendar date, interval or tax year is invalid."),
  }
) {}

/**
 * Safe failure for an amount that cannot be represented in whole AUD cents.
 *
 * @since 0.1.0
 */
export class InvalidMoneyValue extends Schema.TaggedError<InvalidMoneyValue>()(
  "InvalidMoneyValue",
  {
    code: Schema.tag("invalid-money-value"),
    message: Schema.tag("The amount must fit in safe whole AUD cents."),
  }
) {}

/**
 * Safe failure for a decimal string that cannot be parsed.
 *
 * @since 0.1.0
 */
export class InvalidDecimalValue extends Schema.TaggedError<InvalidDecimalValue>()(
  "InvalidDecimalValue",
  {
    code: Schema.tag("invalid-decimal-value"),
    message: Schema.tag("The decimal value is invalid."),
  }
) {}

/**
 * Why dollar text could not become Money: it was blank, was not plain decimal
 * dollars, or does not fit in safe whole cents.
 *
 * @since 2.2.0
 */
export const DollarsTextIssue = Schema.Literals(["empty", "format", "range"]);

/**
 * Why dollar text could not become Money.
 *
 * @since 2.2.0
 */
export type DollarsTextIssue = typeof DollarsTextIssue.Type;

/**
 * Safe failure for dollar text that cannot become Money. Match on `reason` to
 * choose your own wording.
 *
 * @since 2.2.0
 */
export class InvalidDollarsText extends Schema.TaggedError<InvalidDollarsText>()(
  "InvalidDollarsText",
  {
    code: Schema.tag("invalid-dollars-text"),
    message: Schema.tag("The dollar amount is invalid."),
    reason: DollarsTextIssue,
  }
) {}
