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
        getCalculator: Effect.fn("TaxKitRpcClient.getCalculator")((request) =>
          client.GetCalculator({ request, version: CalculatorRpcVersion })
        ),
        getCalculatorGraph: Effect.fn("TaxKitRpcClient.getCalculatorGraph")(
          (request) =>
            client.GetCalculatorGraph({
              request,
              version: CalculatorRpcVersion,
            })
        ),
        getCalculatorSchema: Effect.fn("TaxKitRpcClient.getCalculatorSchema")(
          (request) =>
            client.GetCalculatorSchema({
              request,
              version: CalculatorRpcVersion,
            })
        ),
        listCalculators: Effect.fn("TaxKitRpcClient.listCalculators")((query) =>
          client.ListCalculators({ query, version: CalculatorRpcVersion })
        ),
        listFacts: Effect.fn("TaxKitRpcClient.listFacts")((query) =>
          client.ListFacts({ query, version: CalculatorRpcVersion })
        ),
        listJurisdictions: Effect.fn("TaxKitRpcClient.listJurisdictions")(() =>
          client.ListJurisdictions({ version: CalculatorRpcVersion })
        ),
        listRules: Effect.fn("TaxKitRpcClient.listRules")((query) =>
          client.ListRules({ query, version: CalculatorRpcVersion })
        ),
        listTaxYears: Effect.fn("TaxKitRpcClient.listTaxYears")((query) =>
          client.ListTaxYears({ query, version: CalculatorRpcVersion })
        ),
      })
    )
  )
).pipe(Layer.provide(TaxKitRpcHandlersLive));
