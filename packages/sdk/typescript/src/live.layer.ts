import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationEngineLive } from "@taxkit/core";
import { Layer } from "effect";

// Default in-process composition shared by plain clients and one-shot helpers.
// Caller-owned client hosts and Effect provision own acquisition and release.
export const SdkCalculatorServiceLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);
