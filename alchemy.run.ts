import * as Cloudflare from "@alchemy.run/cloudflare";
import {
  deploymentSecrets,
  SecretSourceError,
} from "@taxkit/infrastructure/secrets";
import { LocalStage } from "@taxkit/infrastructure/stage";
import * as Alchemy from "alchemy";
import * as Secrets from "alchemy/Secrets";
import {
  Cause,
  ConfigProvider,
  Effect,
  Layer,
  Schema,
  Boolean as EffectBoolean,
} from "effect";

import {
  declareLocalAppsStack,
  declareNativeAppsStack,
} from "./alchemy.apps.js";

const isLocalStage = Schema.is(LocalStage);
// The Website/API pair for every stage. `prod` and `pr-<number>` use cloud
// state and Doppler; a `dev_*` stage runs only under `alchemy dev`, in local
// emulation with local state, no Doppler and no `.env`. Its dev flag comes from Alchemy’s
// command context, without enabling shell secrets. The stack
// name and resource IDs are the existing state identity; do not rename them.
export default Alchemy.Stack(
  "TaxKitAppsCloudflare",
  {
    providers: Cloudflare.providers(),
    secrets: (context) =>
      EffectBoolean.match(isLocalStage(context.stage), {
        onFalse: () => deploymentSecrets,
        onTrue: () => [
          Secrets.ProcessEnv({ disabled: true }),
          ConfigProvider.layerAdd(
            ConfigProvider.fromUnknown({
              ALCHEMY_DEV: context.alchemyContext.dev,
            }),
            { asPrimary: true }
          ).pipe(
            Layer.catchCause((cause) =>
              Layer.effectDiscard(
                Effect.failCause(
                  cause.pipe(
                    Cause.map(
                      () => new SecretSourceError({ source: "configuration" })
                    )
                  )
                )
              )
            )
          ),
        ],
      }),
    state: Layer.unwrap(
      Alchemy.Stage.pipe(
        Effect.map((stage) =>
          EffectBoolean.match(isLocalStage(stage), {
            onFalse: () => Cloudflare.state(),
            onTrue: () => Alchemy.localState(),
          })
        )
      )
    ),
  },
  Alchemy.Stage.pipe(
    Effect.flatMap((stage) =>
      EffectBoolean.match(isLocalStage(stage), {
        onFalse: () => declareNativeAppsStack,
        onTrue: () => declareLocalAppsStack,
      })
    )
  )
);
