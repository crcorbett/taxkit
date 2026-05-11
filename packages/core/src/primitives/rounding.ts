import { Match, Schema } from "effect";
import { aud, type Money } from "./money.js";

export const RoundingMode = Schema.Literals([
  "none",
  "round-to-nearest-cent",
  "floor-cent",
  "ceil-cent",
  "floor-dollar",
  "ceil-dollar",
  "ato-withholding-rounding",
]);
export type RoundingMode = typeof RoundingMode.Type;

export const roundCentsToDollar = (cents: number, mode: RoundingMode): number =>
  Match.value(mode).pipe(
    Match.when("none", () => Math.round(cents)),
    Match.when("round-to-nearest-cent", () => Math.round(cents)),
    Match.when("floor-cent", () => Math.floor(cents)),
    Match.when("ceil-cent", () => Math.ceil(cents)),
    Match.when("floor-dollar", () => Math.floor(cents / 100) * 100),
    Match.when("ceil-dollar", () => Math.ceil(cents / 100) * 100),
    Match.when("ato-withholding-rounding", () => Math.round(cents / 100) * 100),
    Match.exhaustive,
  );

export const roundMoney = (m: Money, mode: RoundingMode): Money =>
  aud(roundCentsToDollar(m.cents, mode));
