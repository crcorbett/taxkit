import { Schema } from "effect";
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

export const roundCentsToDollar = (cents: number, mode: RoundingMode): number => {
  switch (mode) {
    case "none":
    case "round-to-nearest-cent":
      return Math.round(cents);
    case "floor-cent":
      return Math.floor(cents);
    case "ceil-cent":
      return Math.ceil(cents);
    case "floor-dollar":
      return Math.floor(cents / 100) * 100;
    case "ceil-dollar":
      return Math.ceil(cents / 100) * 100;
    case "ato-withholding-rounding":
      return Math.round(cents / 100) * 100;
  }
};

export const roundMoney = (m: Money, mode: RoundingMode): Money =>
  aud(roundCentsToDollar(m.cents, mode));
