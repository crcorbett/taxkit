import * as Doppler from "alchemy/Doppler";
import * as Secrets from "alchemy/Secrets";
import type { SecretsContext } from "alchemy/Secrets";
import type { StackSecrets } from "alchemy/Stack";
import { Config, ConfigProvider, Effect, Layer, Schema } from "effect";

import { decodeDocsCloudflareStackStage } from "./cloudflare/website.js";

const AppsDopplerSelection = Schema.Struct({
  config: Schema.Literals(["dev", "stg_preview", "prd"]),
  project: Schema.Literal("taxkit"),
});

// The native stage is external Alchemy input. Both secret and resource
// selection restore it through the same existing stage Schema here.
export const nativeAppsStage = (value: typeof Schema.Unknown.Type) =>
  decodeDocsCloudflareStackStage(value);

// Reuse the existing checked prod / pr-N / dev_identity stage owner. Invalid
// stages fail before the native secret provider can request any credentials.
export const nativeAppsDopplerSelection = Effect.fnUntraced(function* (
  stage: string
) {
  const checked = yield* nativeAppsStage(stage).pipe(
    Effect.mapError(
      () =>
        new Config.ConfigError(
          new ConfigProvider.SourceError({
            message: "Native app stack stage is missing or invalid",
          })
        )
    )
  );
  if (checked === "prod") {
    return AppsDopplerSelection.make({ config: "prd", project: "taxkit" });
  }
  return AppsDopplerSelection.make({
    config: checked.startsWith("pr-") ? "stg_preview" : "dev",
    project: "taxkit",
  });
});

export const nativeAppsSecrets = (({ stage }: SecretsContext) => [
  Layer.unwrap(
    nativeAppsDopplerSelection(stage).pipe(
      Effect.map((selection) => Doppler.Secrets(selection).layer)
    )
  ),
  ConfigProvider.layerAdd(
    nativeAppsStage(stage).pipe(
      Effect.map((checked) => {
        // This account's 7 October Worker inventory has no rate-limit
        // namespaces. Reserve 10078 for Production and append each checked
        // PR number for Preview; two stages must never share its counters.
        if (checked === "prod") {
          return ConfigProvider.fromUnknown({
            CALCULATOR_RATE_NAMESPACE: "10078",
          });
        }
        if (checked.startsWith("pr-")) {
          return ConfigProvider.fromUnknown({
            CALCULATOR_RATE_NAMESPACE: `10078${checked.slice(3)}`,
          });
        }
        return ConfigProvider.fromUnknown({});
      })
    ),
    { asPrimary: true }
  ),
  // Native Stack.secrets otherwise appends the shell as its highest priority.
  // Credentials still come through the native provider's credential source;
  // ambient application values cannot override the selected Doppler config.
  Secrets.ProcessEnv({ disabled: true }),
]) satisfies StackSecrets;
