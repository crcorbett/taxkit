import {
  declareNativeAppsStack,
  NativeAppsHostMode,
} from "@taxkit/infrastructure/apps-stack";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Config, ConfigProvider, Effect } from "effect";

// Local development only: the native Website/API pair in local emulation with
// local state. It cannot select cloud state, Doppler or a deployed stage.
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
    const config = yield* ConfigProvider.ConfigProvider;
    return yield* declareNativeAppsStack.pipe(
      Effect.provideService(NativeAppsHostMode, "local-emulator"),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.orElse(
          // This root can only run in local emulation. This isolated local
          // namespace is neither a cloud reservation nor a Production value.
          ConfigProvider.fromUnknown({ CALCULATOR_RATE_NAMESPACE: "10075" }),
          config
        )
      )
    );
  })
);
