import { CalculatorCatalogueLive } from "@taxkit/calculators/live";
import { Effect, Layer } from "effect";

import { ApiCalculatorDelivery } from "../src/analytics-request.boundary.js";
import { ApiContentLive } from "../src/content.boundary.js";
import { ApiWorkerApplication } from "../src/worker.application.js";
import { ApiCalculatorsLive } from "../src/worker.composition.js";

// Test hosts deliver no background analytics.
export const ApiCalculatorDeliveryDisabled = Layer.succeed(
  ApiCalculatorDelivery,
  ApiCalculatorDelivery.of({
    recordCalculatorUse: Effect.fn("ApiCalculatorDelivery.recordCalculatorUse")(
      () => Effect.void
    ),
  })
);
// The native application over the production leaves and the API's own
// calculator composition, without background delivery. Admission stays open:
// each test supplies the admission it qualifies.
export const ApiWorkerInit = ApiWorkerApplication.pipe(
  Effect.provide(
    Layer.mergeAll(ApiCalculatorsLive, ApiCalculatorDeliveryDisabled).pipe(
      Layer.provideMerge(
        Layer.mergeAll(ApiContentLive, CalculatorCatalogueLive)
      )
    )
  )
);
