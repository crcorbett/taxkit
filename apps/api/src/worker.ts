import { NodeCrypto } from "@effect/platform-node";
import { ApiCalculatorAnalyticsLive } from "@taxkit/analytics/api-usage";
import { BackendAnalyticsLive } from "@taxkit/analytics/live";
import { PublicCalculatorServiceRateLimited } from "@taxkit/calculators/admission.layer";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
import { CalculationEngineLive } from "@taxkit/core";
import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import {
  disabledWorkerObservability,
  workerCompatibility,
} from "@taxkit/infrastructure/worker-settings";
import { RateLimitBinding, Worker, cache } from "alchemy/Cloudflare/Workers";
import { Config, ConfigProvider, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { ApiCalculatorDeliveryLive } from "./analytics-request.boundary.js";
import { ApiContentLive } from "./content.boundary.js";
import { ApiCalculatorAdmission } from "./worker-admission.layer.js";
import { ApiWorkerApplication } from "./worker.application.js";

const ApiWorkerServicesLive = Layer.mergeAll(
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
  Effect.provide(ApiWorkerServicesLive),
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
  ),
  Effect.catchTag("DocsSourceError", () =>
    Effect.fail(
      new Config.ConfigError(
        new ConfigProvider.SourceError({
          message: "The public documentation catalogue could not be loaded.",
        })
      )
    )
  )
);

export default TaxKitApiWorker.make(
  {
    compatibility: workerCompatibility,
    env: { API_PUBLIC_ORIGIN: Worker.URL },
    main: import.meta.url,
    observability: disabledWorkerObservability,
    workersDev: true,
  },
  ApiWorkerNativeInit
);
