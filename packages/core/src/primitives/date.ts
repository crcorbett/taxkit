import { Array, Effect, Option, Schema } from "effect";

import { InvalidCalendarValue } from "./errors.js";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;
const standardDaysInMonth = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
] as const;

const isRealIsoDate = (value: string): boolean => {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLength =
    month === 2 && leapYear
      ? 29
      : Array.get(standardDaysInMonth, month - 1).pipe(
          Option.getOrElse(() => 0)
        );

  return (
    year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= monthLength
  );
};

/**
 * ISO calendar date used for effective-period boundaries.
 *
 * The value is branded after validating the `YYYY-MM-DD` shape and checking
 * the represented year, month and day against Gregorian leap-year and
 * month-length rules. Effective periods use calendar dates rather than
 * tax-year labels so mid-year official changes can be represented precisely.
 *
 * @since 0.1.0
 */
export const IsoDate = Schema.String.check(
  Schema.makeFilter((value) => isRealIsoDate(value), {
    expected: "a real Gregorian calendar date in YYYY-MM-DD form",
  })
).pipe(Schema.brand("taxkit/IsoDate"));

/**
 * ISO calendar date used for effective-period boundaries.
 *
 * @since 0.1.0
 */
export type IsoDate = typeof IsoDate.Type;

const DateIntervalFields = Schema.Struct({
  from: IsoDate,
  toExclusive: Schema.OptionFromOptionalKey(
    Schema.OptionFromUndefinedOr(IsoDate)
  ).pipe(Schema.withConstructorDefault(Effect.succeedNone)),
});

const isIntervalOrdered = (from: string, end: Option.Option<string>): boolean =>
  end.pipe(
    Option.match({ onNone: () => true, onSome: (value) => from < value })
  );

// Check each representation at its owning boundary. A check on the decoded
// Option fields alone is lost when Schema.toEncoded removes transformations.
/**
 * Half-open date interval `[from, toExclusive)`.
 *
 * The outer end Option preserves a missing key; its inner Option preserves a
 * present undefined value. Flatten the end for overlap and ordering semantics.
 *
 * @since 0.1.0
 */
export const DateInterval = Schema.toEncoded(DateIntervalFields)
  .check(
    Schema.makeFilter(
      ({ from, toExclusive }) =>
        isIntervalOrdered(from, Option.fromUndefinedOr(toExclusive)),
      { expected: "interval start before end" }
    )
  )
  .pipe(Schema.decodeTo(DateIntervalFields))
  .check(
    Schema.makeFilter(
      ({ from, toExclusive }) =>
        isIntervalOrdered(from, Option.flatten(toExclusive)),
      { expected: "interval start before end" }
    )
  );

/**
 * Half-open date interval `[from, toExclusive)`.
 *
 * @since 0.1.0
 */
export type DateInterval = typeof DateInterval.Type;

/**
 * Brands a validated ISO calendar date.
 *
 * @since 0.1.0
 */
export const isoDate = (
  value: string
): Effect.Effect<IsoDate, InvalidCalendarValue> =>
  IsoDate.makeEffect(value).pipe(
    Effect.mapError(() => new InvalidCalendarValue())
  );

/**
 * Builds a validated half-open date interval.
 *
 * @since 0.1.0
 */
export const dateInterval = (
  args: typeof DateInterval.Encoded
): Effect.Effect<DateInterval, InvalidCalendarValue> =>
  Schema.decodeEffect(DateInterval)(args).pipe(
    Effect.mapError(() => new InvalidCalendarValue())
  );

/**
 * Returns whether two half-open date intervals overlap.
 *
 * @since 0.1.0
 */
export const dateIntervalsOverlap = (
  left: DateInterval,
  right: DateInterval
): boolean =>
  Option.flatten(right.toExclusive).pipe(
    Option.match({ onNone: () => true, onSome: (end) => left.from < end })
  ) &&
  Option.flatten(left.toExclusive).pipe(
    Option.match({ onNone: () => true, onSome: (end) => right.from < end })
  );

/**
 * Complete Australian year label with a matching next-year suffix.
 *
 * Both July boundaries must fit the four-digit calendar-date representation.
 * Generic TaxYear remains an open identifier owned separately.
 *
 * @since 0.1.0
 */
export const AustralianTaxYear = Schema.String.check(
  Schema.makeFilter(
    (value) => {
      if (!/^\d{4}-\d{2}$/u.test(value)) {
        return false;
      }
      const start = Number(value.slice(0, 4));
      return (
        start > 0 &&
        start < 9999 &&
        value.slice(5) === String((start + 1) % 100).padStart(2, "0")
      );
    },
    { expected: "a complete Australian tax year with representable dates" }
  )
).pipe(Schema.brand("taxkit/AustralianTaxYear"));

/**
 * Complete Australian year label used by the calendar interval helper.
 *
 * @since 0.1.0
 */
export type AustralianTaxYear = typeof AustralianTaxYear.Type;

/**
 * Converts an Australian tax year label such as `2025-26` to its date
 * interval: `2025-07-01` through, but not including, `2026-07-01`.
 *
 * @since 0.1.0
 */
export const australianTaxYearInterval = (
  year: string
): Effect.Effect<DateInterval, InvalidCalendarValue> =>
  AustralianTaxYear.makeEffect(year).pipe(
    Effect.mapError(() => new InvalidCalendarValue()),
    Effect.flatMap((value) =>
      dateInterval({
        from: `${value.slice(0, 4)}-07-01`,
        toExclusive: `${String(Number(value.slice(0, 4)) + 1).padStart(4, "0")}-07-01`,
      })
    )
  );
