import { Effect, Option } from "effect";
import { HttpApiClient } from "effect/http-api";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { AuPayTakeHomeCalculation } from "taxkit/au/effect";
import { TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { TaxKitApi } from "taxkit/http";
import { fromCents, nonNegative } from "taxkit/money/effect";

export const calculateTakeHomePay = (baseUrl: URL) =>
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(TaxKitApi, { baseUrl });
    const amount = yield* fromCents(346_200).pipe(Effect.flatMap(nonNegative));
    return yield* client.calculatorApi.calculate({
      params: { calculatorId: AuPayTakeHomeCalculation.calculatorId },
      payload: {
        calculatorId: AuPayTakeHomeCalculation.calculatorId,

        payload: {
          facts: TakeHomeScenarioInputSchema.make({
            grossPay: amount,
            period: "fortnightly",
            taxFreeThresholdClaimed: true,
          }),
          jurisdiction: Option.some(AuPayTakeHomeCalculation.jurisdiction),
          taxYear: Option.some(AuPayTakeHomeCalculation.taxYear),
        },
      },
    });
  }).pipe(Effect.provide(FetchHttpClient.layer));
