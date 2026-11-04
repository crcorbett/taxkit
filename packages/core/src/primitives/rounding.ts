import { Match, Schema } from "effect";

import type { Cents } from "./money.js";
/**
 * Rounding policies used by formula evaluation and trace output.
 *
 * @since 0.1.0
 */
export const RoundingMode = Schema.Literals([
  "none",
  "round-to-nearest-cent",
  "floor-cent",
  "ceil-cent",
  "floor-dollar",
  "ceil-dollar",
  "ato-withholding-rounding",
]);
/**
 * Rounding policies used by formula evaluation and trace output.
 *
 * @since 0.1.0
 */
export type RoundingMode = typeof RoundingMode.Type;
/**
 * Rounds a cent amount according to a named calculation policy.
 *
 * @example
 * ```ts
 * import { Cents, roundCentsToDollar } from "@taxkit/core";
 *
 * const rounded = roundCentsToDollar(Cents.make(12_345), "ato-withholding-rounding");
 * ```
 *
 * @since 0.1.0
 */
export const roundCentsToDollar = (cents: Cents, mode: RoundingMode): number =>
  Match.value(mode).pipe(
    Match.when("none", () => Math.round(cents)),
    Match.when("round-to-nearest-cent", () => Math.round(cents)),
    Match.when("floor-cent", () => Math.floor(cents)),
    Match.when("ceil-cent", () => Math.ceil(cents)),
    Match.when("floor-dollar", () => Math.floor(cents / 100) * 100),
    Match.when("ceil-dollar", () => Math.ceil(cents / 100) * 100),
    Match.when("ato-withholding-rounding", () => Math.round(cents / 100) * 100),
    Match.exhaustive
  );
