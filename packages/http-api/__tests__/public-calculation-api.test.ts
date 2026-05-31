import { describe, expect, it } from "@effect/vitest";
import { PublicCalculatorServiceLive } from "@whattax/calculators/live";
import { CalculationEngineLive } from "@whattax/core";
import { aud } from "@whattax/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@whattax/rules-au-pay";
import { AuPayTakeHomeCalculation } from "@whattax/sdk/au/effect";
import { calculateReportRequest as calculateSdkReportRequest } from "@whattax/sdk/effect";
import { expectAt } from "@whattax/testing";
import { Cause, Effect, Exit, Layer } from "effect";

import { WhatTaxApiInProcessClientLive } from "../src/client/server.layer.js";
import { WhatTaxHttpApiService } from "../src/client/service.js";

const PublicCalculatorServiceTestLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const TestLive = Layer.mergeAll(
  WhatTaxApiInProcessClientLive,
  PublicCalculatorServiceTestLive
);

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
      const facts = grossPayFacts(346_200, "fortnightly", true);
      const response = yield* client.calculatorApi.calculate({
        params: {
          calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
        },
        payload: {
          facts,
          jurisdiction: "AU",
          taxYear: "2025-26",
        },
        query: {
          help: "errors",
        },
      });
      const sdkReport = yield* calculateSdkReportRequest(
        AuPayTakeHomeCalculation,
        {
          payload: {
            facts,
            jurisdiction: "AU",
            taxYear: "2025-26",
          },
        }
      );

      expect(response.calculator.calculatorId).toBe("au.pay.take-home");
      expect(response.report._tag).toBe("TakeHomePayReport");
      expect(response.report).toEqual(sdkReport);
      expect(response.report.withholdingsTotal.cents).toBe(75_600);
      expect(response.report.netPay.cents).toBe(270_600);
      expect(response.diagnostics.graphIssues.length).toBe(0);
    }).pipe(Effect.provide(TestLive))
  );

  it.effect(
    "returns typed calculator input errors through the HTTP client",
    () =>
      Effect.gen(function* () {
        const client = yield* WhatTaxHttpApiService;
        const invalidFacts = {
          taxableIncome: aud(9_000_000),
        };
        const exit = yield* client.calculatorApi
          .calculate({
            params: {
              calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
            },
            payload: {
              facts: invalidFacts,
              jurisdiction: "AU",
              taxYear: "2025-26",
            },
            query: {
              help: "errors",
            },
          })
          .pipe(Effect.exit);
        const sdkExit = yield* calculateSdkReportRequest(
          AuPayTakeHomeCalculation,
          {
            help: "errors",
            payload: {
              // @ts-expect-error runtime parity covers invalid external input after the typed boundary is bypassed.
              facts: invalidFacts,
              jurisdiction: "AU",
              taxYear: "2025-26",
            },
          }
        ).pipe(Effect.exit);

        expect(Exit.isFailure(exit)).toBe(true);
        expect(Exit.isFailure(sdkExit)).toBe(true);
        if (Exit.isFailure(exit) && Exit.isFailure(sdkExit)) {
          const failure = expectAt(
            exit.cause.reasons.filter(Cause.isFailReason),
            0
          );
          const sdkFailure = expectAt(
            sdkExit.cause.reasons.filter(Cause.isFailReason),
            0
          );

          expect(failure.error.error).toEqual(sdkFailure.error);
          expect(failure.error.error._tag).toBe("CalculatorInputDecodeError");
          expect(expectAt(failure.error.error.issues, 0).path).toEqual([
            "grossPay",
          ]);
        }
      }).pipe(Effect.provide(TestLive))
  );
});
