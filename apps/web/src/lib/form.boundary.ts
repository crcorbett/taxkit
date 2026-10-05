import { CalculatorRunServiceRequest } from "@taxkit/api-rpc/schemas";
import { Cents, Money } from "@taxkit/core/primitives";
import {
  AnnualTaxScenarioInputSchema,
  AuAnnualTaxCalculatorId,
  AuAnnualTaxContext,
  AuAnnualTaxJurisdiction,
  AuAnnualTaxYear,
} from "@taxkit/rules-au-income-tax/schemas";
import { GrossPay, PayPeriod } from "@taxkit/rules-au-pay/facts";
import {
  AuPayCalculatorId,
  AuPayContext,
  AuPayJurisdiction,
  AuPayTaxYear,
  TakeHomeScenarioInputSchema,
} from "@taxkit/rules-au-pay/schemas";
import { Result, Schema } from "effect";

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
export const WebsiteCalculatorForm = Schema.Union([
  TakeHomeForm,
  AnnualTaxForm,
]);
export type WebsiteCalculatorForm = typeof WebsiteCalculatorForm.Type;
export const initialTakeHomeForm = TakeHomeForm.make({
  grossDollars: "1654",
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
export class WebsiteInputError extends Schema.TaggedError<WebsiteInputError>()(
  "WebsiteInputError",
  {
    message: Schema.Literals([
      "Enter a valid pay amount and pay period.",
      "Enter a valid annual taxable income.",
    ]),
  }
) {}

// Form text is representation ingress. The rule-owned scenario checks money,
// period and threshold once; no browser rule implementation calculates tax.
export const takeHomeRequestFromForm = (
  form: TakeHomeForm,
  calculatorId: typeof AuPayCalculatorId.Type = AuPayCalculatorId.make(
    "au.pay.take-home"
  )
): Result.Result<CalculatorRunServiceRequest, WebsiteInputError> =>
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
        ...AuPayContext.make({
          jurisdiction: AuPayJurisdiction.make("AU"),
          taxYear: AuPayTaxYear.make("2025-26"),
        }),
      },
    });
  }).pipe(
    Result.mapError(
      () =>
        new WebsiteInputError({
          message: "Enter a valid pay amount and pay period.",
        })
    )
  );

export const annualTaxRequestFromForm = (
  form: AnnualTaxForm
): Result.Result<CalculatorRunServiceRequest, WebsiteInputError> =>
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
        ...AuAnnualTaxContext.make({
          jurisdiction: AuAnnualTaxJurisdiction.make("AU"),
          taxYear: AuAnnualTaxYear.make("2025-26"),
        }),
      },
    });
  }).pipe(
    Result.mapError(
      () =>
        new WebsiteInputError({
          message: "Enter a valid annual taxable income.",
        })
    )
  );
