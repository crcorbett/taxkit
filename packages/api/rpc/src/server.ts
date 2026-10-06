import { Layer } from "effect";
import { RpcServer } from "effect/rpc";

import { DocsRpcHandlersLive } from "./content.handlers.js";
import { TaxKitPublicRpcGroup } from "./group.js";
import { TaxKitRpcHandlersLive } from "./handlers.js";
import { TaxKitRpcServerSerialization } from "./server-serialization.boundary.js";

// Native HTTP POST is explicit: the library's layerHttp default is WebSocket.
export const TaxKitRpcHttpLayer = RpcServer.layerHttp({
  disableTracing: true,
  group: TaxKitPublicRpcGroup,
  path: "/rpc",
  protocol: "http",
}).pipe(
  Layer.provide([
    TaxKitRpcHandlersLive,
    DocsRpcHandlersLive,
    TaxKitRpcServerSerialization,
  ])
);
