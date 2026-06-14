import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";
import { Config, ConfigProvider, Data, Effect, Match, Schema } from "effect";

class BrowserHttpExampleError extends Data.TaggedError(
  "BrowserHttpExampleError"
)<{
  readonly cause: unknown;
}> {}

const CalculatorRunHttpResponse = Schema.Struct({
  calculator: Schema.Struct({
    calculatorId: Schema.String,
  }),
  report: Schema.Unknown,
});

const apiBaseUrl = Config.string("WHATTAX_API_BASE_URL").pipe(
  Config.withDefault("http://127.0.0.1:4000")
);

export const calculateTakeHomePay = Effect.gen(function* () {
  const baseUrl = yield* apiBaseUrl.parse(ConfigProvider.fromEnv());
  const response = yield* Effect.tryPromise({
    catch: (cause) => new BrowserHttpExampleError({ cause }),
    try: () =>
      fetch(
        `${baseUrl}/api/v1/calculators/au.pay.take-home/calculate?help=errors`,
        {
          body: JSON.stringify({
            facts: {
              grossPay: new GrossPay({
                amount: aud(346_200),
                period: "fortnightly",
              }),
              taxFreeThresholdClaimed: true,
            },
            jurisdiction: "AU",
            taxYear: "2025-26",
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }
      ),
  });
  const body = yield* Effect.tryPromise({
    catch: (cause) => new BrowserHttpExampleError({ cause }),
    try: () => response.json(),
  });

  return yield* Match.value(response.ok).pipe(
    Match.when(true, () =>
      Schema.decodeUnknownEffect(CalculatorRunHttpResponse)(body).pipe(
        Effect.mapError((cause) => new BrowserHttpExampleError({ cause }))
      )
    ),
    Match.orElse(() =>
      Effect.fail(new BrowserHttpExampleError({ cause: body }))
    )
  );
});
