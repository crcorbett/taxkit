import { NonNegativeMoneyFromDecimalString } from "@taxkit/core/primitives";
import {
  AnnualTaxScenarioInputSchema,
  AuAnnualTaxCalculatorId,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "@taxkit/rules-au-income-tax/schemas";
import { PayPeriod } from "@taxkit/rules-au-pay/facts";
import {
  AuPayCalculatorId,
  AuPayJurisdiction,
  AuPayTaxYear,
  TakeHomeScenarioInputSchema,
} from "@taxkit/rules-au-pay/schemas";
import { Match, Option, Result, Schema } from "effect";

import { CalculatorInputError } from "./errors.js";
import {
  CalculatorRunRequest,
  TakeHomeCalculationRequest,
  WithholdingsCalculationRequest,
} from "./schemas.js";

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
const invalidPayAmount = () =>
  new CalculatorInputError({
    field: "grossDollars",
    message: "Enter a valid pay amount.",
  });
const invalidAnnualIncome = () =>
  new CalculatorInputError({
    field: "taxableDollars",
    message: "Enter a valid annual taxable income.",
  });
// Form text is representation ingress. The rule-owned scenario checks money,
// period and threshold once; no browser rule implementation calculates tax.
// Each field is checked separately so the error names the one to correct.
export const takeHomeRequestFromForm = (
  form: TakeHomeForm,
  calculatorId: typeof AuPayCalculatorId.Type = AuPayCalculatorId.make(
    "au.pay.take-home"
  )
): Result.Result<CalculatorRunRequest, CalculatorInputError> =>
  Result.gen(function* () {
    const grossPay = yield* Schema.decodeResult(
      NonNegativeMoneyFromDecimalString
    )(form.grossDollars).pipe(Result.mapError(invalidPayAmount));
    const period = yield* Schema.decodeUnknownResult(PayPeriod)(
      form.period
    ).pipe(
      Result.mapError(
        () =>
          new CalculatorInputError({
            field: "period",
            message: "Choose a pay period.",
          })
      )
    );
    const payload = {
      facts: TakeHomeScenarioInputSchema.make({
        grossPay,
        period,
        taxFreeThresholdClaimed: form.taxFreeThresholdClaimed,
      }),
      jurisdiction: Option.some(AuPayJurisdiction.make("AU")),
      taxYear: Option.some(AuPayTaxYear.make("2025-26")),
    };
    const request: CalculatorRunRequest = Match.value(calculatorId).pipe(
      Match.when("au.pay.take-home", () =>
        TakeHomeCalculationRequest.make({
          calculatorId:
            TakeHomeCalculationRequest.fields.calculatorId.make(
              "au.pay.take-home"
            ),
          payload,
        })
      ),
      Match.when("au.pay.withholdings", () =>
        WithholdingsCalculationRequest.make({
          calculatorId: WithholdingsCalculationRequest.fields.calculatorId.make(
            "au.pay.withholdings"
          ),
          payload,
        })
      ),
      Match.exhaustive
    );
    return request;
  });
export const annualTaxRequestFromForm = (
  form: AnnualTaxForm
): Result.Result<CalculatorRunRequest, CalculatorInputError> =>
  Result.gen(function* () {
    const taxableIncome = yield* Schema.decodeResult(
      NonNegativeMoneyFromDecimalString
    )(form.taxableDollars).pipe(Result.mapError(invalidAnnualIncome));
    const facts = AnnualTaxScenarioInputSchema.make({ taxableIncome });
    return CalculatorRunRequest.make({
      calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
      payload: {
        facts,
        jurisdiction: Option.some(AuAnnualTaxJurisdiction.make("AU")),
        taxYear: Option.some(AuAnnualTaxYear.make("2025-26")),
      },
    });
  });
// Each calculator page starts with a worked example the visitor can change.
export const initialCalculatorForm = (
  calculatorId: CalculatorRunRequest["calculatorId"]
): CalculatorForm =>
  Match.value(calculatorId).pipe(
    Match.when("au.income-tax.annual", () =>
      AnnualTaxForm.make({ taxableDollars: "67000" })
    ),
    Match.when("au.pay.take-home", () => initialTakeHomeForm),
    Match.when("au.pay.withholdings", () =>
      TakeHomeForm.make({
        grossDollars: "9500",
        period: "monthly",
        taxFreeThresholdClaimed: false,
      })
    ),
    Match.exhaustive
  );
// The one checked request for a calculator's visible form. A form of the other
// kind is the visitor's input error, never a calculation.
export const requestFromForm = (
  calculatorId: CalculatorRunRequest["calculatorId"],
  form: CalculatorForm
): Result.Result<CalculatorRunRequest, CalculatorInputError> =>
  Match.value(calculatorId).pipe(
    Match.when("au.income-tax.annual", () =>
      Match.value(form).pipe(
        Match.when(Schema.is(AnnualTaxForm), (annualForm) =>
          annualTaxRequestFromForm(annualForm)
        ),
        Match.orElse(() => Result.fail(invalidAnnualIncome()))
      )
    ),
    Match.whenOr("au.pay.take-home", "au.pay.withholdings", (id) => {
      const payCalculatorId = AuPayCalculatorId.make(id);
      return Match.value(form).pipe(
        Match.when(Schema.is(TakeHomeForm), (payForm) =>
          takeHomeRequestFromForm(payForm, payCalculatorId)
        ),
        Match.orElse(() => Result.fail(invalidPayAmount()))
      );
    }),
    Match.exhaustive
  );
