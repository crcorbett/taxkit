import { expect, it } from "@effect/vitest";
import {
  Predicate,
  Function as EffectFunction,
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
      ).toStrictEqual(AnalyticsDisabled.make({}));
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
      EffectFunction.pipe(
        Predicate.isTagged(settings, "AnalyticsEnabled"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      Match.value(settings).pipe(
        Match.tag("AnalyticsDisabled", () =>
          expect.fail("Enabled settings were disabled")
        ),
        Match.tag("AnalyticsEnabled", (value) => {
          expect(value.projectId).toBe(123);
          expect(value.stage).toBe(input.POSTHOG_STAGE);
          EffectFunction.pipe(Redacted.isRedacted(value.token), (actual) => {
            expect(actual).toBeTruthy();
          });
          // oxlint-disable-next-line typescript/no-base-to-string -- Verify that implicit string conversion cannot reveal the secret.
          EffectFunction.pipe(String(value.token), (actual) => {
            expect(actual).not.toContain(input.POSTHOG_CAPTURE_TOKEN);
          });
        }),
        // oxlint-disable-next-line typescript/strict-void-return -- Effect Match terminal preserves the assertion callbacks; its generic host signature uses any.
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
  {
    ...enabled,
    POSTHOG_COLLECTION_MODE: "controlled-preview",
    POSTHOG_STAGE: "pr-10000000",
  },
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
    EffectFunction.pipe(Result.isFailure(result), (actual) => {
      expect(actual).toBeTruthy();
    });
    if (Result.isFailure(result)) {
      EffectFunction.pipe(
        Schema.is(AnalyticsConfigurationError)(result.failure),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
      expect(
        yield* Schema.encodeEffect(
          Schema.fromJsonString(AnalyticsConfigurationError)
        )(result.failure)
      ).toBe('{"_tag":"AnalyticsConfigurationError","operation":"configure"}');
    }
  })
);
