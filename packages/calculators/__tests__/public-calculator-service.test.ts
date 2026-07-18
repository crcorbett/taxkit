import { describe, expect, it } from "@effect/vitest";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import { AuAnnualTaxCalculatorId } from "@taxkit/rules-au-income-tax";
import {
  AuPayCalculatorId as PayCalculatorId,
  GrossPay,
} from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import { Cause, Effect, Exit, Layer } from "effect";

import { PublicCalculatorServiceLive } from "../src/live.layer.js";
import { PublicCalculatorService } from "../src/service.js";

const ServiceLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const grossPayFacts = (
  cents: number,
  period: "fortnightly" | "monthly" | "weekly",
  taxFreeThresholdClaimed: boolean
) => ({
  grossPay: new GrossPay({ amount: aud(cents), period }),
  taxFreeThresholdClaimed,
});

const taxableIncomeFacts = (cents: number) => ({
  taxableIncome: aud(cents),
});

const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/input.json";

const calculateTakeHome = (
  cents: number,
  period: "fortnightly" | "monthly" | "weekly",
  taxFreeThresholdClaimed: boolean
) =>
  Effect.gen(function* () {
    const service = yield* PublicCalculatorService;
    return yield* service.calculate({
      calculatorId: PayCalculatorId.make("au.pay.take-home"),
      payload: {
        facts: grossPayFacts(cents, period, taxFreeThresholdClaimed),
        jurisdiction: "AU",
        taxYear: "2025-26",
      },
    });
  }).pipe(Effect.provide(ServiceLive));

const calculateWithholdings = (
  cents: number,
  period: "fortnightly" | "monthly" | "weekly",
  taxFreeThresholdClaimed: boolean
) =>
  Effect.gen(function* () {
    const service = yield* PublicCalculatorService;
    return yield* service.calculate({
      calculatorId: PayCalculatorId.make("au.pay.withholdings"),
      payload: {
        facts: grossPayFacts(cents, period, taxFreeThresholdClaimed),
        jurisdiction: "AU",
        taxYear: "2025-26",
      },
    });
  }).pipe(Effect.provide(ServiceLive));

const calculateAnnualTax = (cents: number) =>
  Effect.gen(function* () {
    const service = yield* PublicCalculatorService;
    return yield* service.calculate({
      calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
      payload: {
        facts: taxableIncomeFacts(cents),
        jurisdiction: "AU",
        taxYear: "2025-26",
      },
    });
  }).pipe(Effect.provide(ServiceLive));

describe("PublicCalculatorService", () => {
  it.effect("runs varied take-home pay journeys", () =>
    Effect.gen(function* () {
      const nurse = yield* calculateTakeHome(165_400, "weekly", true);
      expect(nurse.report._tag).toBe("TakeHomePayReport");
      expect(nurse.report.grossPay.cents).toBe(165_400);
      expect(nurse.report.withholdingsTotal.cents).toBe(35_300);
      expect(nurse.report.netPay.cents).toBe(130_100);
      expect(nurse.report.period).toBe("weekly");
      expect(nurse.report.rulePackVersion).toBe("rules-au-pay/1.0.0");
      expect(nurse.diagnostics.graphIssues.length).toBe(0);

      const teacher = yield* calculateTakeHome(346_200, "fortnightly", true);
      expect(teacher.report.withholdingsTotal.cents).toBe(75_600);
      expect(teacher.report.netPay.cents).toBe(270_600);
      expect(teacher.report.period).toBe("fortnightly");

      const paramedic = yield* calculateTakeHome(245_000, "weekly", false);
      expect(paramedic.report.withholdingsTotal.cents).toBe(73_300);
      expect(paramedic.report.netPay.cents).toBe(171_700);

      const cafeManager = yield* calculateTakeHome(680_000, "monthly", true);
      expect(cafeManager.report.withholdingsTotal.cents).toBe(141_300);
      expect(cafeManager.report.netPay.cents).toBe(538_700);

      const retailAssistant = yield* calculateTakeHome(72_000, "weekly", true);
      expect(retailAssistant.report.withholdingsTotal.cents).toBe(7200);
      expect(retailAssistant.report.netPay.cents).toBe(64_800);

      const softwareEngineer = yield* calculateTakeHome(
        720_000,
        "fortnightly",
        true
      );
      expect(softwareEngineer.report.withholdingsTotal.cents).toBe(209_200);
      expect(softwareEngineer.report.netPay.cents).toBe(510_800);

      const mineWorker = yield* calculateTakeHome(950_000, "monthly", false);
      expect(mineWorker.report.withholdingsTotal.cents).toBe(275_600);
      expect(mineWorker.report.netPay.cents).toBe(674_400);
    })
  );

  it.effect("runs withholding-only payroll previews", () =>
    Effect.gen(function* () {
      const nurse = yield* calculateWithholdings(165_400, "weekly", true);
      expect(nurse.report._tag).toBe("PayWithholdingsLedger");
      expect(nurse.report.total.cents).toBe(35_300);
      expect(nurse.report.period).toBe("weekly");
      expect(expectAt(nurse.report.components, 0).label).toBe(
        "PAYG withholding"
      );

      const highMonthly = yield* calculateWithholdings(
        950_000,
        "monthly",
        false
      );
      expect(highMonthly.report.total.cents).toBe(275_600);
      expect(highMonthly.report.period).toBe("monthly");
    })
  );

  it.effect(
    "runs annual tax journeys across low, middle and high incomes",
    () =>
      Effect.gen(function* () {
        const student = yield* calculateAnnualTax(1_500_000);
        expect(student.report._tag).toBe("AnnualTaxReport");
        expect(student.report.rulePackVersion).toBe(
          "rules-au-income-tax/1.0.0"
        );
        expect(student.report.rawLiability.cents).toBe(-70_000);
        expect(student.report.liability.cents).toBe(0);

        const designer = yield* calculateAnnualTax(6_700_000);
        expect(designer.report.liability.cents).toBe(1_222_800);
        expect(
          expectAt(designer.report.ledger.components, 0).amount.cents
        ).toBe(1_088_800);
        expect(
          expectAt(designer.report.ledger.components, 2).amount.cents
        ).toBe(134_000);

        const teacher = yield* calculateAnnualTax(9_000_000);
        expect(teacher.report.liability.cents).toBe(1_958_800);

        const contractor = yield* calculateAnnualTax(12_800_000);
        expect(contractor.report.liability.cents).toBe(3_174_800);

        const executive = yield* calculateAnnualTax(24_000_000);
        expect(executive.report.liability.cents).toBe(7_893_800);
      })
  );

  it.effect("returns guided calculator input decode errors", () =>
    Effect.gen(function* () {
      const service = yield* PublicCalculatorService;
      const exit = yield* service
        .calculate({
          calculatorId: PayCalculatorId.make("au.pay.take-home"),
          help: "errors",
          payload: {
            facts: {
              taxableIncome: aud(9_000_000),
            },
            jurisdiction: "AU",
            taxYear: "2025-26",
          },
        })
        .pipe(Effect.exit);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const failure = expectAt(
          exit.cause.reasons.filter(Cause.isFailReason),
          0
        );

        expect(failure.error._tag).toBe("CalculatorInputDecodeError");
        expect(expectAt(failure.error.issues, 0).path).toEqual(["grossPay"]);
        expect(expectAt(failure.error.issues, 0).message).toBe(
          "Invalid calculator input value"
        );
        expect(failure.error.help?.length).toBe(2);
      }
    }).pipe(Effect.provide(ServiceLive))
  );

  it.effect(
    "does not echo rejected values or private paths in input issues",
    () =>
      Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const exit = yield* service
          .calculate({
            calculatorId: PayCalculatorId.make("au.pay.take-home"),
            payload: {
              facts: {
                // @ts-expect-error runtime safety coverage bypasses the typed boundary.
                grossPay: `${secretSentinel}:${privatePathSentinel}`,
                taxFreeThresholdClaimed: true,
              },
              jurisdiction: "AU",
              taxYear: "2025-26",
            },
          })
          .pipe(Effect.exit);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const failure = expectAt(
            exit.cause.reasons.filter(Cause.isFailReason),
            0
          );
          const rendered = JSON.stringify(failure.error);

          expect(failure.error._tag).toBe("CalculatorInputDecodeError");
          expect(expectAt(failure.error.issues, 0).path).toEqual(["grossPay"]);
          expect(expectAt(failure.error.issues, 0).message).toBe(
            "Invalid calculator input value"
          );
          expect(rendered).not.toContain(secretSentinel);
          expect(rendered).not.toContain(privatePathSentinel);
        }
      }).pipe(Effect.provide(ServiceLive))
  );
});
