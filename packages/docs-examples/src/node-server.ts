import { Function as EffectFunction, Effect, Schema } from "effect";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import { AuPayTakeHomeCalculation } from "taxkit/au/effect";
import { PayPeriod, TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { Cents, Money } from "taxkit/core";
import { calculateReport, TaxKitLive } from "taxkit/effect";
import { nonNegative } from "taxkit/money/effect";

class PayPreviewRequestError extends Schema.TaggedError<
  PayPreviewRequestError,
  { readonly brand: unique symbol }
>()("PayPreviewRequestError", { message: Schema.String }) {}

const PayPreviewRequest = Schema.Struct({
  grossPayCents: Cents,
  period: PayPeriod,
  taxFreeThresholdClaimed: Schema.Boolean,
});

const PayPreviewResponse = Schema.Struct({
  netPayCents: Cents,
  withholdingsCents: Cents,
});

export const handlePayPreview = (request: Request) =>
  Effect.gen(function* () {
    const body = yield* HttpServerRequest.fromWeb(request).text.pipe(
      Effect.flatMap(
        Schema.decodeEffect(Schema.fromJsonString(PayPreviewRequest))
      ),
      Effect.mapError(
        () =>
          new PayPreviewRequestError({
            message: "Invalid pay preview request.",
          })
      )
    );
    const grossPay = yield* EffectFunction.pipe(
      Money.fromCents(body.grossPayCents),
      nonNegative,
      Effect.mapError(
        () =>
          new PayPreviewRequestError({
            message: "Invalid pay preview request.",
          })
      )
    );
    const input = TakeHomeScenarioInputSchema.make({
      grossPay,
      period: body.period,
      taxFreeThresholdClaimed: body.taxFreeThresholdClaimed,
    });
    const report = yield* calculateReport(AuPayTakeHomeCalculation, input);
    const response = yield* Schema.encodeEffect(
      Schema.fromJsonString(PayPreviewResponse)
    )({
      netPayCents: report.netPay.cents,
      withholdingsCents: report.withholdingsTotal.cents,
    });
    return new Response(response, {
      headers: { "content-type": "application/json" },
    });
  }).pipe(Effect.provide(TaxKitLive));
