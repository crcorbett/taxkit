import { RateLimit } from "@alchemy.run/cloudflare/Workers";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import {
  CalculatorAdmission,
  CalculatorRequestRateKey,
} from "@taxkit/calculators/admission.service";
import {
  CalculatorAdmissionUnavailable,
  CalculatorRateLimited,
} from "@taxkit/calculators/errors";
import {
  CalculatorHostMode,
  edgeCallerKey,
} from "@taxkit/observability/edge-identity";
import { CurrentRuntimeContext, RuntimeContext } from "alchemy/RuntimeContext";
import {
  Predicate,
  Config,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { HttpServerRequest } from "effect/http";
import { NetAddress } from "effect/net";

import { ApiWorkerSettingsConfig } from "./worker.config.js";

// The local emulator's one admission identity, checked when the module loads.
const LoopbackRateKey = CalculatorClientRateKey.make(
  Redacted.make(
    CalculatorClientRateKey.to.value.make(NetAddress.ipv4Loopback),
    {
      label: "CalculatorClientRateKey",
    }
  )
);
/**
 * Each calculation's admission identity, read from the native request that
 * carries it: the edge's checked caller address, or the fixed loopback key
 * for the explicit local emulator on a loopback HTTP origin. A request with
 * neither has no identity and is refused admission.
 */
export const ApiCalculatorRequestRateKey = Layer.effect(
  CalculatorRequestRateKey,
  Effect.gen(function* () {
    // An invalid mode is a startup ConfigError; only a missing value means edge.
    const hostMode = yield* Config.schema(
      CalculatorHostMode,
      "CALCULATOR_HOST_MODE"
    ).pipe(Config.withDefault("edge"));
    // Native planning binds deferred resource addresses; read them on first use.
    const settings = yield* Effect.cached(ApiWorkerSettingsConfig);
    const localKey = settings.pipe(
      Effect.map(({ apiOrigin }) =>
        Option.liftPredicate(
          LoopbackRateKey,
          () =>
            hostMode === "local-emulator" &&
            apiOrigin.protocol === "http:" &&
            (apiOrigin.hostname === "127.0.0.1" ||
              apiOrigin.hostname === "localhost")
        )
      ),
      Effect.orElseSucceed(Option.none)
    );
    return CalculatorRequestRateKey.of({
      current: Effect.serviceOption(HttpServerRequest.HttpServerRequest).pipe(
        Effect.map(
          Option.flatMap((request) =>
            edgeCallerKey(request.headers, CalculatorClientRateKey)
          )
        ),
        Effect.flatMap(
          Option.match({
            onNone: () => localKey,
            onSome: Effect.succeedSome,
          })
        ),
        Effect.withSpan("CalculatorRequestRateKey.current")
      ),
    });
  })
);

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
