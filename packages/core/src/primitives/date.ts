import { Schema } from "effect";

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
    month === 2 && leapYear ? 29 : (standardDaysInMonth[month - 1] ?? 0);

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

/**
 * Half-open date interval `[from, toExclusive)`.
 *
 * `toExclusive` may be absent only for an open-ended official source.
 *
 * @since 0.1.0
 */
export const DateInterval = Schema.Struct({
  from: IsoDate,
  toExclusive: Schema.optional(IsoDate),
});

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
export const isoDate = (value: string): IsoDate => {
  if (!isRealIsoDate(value)) {
    throw new TypeError(
      `taxkit/core: expected a real Gregorian calendar date in YYYY-MM-DD form, got ${value}`
    );
  }

  return IsoDate.make(value);
};

const optionalIsoDate = (
  value: string | IsoDate | undefined
): IsoDate | undefined => (typeof value === "string" ? isoDate(value) : value);

/**
 * Builds a validated half-open date interval.
 *
 * @since 0.1.0
 */
export const dateInterval = (args: {
  readonly from: string | IsoDate;
  readonly toExclusive?: string | IsoDate;
}): DateInterval => {
  const from = typeof args.from === "string" ? isoDate(args.from) : args.from;
  const toExclusive = optionalIsoDate(args.toExclusive);

  if (toExclusive !== undefined && String(from) >= String(toExclusive)) {
    throw new Error(
      `taxkit/core: expected interval start ${from} before end ${toExclusive}`
    );
  }

  return DateInterval.make(
    toExclusive === undefined ? { from } : { from, toExclusive }
  );
};

/**
 * Returns whether two half-open date intervals overlap.
 *
 * @since 0.1.0
 */
export const dateIntervalsOverlap = (
  left: DateInterval,
  right: DateInterval
): boolean =>
  String(left.from) < String(right.toExclusive ?? "9999-12-31") &&
  String(right.from) < String(left.toExclusive ?? "9999-12-31");

/**
 * Converts an Australian tax year label such as `2025-26` to its date
 * interval: `2025-07-01` through, but not including, `2026-07-01`.
 *
 * @since 0.1.0
 */
export const australianTaxYearInterval = (year: string): DateInterval => {
  const startYear = Number.parseInt(year.slice(0, 4), 10);
  if (!Number.isInteger(startYear)) {
    throw new TypeError(`taxkit/core: invalid Australian tax year ${year}`);
  }

  return dateInterval({
    from: `${startYear}-07-01`,
    toExclusive: `${startYear + 1}-07-01`,
  });
};
