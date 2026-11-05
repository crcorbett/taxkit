import { Effect, Option } from "effect";
import { HttpApiClient } from "effect/http-api";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import {
  TakeHomeScenarioInputSchema,
  AuPayTakeHomeId,
  AuPayJurisdiction,
  AuPayTaxYear,
} from "taxkit/au/schemas";
import { TaxKitApi } from "taxkit/http";
import { fromCents, nonNegative } from "taxkit/money/effect";

export const calculateTakeHomePay = (baseUrl: URL) =>
  Effect.gen(function* () {
    const calculatorId = AuPayTakeHomeId.make("au.pay.take-home");
    const client = yield* HttpApiClient.make(TaxKitApi, { baseUrl });
    const amount = yield* fromCents(346_200).pipe(Effect.flatMap(nonNegative));
    return yield* client.calculatorApi.calculate({
      params: { calculatorId },
      payload: {
        calculatorId,

        payload: {
          facts: TakeHomeScenarioInputSchema.make({
            grossPay: amount,
            period: "fortnightly",
            taxFreeThresholdClaimed: true,
          }),
          jurisdiction: Option.some(AuPayJurisdiction.make("AU")),
          taxYear: Option.some(AuPayTaxYear.make("2025-26")),
        },
      },
    });
  }).pipe(Effect.provide(FetchHttpClient.layer));
