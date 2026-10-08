import { expect, it } from "@effect/vitest";
import { CalculatorClientRateKey } from "@taxkit/api-rpc/rate-identity";
import { CalculatorAdmission } from "@taxkit/calculators/admission.service";
import {
  CalculatorAdmissionUnavailable,
  CalculatorRateLimited,
} from "@taxkit/calculators/schemas";
import { RateLimit, RateLimitError } from "alchemy/Cloudflare/Workers";
import type { RateLimitClient } from "alchemy/Cloudflare/Workers";
import { RuntimeContext } from "alchemy/RuntimeContext";
import {
  ConfigProvider,
  Effect,
  Layer,
  Match,
  Ref,
  Result,
  Schema,
} from "effect";

import { ApiCalculatorAdmission } from "../src/worker-admission.layer.js";

const runtime = RuntimeContext.of({
  Type: "Cloudflare.Workers.Worker",
  env: {},
  get: () => Effect.die("Unexpected native runtime lookup in provider mock"),
  id: "local-admission-proof",
  set: () => Effect.die("Unexpected native runtime write in provider mock"),
});
const settings = ConfigProvider.fromUnknown({
  CALCULATOR_RATE_NAMESPACE: "10080",
});

it.effect.each([
  "allow",
  "reject",
  "provider-error",
  "provider-defect",
  "missing-runtime",
] as const)("checks native provider admission and safely contains %s", (mode) =>
  Effect.gen(function* () {
    const keys = yield* Ref.make<readonly string[]>([]);
    const calls = yield* Ref.make(0);
    const provider: RateLimitClient = {
      limit: ({ key }) =>
        Ref.update(keys, (used) => [...used, key]).pipe(
          Effect.andThen(Ref.update(calls, (count) => count + 1)),
          Effect.andThen(
            Match.value(mode).pipe(
              Match.when("provider-error", () =>
                Effect.fail(
                  new RateLimitError({
                    cause: { token: "PRIVATE9" },
                    message: "PRIVATE9",
                  })
                )
              ),
              Match.when("provider-defect", () =>
                Effect.die({ token: "PRIVATE9" })
              ),
              Match.orElse(() => Effect.succeed({ success: mode === "allow" }))
            )
          )
        ),
      raw: Effect.die("Raw native binding is not exposed by this service"),
    };
    const layer = ApiCalculatorAdmission.pipe(
      Layer.provide(
        Layer.succeed(
          RateLimit,
          RateLimit.of(() => Effect.succeed(provider))
        )
      )
    );
    const admission = yield* CalculatorAdmission.pipe(Effect.provide(layer));
    const key = yield* Schema.decodeEffect(CalculatorClientRateKey)(
      "2001:0db8:0000:0000:0000:0000:0000:0075"
    );
    const result = yield* admission.admitCalculation(key).pipe(Effect.result);
    expect(Result.isSuccess(result)).toBe(mode === "allow");
    if (Result.isSuccess(result)) {
      expect(result.success).toBeUndefined();
    } else {
      expect(result.failure).toEqual(
        mode === "reject"
          ? new CalculatorRateLimited()
          : new CalculatorAdmissionUnavailable()
      );
    }
    expect(yield* Ref.get(calls)).toBe(mode === "missing-runtime" ? 0 : 1);
    expect(yield* Ref.get(keys)).toEqual(
      mode === "missing-runtime" ? [] : ["2001:db8::75"]
    );
    if (Result.isFailure(result)) {
      const encoded = yield* Schema.encodeEffect(
        Schema.fromJsonString(
          Schema.Union([CalculatorRateLimited, CalculatorAdmissionUnavailable])
        )
      )(result.failure);
      expect(encoded).not.toContain("PRIVATE9");
      expect(encoded).not.toContain("2001:");
    }
  }).pipe(
    Effect.provideService(ConfigProvider.ConfigProvider, settings),
    (effect) =>
      mode === "missing-runtime"
        ? effect
        : effect.pipe(Effect.provideService(RuntimeContext, runtime)),
    Effect.scoped
  )
);
