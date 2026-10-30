import { RateLimit } from "@alchemy.run/cloudflare/Workers";
import { CalculatorAdmission } from "@taxkit/calculators/admission.service";
import {
  CalculatorAdmissionUnavailable,
  CalculatorRateLimited,
} from "@taxkit/calculators/schemas";
import { CurrentRuntimeContext, RuntimeContext } from "alchemy/RuntimeContext";
import {
  Predicate,
  Config,
  Effect,
  Layer,
  Redacted,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { NetAddress } from "effect/net";

const CalculatorRateNamespace = Schema.String.check(
  Schema.isPattern(/^[1-9]\d*$/u)
).pipe(Schema.brand("api/CalculatorRateNamespace"));
// Config is captured by Alchemy's native planning/runtime bridge. The operator
// owns its account-wide unique stage value; no Production value is invented.
export const ApiCalculatorAdmission = Layer.effect(
  CalculatorAdmission,
  Effect.gen(function* () {
    const namespace = yield* Config.schema(
      CalculatorRateNamespace,
      "CALCULATOR_RATE_NAMESPACE"
    );
    const limiter = yield* RateLimit("CALCULATOR_RATE_LIMIT", {
      namespaceId: namespace,
      simple: { limit: 60, period: 60 },
    });
    const runtime = yield* CurrentRuntimeContext;
    if (Predicate.isUndefined(runtime)) {
      return CalculatorAdmission.of({
        admitCalculation: Effect.fn("CalculatorAdmission.admitCalculation")(
          () => Effect.fail(new CalculatorAdmissionUnavailable())
        ),
      });
    }
    return CalculatorAdmission.of({
      admitCalculation: Effect.fn("CalculatorAdmission.admitCalculation")(
        (key) =>
          Effect.suspend(() =>
            limiter.limit({ key: NetAddress.formatIp(Redacted.value(key)) })
          ).pipe(
            Effect.provideService(RuntimeContext, runtime),
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.Struct({ success: Schema.Boolean })
              )
            ),
            Effect.mapError(() => new CalculatorAdmissionUnavailable()),
            Effect.catchDefect(() =>
              Effect.fail(new CalculatorAdmissionUnavailable())
            ),
            Effect.flatMap((reply) =>
              EffectBoolean.match(reply.success, {
                onFalse: () => Effect.fail(new CalculatorRateLimited()),
                onTrue: () => Effect.void,
              })
            )
          )
      ),
    });
  })
);
