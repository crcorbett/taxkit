import * as Cloudflare from "@alchemy.run/cloudflare";
import { deploymentSecrets } from "@taxkit/infrastructure/secrets";
import { LocalStage } from "@taxkit/infrastructure/stage";
import * as Alchemy from "alchemy";
import * as Secrets from "alchemy/Secrets";
import { Effect, Layer, Schema } from "effect";

import {
  declareLocalAppsStack,
  declareNativeAppsStack,
} from "./alchemy.apps.js";

const isLocalStage = Schema.is(LocalStage);

// The Website/API pair for every stage. `prod` and `pr-<number>` use cloud
// state and Doppler; a `dev_*` stage runs only under `alchemy dev`, in local
// emulation with local state, no Doppler and no `.env`. It reads only the
// shell, where `alchemy dev` sets its own values. The stack
// name and resource IDs are the existing state identity; do not rename them.
export default Alchemy.Stack(
  "TaxKitAppsCloudflare",
  {
    providers: Cloudflare.providers(),
    secrets: (context) =>
      isLocalStage(context.stage)
        ? [Secrets.ProcessEnv()]
        : deploymentSecrets(context),
    state: Layer.unwrap(
      Alchemy.Stage.pipe(
        Effect.map((stage) =>
          isLocalStage(stage) ? Alchemy.localState() : Cloudflare.state()
        )
      )
    ),
  },
  Alchemy.Stage.pipe(
    Effect.flatMap((stage) =>
      isLocalStage(stage) ? declareLocalAppsStack : declareNativeAppsStack
    )
  )
);
