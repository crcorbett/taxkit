import { Effect, Schema } from "effect";
import { AuPayTakeHomeCalculation } from "taxkit/au";
import { calculateReport, decodeInput, TaxKitLive } from "taxkit/effect";

// Decode the selected scenario once; surplus fields fail as well.
export const invalidInput = decodeInput(AuPayTakeHomeCalculation, {
  taxableIncome: 9_000_000,
});
export const validInput = Schema.decodeEffect(
  Schema.fromJsonString(Schema.Unknown)
)(
  '{"grossPay":{"_tag":"Money","cents":165400,"currency":"AUD"},"period":"weekly","taxFreeThresholdClaimed":true}'
).pipe(
  Effect.flatMap((input) => decodeInput(AuPayTakeHomeCalculation, input)),
  Effect.flatMap((input) => calculateReport(AuPayTakeHomeCalculation, input)),
  Effect.provide(TaxKitLive)
);
