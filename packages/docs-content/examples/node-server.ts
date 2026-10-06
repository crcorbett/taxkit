import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationEngineLive } from "@taxkit/core";
import { Cents, Money } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/au/effect";
import { calculateReport } from "@taxkit/sdk/effect";
import { Effect, Layer, Schema } from "effect";
import * as HttpServerRequest from "effect/http/HttpServerRequest";

class PayPreviewRequestError extends Schema.TaggedError<PayPreviewRequestError>()(
  "PayPreviewRequestError",
  { message: Schema.String }
) {}

const PayPreviewRequest = Schema.Struct({
  grossPayCents: Cents,
  period: GrossPay.fields.period,
  taxFreeThresholdClaimed: Schema.Boolean,
});

const PayPreviewResponse = Schema.Struct({
  netPayCents: Cents,
  withholdingsCents: Cents,
});

const TaxKitLayer = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

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
    const report = yield* calculateReport(AuPayTakeHomeCalculation, {
      grossPay: new GrossPay({
        amount: new Money({ cents: body.grossPayCents, currency: "AUD" }),
        period: body.period,
      }),
      taxFreeThresholdClaimed: body.taxFreeThresholdClaimed,
    });
    const response = yield* Schema.encodeEffect(
      Schema.fromJsonString(PayPreviewResponse)
    )({
      netPayCents: report.netPay.cents,
      withholdingsCents: report.withholdingsTotal.cents,
    });
    return new Response(response, {
      headers: { "content-type": "application/json" },
    });
  }).pipe(Effect.provide(TaxKitLayer));
