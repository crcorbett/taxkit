import { Schema } from "effect";

// This identity belongs only to anonymous work admission. It cannot be
// serialised as a report, RPC payload, telemetry value or visitor identifier.
export const CalculatorClientRateKey = Schema.RedactedFromValue(
  Schema.IpAddressFromString.pipe(
    Schema.brand("@taxkit/calculators/CalculatorClientRateKey")
  ),
  { disallowEncode: true, label: "CalculatorClientRateKey" }
);
export type CalculatorClientRateKey = typeof CalculatorClientRateKey.Type;
