import { describe, expect, it } from "@effect/vitest";
import { CalculationEngineLive } from "@taxkit/core";
import { Money, Cents, audFromCents } from "@taxkit/core/primitives";
import { AuAnnualTaxCalculatorId } from "@taxkit/rules-au-income-tax";
import {
  AuPayCalculatorId as PayCalculatorId,
  GrossPay,
  AuPayJurisdiction,
  AuPayTaxYear,
} from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import {
  Predicate,
  Function as EffectFunction,
  Array as EffectArray,
  Cause,
  Effect,
  Exit,
  Layer,
  Match,
  Option,
  Result,
  Schema,
} from "effect";

import { PublicCalculatorServiceLive } from "../src/live.layer.js";
import {
  CalculatorInputDecodeError,
  CalculatorServiceError,
} from "../src/schemas.js";
import { PublicCalculatorService } from "../src/service.js";

const ServiceLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);
const grossPayFacts = (
  amount: Money,
  period: GrossPay["period"],
  taxFreeThresholdClaimed: boolean
) => ({
  grossPay: new GrossPay({ amount, period }),
  taxFreeThresholdClaimed,
});
const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/input.json";
const calculateTakeHome = (
  cents: number,
  period: GrossPay["period"],
  taxFreeThresholdClaimed: boolean
) =>
  Effect.gen(function* () {
    const service = yield* PublicCalculatorService;
    const response = yield* service.calculate({
      calculatorId: PayCalculatorId.make("au.pay.take-home"),
      help: Option.none(),
      payload: {
        facts: grossPayFacts(
          yield* audFromCents(cents),
          period,
          taxFreeThresholdClaimed
        ),
        jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
        taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
      },
    });
    const report = Match.value(response.report).pipe(
      Match.tag("TakeHomePayReport", (value) => value),
      Match.orElse(() => expect.fail("Expected TakeHomePayReport"))
    );
    return { ...response, report };
  }).pipe(Effect.provide(ServiceLive));
const calculateWithholdings = (
  cents: number,
  period: GrossPay["period"],
  taxFreeThresholdClaimed: boolean
) =>
  Effect.gen(function* () {
    const service = yield* PublicCalculatorService;
    const response = yield* service.calculate({
      calculatorId: PayCalculatorId.make("au.pay.withholdings"),
      help: Option.none(),
      payload: {
        facts: grossPayFacts(
          yield* audFromCents(cents),
          period,
          taxFreeThresholdClaimed
        ),
        jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
        taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
      },
    });
    const report = Match.value(response.report).pipe(
      Match.tag("PayWithholdingsLedger", (value) => value),
      Match.orElse(() => expect.fail("Expected PayWithholdingsLedger"))
    );
    return { ...response, report };
  }).pipe(Effect.provide(ServiceLive));
const calculateAnnualTax = (cents: number) =>
  Effect.gen(function* () {
    const service = yield* PublicCalculatorService;
    const response = yield* service.calculate({
      calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
      help: Option.none(),
      payload: {
        facts: { taxableIncome: yield* audFromCents(cents) },
        jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
        taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
      },
    });
    const report = Match.value(response.report).pipe(
      Match.tag("AnnualTaxReport", (value) => value),
      Match.orElse(() => expect.fail("Expected AnnualTaxReport"))
    );
    return { ...response, report };
  }).pipe(Effect.provide(ServiceLive));
describe("public calculator service", () => {
  it.effect.each(["au.pay.take-home", "au.pay.withholdings"] as const)(
    "returns a safe calculation failure for a derived amount too large in %s",
    (calculatorId) =>
      Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const result = yield* service
          .calculate({
            calculatorId: PayCalculatorId.make(calculatorId),
            help: Option.none(),
            payload: {
              facts: grossPayFacts(
                new Money({
                  cents: Cents.make(Number.MAX_SAFE_INTEGER),
                  currency: "AUD",
                }),
                "weekly",
                true
              ),
              jurisdiction: Option.some(
                Option.some(AuPayJurisdiction.make("AU"))
              ),
              taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
            },
          })
          .pipe(Effect.result);
        EffectFunction.pipe(Result.isFailure(result), (actual) => {
          expect(actual).toBeTruthy();
        });
        if (Result.isFailure(result)) {
          const error = Match.value(result.failure).pipe(
            Match.tag("CalculationError", (value) => value),
            Match.orElse(() => expect.fail("Expected calculation error"))
          );
          EffectFunction.pipe(
            Predicate.isTagged(error, "CalculationError"),
            (matches) => {
              expect(matches).toBeTruthy();
            }
          );
          const encoded = yield* Schema.encodeEffect(
            Schema.fromJsonString(CalculatorServiceError)
          )(error);
          expect(encoded).toBe(
            '{"_tag":"CalculationError","message":"PAYG withholding could not produce a supported amount."}'
          );
        }
      }).pipe(Effect.provide(ServiceLive))
  );
  it.effect.each([
    {
      role: "nurse",
      gross: 165_400,
      period: "weekly",
      threshold: true,
      withheld: 35_300,
      net: 130_100,
    },
    {
      role: "teacher",
      gross: 346_200,
      period: "fortnightly",
      threshold: true,
      withheld: 75_600,
      net: 270_600,
    },
    {
      role: "paramedic",
      gross: 245_000,
      period: "weekly",
      threshold: false,
      withheld: 73_300,
      net: 171_700,
    },
    {
      role: "cafe manager",
      gross: 680_000,
      period: "monthly",
      threshold: true,
      withheld: 141_300,
      net: 538_700,
    },
    {
      role: "retail assistant",
      gross: 72_000,
      period: "weekly",
      threshold: true,
      withheld: 7200,
      net: 64_800,
    },
    {
      role: "software engineer",
      gross: 720_000,
      period: "fortnightly",
      threshold: true,
      withheld: 209_200,
      net: 510_800,
    },
    {
      role: "mine worker",
      gross: 950_000,
      period: "monthly",
      threshold: false,
      withheld: 275_600,
      net: 674_400,
    },
  ] as const)(
    "calculates the $role take-home pay journey",
    ({ gross, period, threshold, withheld, net }) =>
      Effect.gen(function* () {
        const { report, diagnostics } = yield* calculateTakeHome(
          gross,
          period,
          threshold
        );
        expect({
          isTakeHomeReport: Predicate.isTagged(report, "TakeHomePayReport"),
          gross: report.grossPay.cents,
          withheld: report.withholdingsTotal.cents,
          net: report.netPay.cents,
          period: report.period,
          rulePackVersion: report.rulePackVersion,
          graphIssues: diagnostics.graphIssues,
        }).toStrictEqual({
          isTakeHomeReport: true,
          gross,
          withheld,
          net,
          period,
          rulePackVersion: "rules-au-pay/1.0.2",
          graphIssues: [],
        });
      })
  );
  it.effect("runs withholding-only payroll previews", () =>
    Effect.gen(function* () {
      const nurse = yield* calculateWithholdings(165_400, "weekly", true);
      expect({
        nurseReport_tag: Predicate.isTagged(
          nurse.report,
          "PayWithholdingsLedger"
        ),
        nurseReportTotalCents: nurse.report.total.cents,
        nurseReportPeriod: nurse.report.period,
        expectAtNurseReportComponents0Label: expectAt(
          nurse.report.components,
          0
        ).label,
      }).toStrictEqual({
        nurseReport_tag: true,
        nurseReportTotalCents: 35_300,
        nurseReportPeriod: "weekly",
        expectAtNurseReportComponents0Label: "PAYG withholding",
      });
      const highMonthly = yield* calculateWithholdings(
        950_000,
        "monthly",
        false
      );
      expect({
        highMonthlyReportTotalCents: highMonthly.report.total.cents,
        highMonthlyReportPeriod: highMonthly.report.period,
      }).toStrictEqual({
        highMonthlyReportTotalCents: 275_600,
        highMonthlyReportPeriod: "monthly",
      });
    })
  );
  it.effect(
    "runs annual tax journeys across low, middle and high incomes",
    () =>
      Effect.gen(function* () {
        const student = yield* calculateAnnualTax(1_500_000);
        expect({
          studentReport_tag: Predicate.isTagged(
            student.report,
            "AnnualTaxReport"
          ),
          studentReportRulePackVersion: student.report.rulePackVersion,
          studentReportRawLiabilityCents: student.report.rawLiability.cents,
          studentReportLiabilityCents: student.report.liability.cents,
        }).toStrictEqual({
          studentReport_tag: true,
          studentReportRulePackVersion: "rules-au-income-tax/1.0.1",
          studentReportRawLiabilityCents: -70_000,
          studentReportLiabilityCents: 0,
        });
        const designer = yield* calculateAnnualTax(6_700_000);
        expect({
          designerReportLiabilityCents: designer.report.liability.cents,
          grossPayCents: expectAt(designer.report.ledger.components, 0).amount
            .cents,
          netPayCents: expectAt(designer.report.ledger.components, 2).amount
            .cents,
        }).toStrictEqual({
          designerReportLiabilityCents: 1_222_800,
          grossPayCents: 1_088_800,
          netPayCents: 134_000,
        });
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
          help: Option.some(Option.some("errors")),
          payload: {
            facts: {
              taxableIncome: new Money({
                cents: Cents.make(9_000_000),
                currency: "AUD",
              }),
            },
            jurisdiction: Option.some(
              Option.some(AuPayJurisdiction.make("AU"))
            ),
            taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
          },
        })
        .pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
        expect(actual).toBeTruthy();
      });
      if (Exit.isFailure(exit)) {
        const failure = EffectFunction.pipe(
          EffectFunction.pipe(
            exit.cause.reasons,
            EffectArray.filter(Cause.isFailReason)
          ),
          (argument1) =>
            EffectFunction.pipe(0, (argument2) =>
              expectAt(argument1, argument2)
            )
        );
        const error = Match.value(failure.error).pipe(
          Match.tag("CalculatorInputDecodeError", (value) => value),
          Match.orElse(() => expect.fail("Expected calculator input error"))
        );
        expect({
          inputFailure: {
            error_tag: Predicate.isTagged(error, "CalculatorInputDecodeError"),
            expectAtErrorIssues0Path: expectAt(error.issues, 0).path,
            expectAtErrorIssues0Message: expectAt(error.issues, 0).message,
          },
          helpCount: error.help.pipe(
            Option.flatten,
            Option.map((help) => help.length),
            Option.getOrElse(() => 0)
          ),
        }).toStrictEqual({
          inputFailure: {
            error_tag: true,
            expectAtErrorIssues0Path: ["grossPay"],
            expectAtErrorIssues0Message: "Invalid calculator input value",
          },
          helpCount: 2,
        });
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
            help: Option.none(),
            payload: {
              facts: {
                // @ts-expect-error runtime safety coverage bypasses the typed boundary.
                grossPay: `${secretSentinel}:${privatePathSentinel}`,
                taxFreeThresholdClaimed: true,
              },
              jurisdiction: Option.some(
                Option.some(AuPayJurisdiction.make("AU"))
              ),
              taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
            },
          })
          .pipe(Effect.exit);
        EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
          expect(actual).toBeTruthy();
        });
        if (Exit.isFailure(exit)) {
          const failure = EffectFunction.pipe(
            EffectFunction.pipe(
              exit.cause.reasons,
              EffectArray.filter(Cause.isFailReason)
            ),
            (argument3) =>
              EffectFunction.pipe(0, (argument4) =>
                expectAt(argument3, argument4)
              )
          );
          const error = Match.value(failure.error).pipe(
            Match.tag("CalculatorInputDecodeError", (value) => value),
            Match.orElse(() => expect.fail("Expected calculator input error"))
          );
          const rendered = yield* Schema.encodeEffect(
            Schema.fromJsonString(CalculatorInputDecodeError)
          )(error);
          expect({
            error_tag: Predicate.isTagged(error, "CalculatorInputDecodeError"),
            expectAtErrorIssues0Path: expectAt(error.issues, 0).path,
            expectAtErrorIssues0Message: expectAt(error.issues, 0).message,
          }).toStrictEqual({
            error_tag: true,
            expectAtErrorIssues0Path: ["grossPay"],
            expectAtErrorIssues0Message: "Invalid calculator input value",
          });
          expect(rendered).not.toContain(secretSentinel);
          expect(rendered).not.toContain(privatePathSentinel);
        }
      }).pipe(Effect.provide(ServiceLive))
  );
});
