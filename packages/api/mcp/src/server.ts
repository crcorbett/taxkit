import { mcpPath } from "@taxkit/api-http/routes";
import { Effect, Layer } from "effect";
import { McpServer } from "effect/ai";

import { TaxKitMcpHandlersLive } from "./handlers.layer.js";
import { TaxKitMcpHost } from "./service.js";
import { TaxKitMcpToolkit } from "./tools.js";

// Origin-less desktop and server clients are admitted; browser pages must be
// served from the publication address. Add another site only for a known need.
export const TaxKitMcpHttpLayer = Layer.unwrap(
  TaxKitMcpHost.pipe(
    Effect.map(({ protocol, publicationOrigin }) =>
      McpServer.toolkit(TaxKitMcpToolkit).pipe(
        Layer.provide(TaxKitMcpHandlersLive),
        Layer.provide(
          McpServer.layerHttp({
            allowedOrigins: [publicationOrigin.origin],
            name: "TaxKit",
            path: mcpPath,
            protocols: [protocol],
            version: "1",
          })
        )
      )
    )
  )
);
