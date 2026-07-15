import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { au } from "@taxkit/sdk/au";
import { Data, Effect, Schema } from "effect";

class PayPreviewRequestError extends Data.TaggedError(
  "PayPreviewRequestError"
)<{
  readonly cause: unknown;
}> {}

class PayPreviewCalculationError extends Data.TaggedError(
  "PayPreviewCalculationError"
)<{
  readonly cause: unknown;
}> {}

const PayPreviewRequest = Schema.Struct({
  grossPayCents: Schema.Number,
  period: Schema.Literals(["fortnightly", "monthly", "weekly"]),
  taxFreeThresholdClaimed: Schema.Boolean,
});

export const handlePayPreview = (request: Request) =>
  Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      catch: (cause) => new PayPreviewRequestError({ cause }),
      try: () => request.json(),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(PayPreviewRequest)),
      Effect.mapError((cause) => new PayPreviewRequestError({ cause }))
    );
    const report = yield* Effect.tryPromise({
      catch: (cause) => new PayPreviewCalculationError({ cause }),
      try: () =>
        au.pay.takeHomePay({
          grossPay: new GrossPay({
            amount: aud(body.grossPayCents),
            period: body.period,
          }),
          taxFreeThresholdClaimed: body.taxFreeThresholdClaimed,
        }),
    });

    return Response.json({
      netPayCents: report.netPay.cents,
      withholdingsCents: report.withholdingsTotal.cents,
    });
  });
