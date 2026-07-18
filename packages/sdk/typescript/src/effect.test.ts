import { describe, expect, it } from "@effect/vitest";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import { Cause, Effect, Exit, Layer } from "effect";

import { calculateReport, calculateRunRequest } from "./effect.js";
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

const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/effect-sdk-input.json";

describe("Effect SDK facade", () => {
  it.effect(
    "returns the full canonical calculator run response with decoded report",
    () =>
      Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const sdkResult = yield* calculateRunRequest(AuPayTakeHomeCalculation, {
          payload: {
            facts: takeHomeFacts,
            jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
            taxYear: AuPayTakeHomeCalculation.taxYear,
          },
        });
        const serviceResult = yield* service.calculate({
          calculatorId: AuPayTakeHomeCalculation.calculatorId,
          payload: {
            facts: takeHomeFacts,
            jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
            taxYear: AuPayTakeHomeCalculation.taxYear,
          },
        });

        expect(sdkResult).toEqual(serviceResult);
        expect(sdkResult.report._tag).toBe("TakeHomePayReport");
        expect(sdkResult.report.rulePackVersion).toBe("rules-au-pay/1.0.0");
      }).pipe(Effect.provide(ServiceLive))
  );

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
        rejectedSource: `${secretSentinel}:${privatePathSentinel}`,
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
        expect(JSON.stringify(sdkFailure.error)).not.toContain(secretSentinel);
        expect(JSON.stringify(sdkFailure.error)).not.toContain(
          privatePathSentinel
        );
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
        expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.0");
        expect(report.liability.cents).toBe(1_958_800);
      }).pipe(Effect.provide(ServiceLive))
  );
});
