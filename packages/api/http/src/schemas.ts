import { Schema } from "effect";

import {
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "./errors.js";

export const CalculatorRequestBodyErrorEnvelope = Schema.Struct({
  error: Schema.Union([
    CalculatorRequestBodyTooLarge,
    CalculatorRequestBodyTimedOut,
  ]),
});

export const CalculatorRequestBodyPolicy = Schema.Struct({
  responseFormat: Schema.Literals(["json", "html"]),
});
export type CalculatorRequestBodyPolicy =
  typeof CalculatorRequestBodyPolicy.Type;
