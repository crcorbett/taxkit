import { Effect, Option } from "effect";
import { HttpApiClient } from "effect/http-api";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { GrossPay } from "taxkit/au";
import { AuPayTakeHomeCalculation } from "taxkit/au/effect";
import { audFromCents } from "taxkit/core";
import { TaxKitApi } from "taxkit/http";

export const calculateTakeHomePay = (baseUrl: URL) =>
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(TaxKitApi, { baseUrl });
    const amount = yield* audFromCents(346_200);
    return yield* client.calculatorApi.calculate({
      params: { calculatorId: AuPayTakeHomeCalculation.calculatorId },
      payload: {
        facts: {
          grossPay: new GrossPay({
            amount,
            period: "fortnightly",
          }),
          taxFreeThresholdClaimed: true,
        },
        jurisdiction: Option.some(
          Option.some(AuPayTakeHomeCalculation.jurisdiction)
        ),
        taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
      },
      query: { help: Option.some(Option.some("errors")) },
    });
  }).pipe(Effect.provide(FetchHttpClient.layer));
