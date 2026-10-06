import { createTaxKitApiClient } from "@taxkit/api-http/client";
import { audFromCents } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/au/effect";
import { Effect } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";

export const calculateTakeHomePay = (baseUrl: URL) =>
  Effect.gen(function* () {
    const client = yield* createTaxKitApiClient({ baseUrl });
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
        jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
        taxYear: AuPayTakeHomeCalculation.taxYear,
      },
      query: { help: "errors" },
    });
  }).pipe(Effect.provide(FetchHttpClient.layer));
