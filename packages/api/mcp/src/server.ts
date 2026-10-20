import { mcpPath } from "@taxkit/api-http/routes";
import { DocsPublicationOriginConfig } from "@taxkit/content/config";
import { Effect, Layer } from "effect";
import { McpProtocol, McpServer } from "effect/ai";

import { TaxKitMcpHandlersLive } from "./handlers.layer.js";
import { TaxKitMcpToolkit } from "./tools.js";

// Origin-less desktop and server clients are admitted; browser pages must be
// served from the publication address. Add another site only for a known need.
export const TaxKitMcpHttpLayer = Layer.unwrap(
  DocsPublicationOriginConfig.pipe(
    Effect.map((publicationOrigin) =>
      McpServer.toolkit(TaxKitMcpToolkit).pipe(
        Layer.provide(TaxKitMcpHandlersLive),
        Layer.provide(
          McpServer.layerHttpRequestScoped({
            allowedOrigins: [publicationOrigin.origin],
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
