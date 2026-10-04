import { Effect, Layer } from "effect";
import { RpcTest } from "effect/rpc";

import { TaxKitRpcGroup } from "./group.js";
import { TaxKitRpcHandlersLive } from "./handlers.js";
import { CalculatorRpcVersion } from "./schemas.js";
import { TaxKitRpcClient } from "./service.js";

// Explicit test-only in-process composition. Apps supply the real transport.
export const TaxKitRpcClientTest = Layer.effect(
  TaxKitRpcClient,
  RpcTest.makeClient(TaxKitRpcGroup).pipe(
    Effect.map((client) =>
      TaxKitRpcClient.of({
        calculate: Effect.fn("TaxKitRpcClient.calculate")((request) =>
          client.Calculate({ request, version: CalculatorRpcVersion })
        ),
      })
    )
  )
).pipe(Layer.provide(TaxKitRpcHandlersLive));
