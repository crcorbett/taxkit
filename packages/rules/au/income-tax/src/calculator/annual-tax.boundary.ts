import { Effect, Layer, Schema } from "effect";

import {
  AnnualTaxScenarioInputSchema,
  AnnualTaxScenarioLiveFromInput,
} from "./annual-tax.js";

/**
 * Builds the public unknown-input scenario boundary for annual taxable income.
 *
 * @param input - Unknown input decoded by `AnnualTaxScenarioInputSchema`.
 * @returns A layer providing `AnnualTaxableIncomeFact`.
 * @since 0.1.0
 */
export const AnnualTaxScenarioLive = (input: unknown) =>
  Layer.unwrap(
    Schema.decodeUnknownEffect(AnnualTaxScenarioInputSchema)(input).pipe(
      Effect.map(AnnualTaxScenarioLiveFromInput)
    )
  );
