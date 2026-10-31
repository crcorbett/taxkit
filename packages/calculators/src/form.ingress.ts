import { Cents, Money } from "@taxkit/core/primitives";
import {
  AnnualTaxScenarioInputSchema,
  AuAnnualTaxCalculatorId,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "@taxkit/rules-au-income-tax/schemas";
import { GrossPay, PayPeriod } from "@taxkit/rules-au-pay/facts";
import {
  AuPayCalculatorId,
  AuPayJurisdiction,
  AuPayTaxYear,
  TakeHomeScenarioInputSchema,
} from "@taxkit/rules-au-pay/schemas";
import { Match, Option, Result, Schema } from "effect";

import { CalculatorRunServiceRequest } from "./schemas.js";

export const TakeHomeForm = Schema.Struct({
  grossDollars: Schema.String,
  period: Schema.String,
  taxFreeThresholdClaimed: Schema.Boolean,
});
export type TakeHomeForm = typeof TakeHomeForm.Type;
export const AnnualTaxForm = Schema.Struct({
  taxableDollars: Schema.String,
});
export type AnnualTaxForm = typeof AnnualTaxForm.Type;
export const CalculatorForm = Schema.Union([TakeHomeForm, AnnualTaxForm]);
export type CalculatorForm = typeof CalculatorForm.Type;
export const initialTakeHomeForm = TakeHomeForm.make({
  grossDollars: "1654",
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
export class CalculatorInputError extends Schema.TaggedError<
  CalculatorInputError,
  {
    readonly brand: unique symbol;
  }
>()("CalculatorInputError", {
  message: Schema.Literals([
    "Enter a valid pay amount and pay period.",
    "Enter a valid annual taxable income.",
  ]),
}) {}
// Form text is representation ingress. The rule-owned scenario checks money,
// period and threshold once; no browser rule implementation calculates tax.
export const takeHomeRequestFromForm = (
  form: TakeHomeForm,
  calculatorId: typeof AuPayCalculatorId.Type = AuPayCalculatorId.make(
    "au.pay.take-home"
  )
): Result.Result<CalculatorRunServiceRequest, CalculatorInputError> =>
  Result.gen(function* () {
    const amount = yield* Schema.decodeUnknownResult(Schema.FiniteFromString)(
      form.grossDollars
    );
    const cents = yield* Schema.decodeUnknownResult(Cents)(
      Math.round(amount * 100)
    );
    const period = yield* Schema.decodeUnknownResult(PayPeriod)(form.period);
    const facts = TakeHomeScenarioInputSchema.make({
      grossPay: new GrossPay({
        amount: new Money({ cents, currency: "AUD" }),
        period,
      }),
      taxFreeThresholdClaimed: form.taxFreeThresholdClaimed,
    });
    return CalculatorRunServiceRequest.make({
      calculatorId,
      payload: {
        facts,
        jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
        taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
      },
    });
  }).pipe(
    Result.mapError(
      () =>
        new CalculatorInputError({
          message: "Enter a valid pay amount and pay period.",
        })
    )
  );
export const annualTaxRequestFromForm = (
  form: AnnualTaxForm
): Result.Result<CalculatorRunServiceRequest, CalculatorInputError> =>
  Result.gen(function* () {
    const amount = yield* Schema.decodeUnknownResult(Schema.FiniteFromString)(
      form.taxableDollars
    );
    const cents = yield* Schema.decodeUnknownResult(Cents)(
      Math.round(amount * 100)
    );
    const facts = AnnualTaxScenarioInputSchema.make({
      taxableIncome: new Money({ cents, currency: "AUD" }),
    });
    return CalculatorRunServiceRequest.make({
      calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
      payload: {
        facts,
        jurisdiction: Option.some(
          Option.some(AuAnnualTaxJurisdiction.make("AU"))
        ),
        taxYear: Option.some(Option.some(AuAnnualTaxYear.make("2025-26"))),
      },
    });
  }).pipe(
    Result.mapError(
      () =>
        new CalculatorInputError({
          message: "Enter a valid annual taxable income.",
        })
    )
  );
// Each calculator page starts with a worked example the visitor can change.
export const initialCalculatorForm = (
  calculatorId: CalculatorRunServiceRequest["calculatorId"]
): CalculatorForm =>
  Match.value(calculatorId).pipe(
    Match.when("au.income-tax.annual", () =>
      AnnualTaxForm.make({ taxableDollars: "67000" })
    ),
    Match.when("au.pay.take-home", () => initialTakeHomeForm),
    Match.orElse(() =>
      TakeHomeForm.make({
        grossDollars: "9500",
        period: "monthly",
        taxFreeThresholdClaimed: false,
      })
    )
  );
// The one checked request for a calculator's visible form. A form of the other
// kind is the visitor's input error, never a calculation.
export const requestFromForm = (
  calculatorId: CalculatorRunServiceRequest["calculatorId"],
  form: CalculatorForm
): Result.Result<CalculatorRunServiceRequest, CalculatorInputError> => {
  if (calculatorId === "au.income-tax.annual") {
    return Match.value(form).pipe(
      Match.when(Schema.is(AnnualTaxForm), (matchedValue) =>
        annualTaxRequestFromForm(matchedValue)
      ),
      Match.orElse(() =>
        Result.fail(
          new CalculatorInputError({
            message: "Enter a valid annual taxable income.",
          })
        )
      )
    );
  }
  const payCalculatorId = AuPayCalculatorId.make(calculatorId);
  return Match.value(form).pipe(
    Match.when(Schema.is(TakeHomeForm), (matchedValue) =>
      takeHomeRequestFromForm(matchedValue, payCalculatorId)
    ),
    Match.orElse(() =>
      Result.fail(
        new CalculatorInputError({
          message: "Enter a valid pay amount and pay period.",
        })
      )
    )
  );
};
