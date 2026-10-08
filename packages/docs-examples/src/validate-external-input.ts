import { au } from "@taxkit/sdk/au";
import { Effect, Schema } from "effect";

// Check an external JSON representation before calling a typed calculator.
export const invalidInput = Schema.decodeEffect(
  Schema.fromJsonString(au.calculations.takeHomePay.inputSchema)
)('{"taxableIncome":{"_tag":"Money","cents":9000000,"currency":"AUD"}}');

export const validInput = Schema.decodeEffect(
  Schema.fromJsonString(au.calculations.takeHomePay.inputSchema)
)(
  '{"grossPay":{"_tag":"GrossPay","amount":{"_tag":"Money","cents":165400,"currency":"AUD"},"period":"weekly"},"taxFreeThresholdClaimed":true}'
).pipe(
  Effect.flatMap((input) => Effect.promise(() => au.pay.takeHomePay(input)))
);
