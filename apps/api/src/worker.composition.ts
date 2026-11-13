import {
  RateLimitBinding,
  Worker,
  cache,
} from "@alchemy.run/cloudflare/Workers";
import { ApiCalculatorUsageLive } from "@taxkit/analytics/api-usage";
import { BackendAnalyticsLive } from "@taxkit/analytics/live";
import type { CalculatorCatalogue } from "@taxkit/calculators/service";
import { PublicCalculatorServiceRateLimited } from "@taxkit/calculators/work";
import type { DocsSourceError } from "@taxkit/content/errors";
import type {
  ContentCatalogue,
  ContentService,
  DocsOgImages,
} from "@taxkit/content/service";
import {
  disabledWorkerObservability,
  workerCompatibility,
} from "@taxkit/infrastructure/worker-settings";
import { Config, ConfigProvider, Effect, Layer, Match } from "effect";
import { SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { ApiCalculatorDeliveryLive } from "./analytics-request.boundary.js";
import { ApiWorkerStartupError } from "./schemas.js";
import {
  ApiCalculatorAdmission,
  ApiCalculatorRequestRateKey,
} from "./worker-admission.layer.js";
import { ApiWorkerApplication } from "./worker.application.js";

/** The native Worker's declaration; an entry module adds its own `main`. */
export const apiWorkerProps = {
  compatibility: workerCompatibility,
  env: { API_PUBLIC_ORIGIN: Worker.URL },
  observability: disabledWorkerObservability,
  workersDev: true,
} as const;

/**
 * The replaceable leaves of the native API: authored content and the
 * calculator catalogue. The production entry supplies the built catalogue and
 * the static calculators; a local fixture entry supplies controlled ones.
 */
export type ApiWorkerLeaves =
  | CalculatorCatalogue
  | ContentCatalogue
  | ContentService
  | DocsOgImages;

// One public calculator implementation: the native request identity and the
// shared work budget over a catalogue and admission, with analytics observing
// each success. The native init supplies the platform rate limiter.
export const ApiCalculatorsLive = PublicCalculatorServiceRateLimited.pipe(
  Layer.provide(ApiCalculatorUsageLive),
  Layer.provide(ApiCalculatorRequestRateKey)
);
const ApiAnalyticsLive = ApiCalculatorDeliveryLive.pipe(
  Layer.provide(
    BackendAnalyticsLive.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(SecureRandom.layerWebCrypto)
    )
  )
);

/**
 * The API Worker's one composition seam. It runs the application over the
 * supplied leaves with the native cache, admission and analytics. Every
 * construction failure becomes one `ApiWorkerStartupError` with a closed
 * reason; the native host contract then requires a `ConfigError`, which
 * carries only that reason's fixed message.
 */
export const apiWorkerNativeInit = <R>(
  leaves: Layer.Layer<ApiWorkerLeaves, DocsSourceError, R>
) =>
  Effect.gen(function* () {
    // Native Workers Cache, scoped to this deployed version. Response headers
    // decide which public replies Cloudflare may reuse.
    yield* cache({ crossVersionCache: false });
    return yield* ApiWorkerApplication;
  }).pipe(
    Effect.provide(
      Layer.mergeAll(ApiCalculatorsLive, ApiAnalyticsLive).pipe(
        Layer.provide(
          ApiCalculatorAdmission.pipe(Layer.provide(RateLimitBinding))
        ),
        Layer.provideMerge(leaves)
      )
    ),
    Effect.catchTags({
      AnalyticsConfigurationError: () =>
        Effect.fail(
          new ApiWorkerStartupError({ reason: "analytics-settings" })
        ),
      ConfigError: () =>
        Effect.fail(new ApiWorkerStartupError({ reason: "host-settings" })),
      DocsSourceError: () =>
        Effect.fail(new ApiWorkerStartupError({ reason: "docs-catalogue" })),
    }),
    Effect.catchTag("ApiWorkerStartupError", ({ reason }) =>
      Effect.fail(
        new Config.ConfigError(
          new ConfigProvider.SourceError({
            message: Match.value(reason).pipe(
              Match.when(
                "analytics-settings",
                () => "PostHog analytics configuration is missing or invalid."
              ),
              Match.when(
                "docs-catalogue",
                () => "The public documentation catalogue could not be loaded."
              ),
              Match.when(
                "host-settings",
                () => "API Worker host settings are missing or invalid."
              ),
              Match.exhaustive
            ),
          })
        )
      )
    )
  );
