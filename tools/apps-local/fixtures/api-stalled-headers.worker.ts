import { CalculatorCatalogueLive } from "@taxkit/calculators/live";
import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import { ApiHostTelemetryLive } from "@taxkit/observability/host-telemetry";
import { apiWorkerNativeInit, apiWorkerProps } from "api/composition";
import { ApiContentLive } from "api/content";
import { Effect, Layer } from "effect";

// Native fixture entry: the real API composition whose replies stall before
// their headers, to qualify header deadlines.
const FixtureInit = Layer.mergeAll(
  ApiContentLive,
  CalculatorCatalogueLive
).pipe(
  apiWorkerNativeInit,
  Effect.map((application) => ({
    ...application,
    fetch: application.fetch.pipe(
      Effect.flatMap((response) =>
        Effect.logWarning("PRIVATE9 headers").pipe(
          Effect.andThen(Effect.sleep("12 seconds")),
          Effect.as(response),
          Effect.provide(ApiHostTelemetryLive)
        )
      )
    ),
  }))
);

export default TaxKitApiWorker.make(
  { ...apiWorkerProps, main: import.meta.url },
  FixtureInit
);
