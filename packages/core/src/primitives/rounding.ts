import { Match, Schema } from "effect";

import { aud } from "./money.js";
import type { Money } from "./money.js";

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
 * import { roundCentsToDollar } from "@taxkit/core";
 *
 * const rounded = roundCentsToDollar(12_345, "ato-withholding-rounding");
 * ```
 *
 * @since 0.1.0
 */
export const roundCentsToDollar = (cents: number, mode: RoundingMode): number =>
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

/**
 * Rounds a money value according to a named calculation policy.
 *
 * @since 0.1.0
 */
export const roundMoney = (m: Money, mode: RoundingMode): Money =>
  aud(roundCentsToDollar(m.cents, mode));
