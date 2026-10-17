import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import {
  declareNativeAppsHosts,
  declareNativeAppsInfrastructure,
  NativeProductionZone,
  nativeApiHostProps,
} from "@taxkit/infrastructure/apps-stack";
import { ApiWorkerNativeInit } from "api/worker";
import { Effect } from "effect";

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
