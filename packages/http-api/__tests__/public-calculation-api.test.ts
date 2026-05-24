import { describe, expect, it } from "@effect/vitest";
import { aud } from "@whattax/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@whattax/rules-au-pay";
import { expectAt } from "@whattax/testing";
import { Cause, Effect, Exit } from "effect";

import { WhatTaxApiInProcessClientLive } from "../src/client/server.layer.js";
import { WhatTaxHttpApiService } from "../src/client/service.js";

const grossPayFacts = (
  cents: number,
  period: "fortnightly" | "monthly" | "weekly",
  taxFreeThresholdClaimed: boolean
) => ({
  grossPay: new GrossPay({ amount: aud(cents), period }),
  taxFreeThresholdClaimed,
});

describe("WhatTax public calculation HTTP API", () => {
  it.effect("runs calculate through the in-process HttpApi client", () =>
    Effect.gen(function* () {
      const client = yield* WhatTaxHttpApiService;
      const response = yield* client.publicCalculationMetadata.calculate({
        params: {
          calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
        },
        payload: {
          facts: grossPayFacts(346_200, "fortnightly", true),
          jurisdiction: "AU",
          taxYear: "2025-26",
        },
        query: {
          help: "errors",
        },
      });

      expect(response.calculator.calculatorId).toBe("au.pay.take-home");
      expect(response.report._tag).toBe("TakeHomePayReport");
      expect(response.report.withholdingsTotal.cents).toBe(75_600);
      expect(response.report.netPay.cents).toBe(270_600);
      expect(response.diagnostics.graphIssues.length).toBe(0);
    }).pipe(Effect.provide(WhatTaxApiInProcessClientLive))
  );

  it.effect(
    "returns typed calculator input errors through the HTTP client",
    () =>
      Effect.gen(function* () {
        const client = yield* WhatTaxHttpApiService;
        const exit = yield* client.publicCalculationMetadata
          .calculate({
            params: {
              calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
            },
            payload: {
              facts: {
                taxableIncome: aud(9_000_000),
              },
              jurisdiction: "AU",
              taxYear: "2025-26",
            },
            query: {
              help: "errors",
            },
          })
          .pipe(Effect.exit);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const failure = expectAt(
            exit.cause.reasons.filter(Cause.isFailReason),
            0
          );

          expect(failure.error.error._tag).toBe("CalculatorInputDecodeError");
          expect(expectAt(failure.error.error.issues, 0).path).toEqual([
            "grossPay",
          ]);
        }
      }).pipe(Effect.provide(WhatTaxApiInProcessClientLive))
  );
});
