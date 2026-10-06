import { TaxKitHttpApiService } from "@taxkit/api-http/client";
import { createTaxKitApiClientLayer } from "@taxkit/api-http/client/live";
import { HelpQuery } from "@taxkit/calculators/schemas";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/au/effect";
import { Array, Effect, Layer, Option } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";

export const loadCalculatorHelp = Effect.gen(function* () {
  const client = yield* TaxKitHttpApiService;
  const query = yield* HelpQuery.makeEffect({
    help: Option.some(Option.some("schema")),
  });
  const schema = yield* client.calculatorApi.getCalculatorSchema({
    params: { calculatorId: AuPayTakeHomeCalculation.calculatorId },
    query,
  });
  return Array.map(schema.inputFacts, (fact) => `${fact.id}: ${fact.title}`);
});

// Your application supplies the public API origin and owns Effect execution.
export const program = loadCalculatorHelp.pipe(
  Effect.provide(
    createTaxKitApiClientLayer({ baseUrl: "http://127.0.0.1:4000" }).pipe(
      Layer.provide(FetchHttpClient.layer)
    )
  )
);
