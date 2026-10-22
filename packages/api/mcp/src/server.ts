import { mcpPath } from "@taxkit/api-http/routes";
import { DocsWebsiteOriginConfig } from "@taxkit/content/config";
import { Effect, Layer } from "effect";
import { McpProtocol, McpServer } from "effect/ai";

import { TaxKitMcpHandlersLive } from "./handlers.layer.js";
import { TaxKitMcpToolkit } from "./tools.js";

// Origin-less desktop and server clients are admitted; browser pages must be
// served from this stage's Website. Add another site only for a known need.
export const TaxKitMcpHttpLayer = Layer.unwrap(
  DocsWebsiteOriginConfig.pipe(
    Effect.map((websiteOrigin) =>
      McpServer.toolkit(TaxKitMcpToolkit).pipe(
        Layer.provide(TaxKitMcpHandlersLive),
        Layer.provide(
          McpServer.layerHttpRequestScoped({
            allowedOrigins: [websiteOrigin.origin],
            name: "TaxKit",
            path: mcpPath,
            protocols: [McpProtocol.v2026_07_28],
            version: "1",
          })
        )
      )
    )
  )
);
