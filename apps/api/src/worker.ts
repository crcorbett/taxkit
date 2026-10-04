import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationEngineLive } from "@taxkit/core";
import { Worker } from "alchemy/Cloudflare/Workers";
import type { HttpEffect } from "alchemy/Http";
import { Effect, Layer } from "effect";

import { ApiWorkerApplication } from "./worker.application.js";

export const ApiWorkerInit = ApiWorkerApplication.pipe(
  Effect.provide(
    PublicCalculatorServiceLive.pipe(Layer.provide(CalculationEngineLive))
  )
);

export class TaxKitApiWorker extends Worker<
  TaxKitApiWorker,
  { readonly fetch: HttpEffect }
>()("TaxKitApi") {}

export default TaxKitApiWorker.make(
  {
    compatibility: {
      date: "2026-10-04",
      flags: ["nodejs_compat"],
    },
    env: { API_PUBLIC_ORIGIN: Worker.URL },
    main: import.meta.url,
    workersDev: true,
  },
  ApiWorkerInit
);
