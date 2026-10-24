import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import {
  declareNativeAppsHosts,
  declareNativeAppsInfrastructure,
  NativeAppsHostMode,
  NativeProductionZone,
  nativeApiHostProps,
} from "@taxkit/infrastructure/apps-stack";
import * as Alchemy from "alchemy";
import { ApiWorkerNativeInit } from "api/worker";
import { Config, ConfigProvider, Effect } from "effect";

// Root composition is the only owner joining deployment resources and the app.
export const declareNativeAppsStack = Effect.gen(function* () {
  const zone = yield* declareNativeAppsInfrastructure;
  return yield* declareNativeAppsHosts.pipe(
    Effect.provide(
      TaxKitApiWorker.make(
        nativeApiHostProps.pipe(
          Effect.map((props) => ({
            ...props,
            main: import.meta.resolve("api/worker"),
          }))
        ),
        ApiWorkerNativeInit
      )
    ),
    Effect.provideService(NativeProductionZone, zone)
  );
});

// Local development: the same pair under `alchemy dev` in local emulation. It
// refuses any other command, provider mode or stage before declaring anything.
export const declareLocalAppsStack = Effect.gen(function* () {
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
        // This isolated local namespace is neither a cloud reservation nor a
        // Production value.
        ConfigProvider.fromUnknown({ CALCULATOR_RATE_NAMESPACE: "10075" }),
        config
      )
    )
  );
});
