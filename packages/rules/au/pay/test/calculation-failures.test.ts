import { describe, expect, it } from "@effect/vitest";
import { defineCalculator } from "@taxkit/core";
import {
  CalculationError,
  CalculationInvariantViolation,
} from "@taxkit/core/errors";
import { Cents, Money, NonNegativeMoney } from "@taxkit/core/primitives";
import {
  AuPayTakeHomeCalculation,
  AuPayTakeHomeWithSacrificeCalculation,
  GrossPay,
  GrossPayDescriptor,
  GrossPayFact,
  SalarySacrifice,
  SalarySacrificeFact,
  TakeHomeScenarioInputSchema,
  TakeHomeWithSacrificeScenarioInput,
  TaxablePayFact,
  TaxablePayWithSacrificeLive,
} from "@taxkit/rules-au-pay";
import { AuTakeHomePayRuleDescriptors } from "@taxkit/rules-au-pay/rule-pack";
import { AuPayTakeHomeContract } from "@taxkit/rules-au-pay/schemas";
import { Effect, Exit, Layer, Option, Result } from "effect";

const money = (cents: number) =>
  NonNegativeMoney.make(Money.fromCents(Cents.make(cents)));

describe("calculation failure classification", () => {
  it.effect("keeps a period mismatch instead of a generic amount failure", () =>
    Effect.gen(function* () {
      const error = yield* TaxablePayFact.pipe(
        Effect.provide(
          TaxablePayWithSacrificeLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.succeed(GrossPayFact)(
                  new GrossPay({ amount: money(150_000), period: "weekly" })
                ),
                Layer.succeed(SalarySacrificeFact)(
                  new SalarySacrifice({
                    amount: money(10_000),
                    period: "monthly",
                  })
                )
              )
            )
          )
        ),
        Effect.flip
      );
      expect(error).toStrictEqual(
        new CalculationError({
          message:
            "taxkit/rules-au-pay: salary sacrifice period (monthly) must match gross pay period (weekly)",
          reason: "period-mismatch",
        })
      );
    })
  );

  it.effect("reports sacrifice above gross pay as a caller error", () =>
    Effect.gen(function* () {
      const error = yield* AuPayTakeHomeWithSacrificeCalculation.calculate(
        TakeHomeWithSacrificeScenarioInput.make({
          grossPay: money(10_000),
          period: "weekly",
          salarySacrifice: money(20_000),
          taxFreeThresholdClaimed: true,
        })
      ).pipe(Effect.flip);
      expect(error).toStrictEqual(
        new CalculationError({
          message: "No Schedule 1 row covers the amount.",
          reason: "negative",
        })
      );
    })
  );

  it.effect("preserves the money reason for an amount beyond safe cents", () =>
    Effect.gen(function* () {
      const error = yield* AuPayTakeHomeCalculation.calculate(
        TakeHomeScenarioInputSchema.make({
          grossPay: money(Number.MAX_SAFE_INTEGER),
          period: "weekly",
          taxFreeThresholdClaimed: true,
        })
      ).pipe(Effect.flip);
      expect(error).toStrictEqual(
        new CalculationError({
          message: "PAYG withholding could not produce a supported amount.",
          reason: "range",
        })
      );
    })
  );

  it.effect(
    "treats an invalid rule graph as a defect, not a caller error",
    () =>
      Effect.gen(function* () {
        // The threshold fact is missing, so the graph cannot be satisfied.
        const broken = defineCalculator({
          ...AuPayTakeHomeContract,
          inputFacts: [GrossPayDescriptor],
          ruleDescriptors: AuTakeHomePayRuleDescriptors,
          calculate: (input) =>
            AuPayTakeHomeCalculation.calculate(input).pipe(
              Effect.map(({ report }) => report)
            ),
        });
        const exit = yield* broken
          .calculate(
            TakeHomeScenarioInputSchema.make({
              grossPay: money(150_000),
              period: "weekly",
              taxFreeThresholdClaimed: true,
            })
          )
          .pipe(Effect.exit);
        const error = Exit.findErrorOption(exit);
        const defect = Exit.findDefect(exit);
        expect(error).toStrictEqual(Option.none());
        expect(defect).toStrictEqual(
          Result.succeed(
            new CalculationInvariantViolation({
              invariant: "rule-graph",
              message: "The calculator rule graph is invalid.",
            })
          )
        );
      })
  );
});
