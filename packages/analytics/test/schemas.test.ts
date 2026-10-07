import { expect, it } from "@effect/vitest";
import {
  ConfigProvider,
  Effect,
  Match,
  Redacted,
  Result,
  Schema,
} from "effect";

import { AnalyticsSettingsConfig } from "../src/config.js";
import { AnalyticsConfigurationError } from "../src/errors.js";
import { AnalyticsDisabled } from "../src/schemas.js";

const enabled = {
  POSTHOG_CAPTURE_TOKEN: "phc_synthetic_taxkit_capture_fixture_only",
  POSTHOG_COLLECTION_MODE: "production",
  POSTHOG_PROJECT_ID: "123",
  POSTHOG_REGION: "us",
  POSTHOG_STAGE: "prod",
} as const;

it.effect.each([
  {},
  { POSTHOG_COLLECTION_MODE: "off" },
  {
    POSTHOG_CAPTURE_TOKEN: "invalid-and-unused",
    POSTHOG_COLLECTION_MODE: "off",
  },
])(
  "deliberately disabled configuration does not require capture settings %j",
  (input) =>
    Effect.gen(function* () {
      expect(
        yield* AnalyticsSettingsConfig.pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromUnknown(input)
          )
        )
      ).toEqual(AnalyticsDisabled.make({}));
    })
);

it.effect.each([
  enabled,
  {
    ...enabled,
    POSTHOG_COLLECTION_MODE: "controlled-preview",
    POSTHOG_STAGE: "pr-163",
  },
])(
  "reads checked enabled settings and keeps the capture token redacted %j",
  (input) =>
    Effect.gen(function* () {
      const settings = yield* AnalyticsSettingsConfig.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown(input)
        )
      );
      expect(settings._tag).toBe("AnalyticsEnabled");
      Match.value(settings).pipe(
        Match.tag("AnalyticsDisabled", () =>
          expect.fail("Enabled settings were disabled")
        ),
        Match.tag("AnalyticsEnabled", (value) => {
          expect(value.projectId).toBe(123);
          expect(value.stage).toBe(input.POSTHOG_STAGE);
          expect(Redacted.isRedacted(value.token)).toBe(true);
          expect(String(value.token)).not.toContain(
            input.POSTHOG_CAPTURE_TOKEN
          );
        }),
        Match.exhaustive
      );
    })
);

it.effect.each([
  { POSTHOG_COLLECTION_MODE: "production" },
  { ...enabled, POSTHOG_COLLECTION_MODE: "automatic" },
  { ...enabled, POSTHOG_PROJECT_ID: "0" },
  { ...enabled, POSTHOG_PROJECT_ID: "1.5" },
  { ...enabled, POSTHOG_REGION: "eu" },
  { ...enabled, POSTHOG_STAGE: "pr-163" },
  { ...enabled, POSTHOG_COLLECTION_MODE: "controlled-preview" },
  { ...enabled, POSTHOG_STAGE: "dev" },
  { ...enabled, POSTHOG_CAPTURE_TOKEN: "phx_private-management-token" },
])("invalid enabled settings are a safe configuration failure %j", (input) =>
  Effect.gen(function* () {
    const result = yield* AnalyticsSettingsConfig.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown(input)
      ),
      Effect.result
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(Schema.is(AnalyticsConfigurationError)(result.failure)).toBe(true);
      expect(
        yield* Schema.encodeEffect(
          Schema.fromJsonString(AnalyticsConfigurationError)
        )(result.failure)
      ).toBe('{"_tag":"AnalyticsConfigurationError","operation":"configure"}');
    }
  })
);
