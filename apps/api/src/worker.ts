import { NodeCrypto } from "@effect/platform-node";
import { BackendAnalyticsLive } from "@taxkit/analytics/live";
import { PublicCalculatorServiceRateLimited } from "@taxkit/calculators/admission.layer";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
import { CalculationEngineLive } from "@taxkit/core";
import { RateLimitBinding, Worker, cache } from "alchemy/Cloudflare/Workers";
import type { InferEnv } from "alchemy/Cloudflare/Workers";
import type { HttpEffect } from "alchemy/Http";
import { Config, ConfigProvider, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { ApiCalculatorDeliveryLive } from "./analytics-request.boundary.js";
import { ApiCalculatorAnalyticsLive } from "./calculator-analytics.layer.js";
import { ApiContentLive } from "./content.boundary.js";
import { McpSessionHostLive } from "./mcp-session.layer.js";
import { ApiCalculatorAdmission } from "./worker-admission.layer.js";
import { ApiWorkerApplication } from "./worker.application.js";

export { CalculatorHostMode } from "./edge-identity.boundary.js";

// Platform invocation records and automatic traces include URLs outside the
// fixed app logger. Every stage but Production keeps the platform channels
// off; the infrastructure graph gives Production checked console logs only.
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

const ApiWorkerServicesLive = Layer.merge(
  ApiContentLive,
  ApiCalculatorAnalyticsLive.pipe(
    Layer.provide(
      PublicCalculatorServiceBounded.pipe(
        Layer.provide(
          PublicCalculatorServiceRateLimited.pipe(
            Layer.provide(PublicCalculatorServiceLive)
          )
        ),
        Layer.provide(CalculationEngineLive)
      )
    )
  )
);

const ApiAnalyticsLive = ApiCalculatorDeliveryLive.pipe(
  Layer.provide(
    BackendAnalyticsLive.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(NodeCrypto.layer)
    )
  )
);

export const ApiWorkerInit = ApiWorkerApplication.pipe(
  Effect.provide(ApiWorkerServicesLive)
);

export const ApiWorkerNativeInit = Effect.gen(function* () {
  // Native Workers Cache, scoped to this deployed version. Response headers
  // decide which public replies Cloudflare may reuse.
  yield* cache({ crossVersionCache: false });
  return yield* ApiWorkerApplication;
}).pipe(
  Effect.provide(
    McpSessionHostLive.pipe(Layer.provideMerge(ApiWorkerServicesLive))
  ),
  Effect.provide(ApiAnalyticsLive),
  Effect.provide(ApiCalculatorAdmission.pipe(Layer.provide(RateLimitBinding))),
  Effect.catchTag("AnalyticsConfigurationError", () =>
    Effect.fail(
      new Config.ConfigError(
        new ConfigProvider.SourceError({
          message: "PostHog analytics configuration is missing or invalid.",
        })
      )
    )
  )
);

export class TaxKitApiWorker extends Worker<
  TaxKitApiWorker,
  {
    readonly fetch: HttpEffect;
    readonly calculatorRequest: Effect.Success<
      typeof ApiWorkerApplication
    >["calculatorRequest"];
  }
>()("TaxKitApi") {}

export type TaxKitApiBinding = InferEnv<{
  readonly TAXKIT_API: typeof TaxKitApiWorker;
}>["TAXKIT_API"];

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
  ApiWorkerNativeInit
);
