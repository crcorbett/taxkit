import "@tanstack/react-start/server-only";
import { CalculatorHostTelemetryLive } from "@taxkit/api-rpc/host-telemetry";
import { env } from "cloudflare:workers";
import { ConfigProvider, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/http";

import { WebsiteAnalyticsRelayLive } from "./analytics/relay/relay.adapter.layer";
import { WebsiteServerLive } from "./live.server.layer";

// One server runner per loaded Worker module. Each incoming server function
// supplies its request signal; no request constructs a Layer or another runner.
export const appRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    WebsiteServerLive(env.TAXKIT_API).pipe(
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))
    ),
    CalculatorHostTelemetryLive("website"),
    WebsiteAnalyticsRelayLive.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))
    )
  )
);
