import "@tanstack/react-start/server-only";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { fromCloudflareFetcher } from "alchemy/Cloudflare/Bridge";
import { Effect, Layer } from "effect";
import { HttpClient } from "effect/http";

import { TaxKitWebServerConfig } from "./config.server";
import { WebsitePublicSettings } from "./schemas";
import { WebsiteServerApplication } from "./service.server";

// Layers are selected once at the application root. Expected settings failure
// becomes the service's checked error; unrelated construction defects stay defects.
export const WebsiteServerLive = (
  binding: Parameters<typeof fromCloudflareFetcher>[0]
) =>
  Layer.unwrap(
    TaxKitWebServerConfig(binding).pipe(
      Effect.map((settings) => {
        const fetcher = fromCloudflareFetcher(settings.binding);
        const privateTransport = HttpClient.layerMergedContext(
          Effect.succeed(HttpClient.make((request) => fetcher.fetch(request)))
        );
        return Layer.effect(
          WebsiteServerApplication,
          Effect.map(TaxKitRpcClient, (client) =>
            WebsiteServerApplication.of({
              calculate: client.calculate,
              settings: Effect.succeed(
                WebsitePublicSettings.make({ apiOrigin: settings.apiOrigin })
              ),
            })
          )
        ).pipe(
          Layer.provide(
            TaxKitRpcClientLive(settings.apiOrigin).pipe(
              Layer.provide(privateTransport)
            )
          )
        );
      }),
      Effect.catchTag("TaxKitWebConfigError", (error) =>
        Effect.succeed(
          Layer.succeed(
            WebsiteServerApplication,
            WebsiteServerApplication.of({
              calculate: () => Effect.fail(error),
              settings: Effect.fail(error),
            })
          )
        )
      )
    )
  );
