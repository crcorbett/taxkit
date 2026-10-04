import { CalculatorRunServiceRequest } from "@taxkit/api-rpc/schemas";
import { Cents, Money } from "@taxkit/core/primitives";
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
export const initialTakeHomeForm = TakeHomeForm.make({
  grossDollars: "1654",
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
export class WebsiteInputError extends Schema.TaggedError<WebsiteInputError>()(
  "WebsiteInputError",
  {
    message: Schema.Literal("Enter a valid pay amount and pay period."),
  }
) {}

// Form text is representation ingress. The rule-owned scenario checks money,
// period and threshold once; no browser rule implementation calculates tax.
export const takeHomeRequestFromForm = (
  form: TakeHomeForm
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
      calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
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
