import { CalculatorCatalogueLive } from "@taxkit/calculators/live";
import { TaxKitApiWorker } from "@taxkit/infrastructure/api-worker";
import { ApiHostTelemetryLive } from "@taxkit/observability/host-telemetry";
import { apiWorkerNativeInit, apiWorkerProps } from "api/composition";
import { ApiContentLive } from "api/content";
import { Effect, Layer, Match, Stream } from "effect";
import { Headers, HttpServerResponse } from "effect/http";

// Native fixture entry: the real API composition whose encoded replies send
// one byte, then stall the remaining bytes, to qualify body deadlines.
const FixtureInit = Layer.mergeAll(
  ApiContentLive,
  CalculatorCatalogueLive
).pipe(
  apiWorkerNativeInit,
  Effect.map((application) => ({
    ...application,
    fetch: application.fetch.pipe(
      Effect.map((response) =>
        Match.value(response.body).pipe(
          Match.tag("Uint8Array", ({ body }) =>
            HttpServerResponse.stream(
              Stream.make(body.subarray(0, 1)).pipe(
                Stream.concat(
                  Stream.fromEffect(
                    Effect.logWarning("PRIVATE9 started").pipe(
                      Effect.andThen(Effect.sleep("12 seconds")),
                      Effect.as(body.subarray(1))
                    )
                  )
                ),
                Stream.ensuring(Effect.logInfo("PRIVATE9 released")),
                Stream.provide(ApiHostTelemetryLive)
              ),
              {
                contentType: "application/json",
                headers: Headers.set(
                  Headers.remove(response.headers, "content-length"),
                  "content-encoding",
                  "identity"
                ),
                status: response.status,
              }
            )
          ),
          Match.orElse(() => response)
        )
      )
    ),
  }))
);

export default TaxKitApiWorker.make(
  { ...apiWorkerProps, main: import.meta.url },
  FixtureInit
);
