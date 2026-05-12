import { Schema } from "effect";

/**
 * ISO calendar date used for effective-period boundaries.
 *
 * The value is branded after validating the `YYYY-MM-DD` shape and checking
 * that JavaScript can parse it as a real date. Effective periods use calendar
 * dates rather than tax-year labels so mid-year official changes can be
 * represented precisely.
 *
 * @since 0.1.0
 */
export const IsoDate = Schema.String.pipe(Schema.brand("whattax/IsoDate"));

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

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

const assertIsoDate = (value: string): void => {
  if (!isoDatePattern.test(value)) {
    throw new Error(`whattax/core: expected ISO date YYYY-MM-DD, got ${value}`);
  }

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(timestamp)) {
    throw new TypeError(`whattax/core: invalid ISO date ${value}`);
  }
};

/**
 * Brands a validated ISO calendar date.
 *
 * @since 0.1.0
 */
export const isoDate = (value: string): IsoDate => {
  assertIsoDate(value);
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
      `whattax/core: expected interval start ${from} before end ${toExclusive}`
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
    throw new TypeError(`whattax/core: invalid Australian tax year ${year}`);
  }

  return dateInterval({
    from: `${startYear}-07-01`,
    toExclusive: `${startYear + 1}-07-01`,
  });
};
