import * as Doppler from "@alchemy.run/doppler";
import { PullRequestStage } from "@taxkit/observability/stage";
import * as Secrets from "alchemy/Secrets";
import type { SecretsContext } from "alchemy/Secrets";
import type { StackSecrets } from "alchemy/Stack";
import { Config, ConfigProvider, Effect, Layer, Match, Schema } from "effect";

import { AppStage } from "./stage.js";

/** The TaxKit Doppler config that holds a stage's values. */
export const dopplerConfig = (stage: AppStage) =>
  Match.value(stage).pipe(
    Match.when("prod", () => "prd" as const),
    Match.when(Schema.is(PullRequestStage), () => "stg_preview" as const),
    Match.orElse(() => "dev" as const)
  );

// The stage is Alchemy input. An invalid stage fails before any provider asks
// for credentials or reads a secret.
export const checkedStage = (stage: string) =>
  Schema.decodeUnknownEffect(AppStage)(stage).pipe(
    Effect.mapError(
      () =>
        new Config.ConfigError(
          new ConfigProvider.SourceError({
            message: "The TaxKit stage name is not supported",
          })
        )
    )
  );

/**
 * Native sources for the app stack, in precedence order: Doppler for the
 * stage, the calculator rate namespace, an ignored `.env`, and never the shell.
 * Doppler `prd`, `stg_preview` and `dev` hold each stage's Cloudflare values.
 */
export const deploymentSecrets = (({ stage }: SecretsContext) => [
  Layer.unwrap(
    checkedStage(stage).pipe(
      Effect.map(
        (checked) =>
          Doppler.Secrets({ config: dopplerConfig(checked), project: "taxkit" })
            .layer
      )
    )
  ),
  // Each deployed stage owns its own rate-limit counters. Production uses
  // 10078 and Preview appends its pull-request number.
  ConfigProvider.layerAdd(
    checkedStage(stage).pipe(
      Effect.map((checked) =>
        Match.value(checked).pipe(
          Match.when("prod", () =>
            ConfigProvider.fromUnknown({ CALCULATOR_RATE_NAMESPACE: "10078" })
          ),
          Match.when(Schema.is(PullRequestStage), (preview) =>
            ConfigProvider.fromUnknown({
              CALCULATOR_RATE_NAMESPACE: `10078${preview.slice(3)}`,
            })
          ),
          Match.orElse(() => ConfigProvider.fromUnknown({}))
        )
      )
    ),
    { asPrimary: true }
  ),
  Secrets.DotEnv().layer,
  Secrets.ProcessEnv({ disabled: true }),
]) satisfies StackSecrets;
