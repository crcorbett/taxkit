import { Effect } from "effect";

import * as Money from "./money.js";
import * as Dollars from "./dollars.js";

export const fromCents = (cents: number) => Effect.suspend(() => Effect.fromResult(Money.fromCents(cents)));
export const fromDecimal = (text: string) => Effect.suspend(() => Effect.fromResult(Dollars.fromDecimal(text)));
export const nonNegative = (money: Money.Money) => Effect.suspend(() => Effect.fromResult(Money.nonNegative(money)));
export const add = (a: Money.Money, b: Money.Money) => Effect.suspend(() => Effect.fromResult(Money.add(a, b)));
export const subtract = (a: Money.Money, b: Money.Money) => Effect.suspend(() => Effect.fromResult(Money.subtract(a, b)));
