import { describe, expect, it } from "@effect/vitest";
import { PublicCalculatorServiceLive } from "@whattax/calculators/live";
import { PublicCalculatorService } from "@whattax/calculators/service";
import { CalculationEngineLive } from "@whattax/core";
import { aud } from "@whattax/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@whattax/rules-au-pay";
import { expectAt } from "@whattax/testing";
import { Cause, Effect, Exit, Layer } from "effect";

import { calculateReport } from "./effect.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeCalculation,
} from "./testing/index.js";

const ServiceLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

describe("Effect SDK facade", () => {
  it.effect(
    "matches PublicCalculatorService for a successful calculation",
    () =>
      Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const sdkResult = yield* calculateReport(
          AuPayTakeHomeCalculation,
          takeHomeFacts
        );
        const serviceResult = yield* service.calculate({
          calculatorId: AuPayTakeHomeCalculation.calculatorId,
          payload: {
            facts: takeHomeFacts,
            jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
            taxYear: AuPayTakeHomeCalculation.taxYear,
          },
        });

        expect(sdkResult).toEqual(serviceResult.report);
      }).pipe(Effect.provide(ServiceLive))
  );

  it.effect("preserves guided calculator input errors from the service", () =>
    Effect.gen(function* () {
      const service = yield* PublicCalculatorService;
      const invalidFacts = {
        taxableIncome: aud(9_000_000),
      };
      const sdkExit = yield* calculateReport(
        AuPayTakeHomeCalculation,
        // @ts-expect-error runtime parity covers invalid external input after the typed boundary is bypassed.
        invalidFacts
      ).pipe(Effect.exit);
      const serviceExit = yield* service
        .calculate({
          calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
          payload: {
            facts: invalidFacts,
            jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
            taxYear: AuPayTakeHomeCalculation.taxYear,
          },
        })
        .pipe(Effect.exit);

      expect(Exit.isFailure(sdkExit)).toBe(true);
      expect(Exit.isFailure(serviceExit)).toBe(true);

      if (Exit.isFailure(sdkExit) && Exit.isFailure(serviceExit)) {
        const sdkFailure = expectAt(
          sdkExit.cause.reasons.filter(Cause.isFailReason),
          0
        );
        const serviceFailure = expectAt(
          serviceExit.cause.reasons.filter(Cause.isFailReason),
          0
        );

        expect(sdkFailure.error).toEqual(serviceFailure.error);
        expect(sdkFailure.error._tag).toBe("CalculatorInputDecodeError");
      }
    }).pipe(Effect.provide(ServiceLive))
  );

  it.effect(
    "keeps annual-tax descriptors executable through the same facade",
    () =>
      Effect.gen(function* () {
        const report = yield* calculateReport(AuAnnualIncomeTaxCalculation, {
          taxableIncome: aud(9_000_000),
        });

        expect(report._tag).toBe("AnnualTaxReport");
        expect(report.liability.cents).toBe(1_958_800);
      }).pipe(Effect.provide(ServiceLive))
  );
});
