import { declareNativeAppsStack } from "@taxkit/infrastructure/apps-stack";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Config, ConfigProvider, Effect } from "effect";

// This root owns disposable local app development only. It cannot select the
// cloud app stack, Doppler configuration or Cloudflare state store.
export default Alchemy.Stack(
  "TaxKitAppsLocal",
  {
    providers: Cloudflare.providers(),
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const context = yield* Alchemy.AlchemyContext;
    const stage = yield* Alchemy.Stage;
    const dev = yield* Alchemy.ALCHEMY_DEV;
    const mode = yield* Alchemy.ProviderMode.defaultProviderMode;
    if (
      !context.dev ||
      !dev ||
      mode !== "local" ||
      (stage !== "dev_native_apps" && stage !== "dev_native_apps_proof")
    ) {
      return yield* Effect.fail(
        new Config.ConfigError(
          new ConfigProvider.SourceError({
            message:
              "Native local apps require alchemy dev at stage dev_native_apps",
          })
        )
      );
    }
    return yield* declareNativeAppsStack;
  })
);
