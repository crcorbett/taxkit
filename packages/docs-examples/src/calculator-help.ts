import { TaxKitApi } from "@taxkit/api-http/api";
import { HelpQuery } from "@taxkit/calculators/schemas";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/au/effect";
import { Array, Effect, Option } from "effect";
import { HttpApiClient } from "effect/http-api";
import * as FetchHttpClient from "effect/http/FetchHttpClient";

export const loadCalculatorHelp = (baseUrl: URL) =>
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(TaxKitApi, { baseUrl });
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
export const program = loadCalculatorHelp(
  new URL("http://127.0.0.1:4000")
).pipe(Effect.provide(FetchHttpClient.layer));
