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
