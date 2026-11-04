export { Cents, Currency, Money, NonNegativeMoney, fromCents, nonNegative, add, subtract, moneyEquals } from "./primitives/money.js";
export { fromDecimal, format, MoneyFromDecimalString, NonNegativeMoneyFromDecimalString } from "./primitives/dollars.js";
export { MoneyError, MoneyIssue } from "./primitives/errors.js";

import { fromCents } from "./primitives/money.js";
import type { Money } from "./primitives/money.js";
import { roundCentsToDollar } from "./primitives/rounding.js";
import type { RoundingMode } from "./primitives/rounding.js";
export const round = (money: Money, policy: RoundingMode) => fromCents(roundCentsToDollar(money.cents, policy));
