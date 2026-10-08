import { ConfigProvider, Effect, Schema } from "effect";

import { AnalyticsSettingsConfig } from "../config.js";
import { AnalyticsDisabled, CalculatorUse } from "../schemas.js";

export const productionAnalyticsFixture = AnalyticsSettingsConfig.pipe(
  Effect.provideService(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromUnknown({
      POSTHOG_CAPTURE_TOKEN: "phc_synthetic_taxkit_capture_fixture_only",
      POSTHOG_COLLECTION_MODE: "production",
      POSTHOG_PROJECT_ID: "123",
      POSTHOG_REGION: "us",
      POSTHOG_STAGE: "prod",
    })
  )
);
export const calculatorUseFixture = Schema.decodeEffect(CalculatorUse)({
  calculatorId: "au.pay.take-home",
  calculatorName: "AU take-home pay",
  collectionPolicy: "allow",
});
export const disabledAnalyticsFixture = Effect.succeed(
  AnalyticsDisabled.make({})
);
