import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationEngineLive } from "@taxkit/core";
import { Worker } from "alchemy/Cloudflare/Workers";
import type { HttpEffect } from "alchemy/Http";
import { Effect, Layer } from "effect";

import { ApiWorkerApplication } from "./worker.application.js";

// Platform invocation records include URLs outside the fixed app logger.
// Keep the platform channels off until their exported fields are qualified.
export const ApiWorkerObservability = {
  enabled: false,
  headSamplingRate: 0,
  logs: {
    enabled: false,
    headSamplingRate: 0,
    invocationLogs: false,
    persist: false,
  },
  traces: { enabled: false, headSamplingRate: 0, persist: false },
} as const;

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
    observability: ApiWorkerObservability,
    workersDev: true,
  },
  ApiWorkerInit
);
