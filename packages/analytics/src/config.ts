import { Config, Effect, Match, Schema } from "effect";

import { AnalyticsConfigurationError } from "./errors.js";
import type { AnalyticsSettings } from "./schemas.js";
import { AnalyticsDisabled, AnalyticsEnabled } from "./schemas.js";

// Off is a deliberate mode. Missing or malformed enabled settings have a
// separate failure; no token is acquired by the disabled branch.
export const AnalyticsSettingsConfig: Effect.Effect<
  AnalyticsSettings,
  AnalyticsConfigurationError
> = Config.schema(
  Schema.Literals(["off", "production", "controlled-preview"]),
  "POSTHOG_COLLECTION_MODE"
).pipe(
  Config.withDefault("off"),
  Effect.flatMap((mode) =>
    Match.value(mode).pipe(
      Match.when("off", () => Effect.succeed(AnalyticsDisabled.make({}))),
      Match.orElse((environment) =>
        Effect.all({
          projectId: Config.schema(
            AnalyticsEnabled.fields.projectId,
            "POSTHOG_PROJECT_ID"
          ),
          region: Config.schema(
            AnalyticsEnabled.fields.region,
            "POSTHOG_REGION"
          ),
          stage: Config.schema(AnalyticsEnabled.fields.stage, "POSTHOG_STAGE"),
          token: Config.schema(
            AnalyticsEnabled.fields.token,
            "POSTHOG_CAPTURE_TOKEN"
          ),
        }).pipe(
          Effect.flatMap((settings) =>
            AnalyticsEnabled.makeEffect({
              environment,
              ...settings,
            })
          )
        )
      )
    )
  ),
  Effect.mapError(
    () => new AnalyticsConfigurationError({ operation: "configure" })
  )
);
