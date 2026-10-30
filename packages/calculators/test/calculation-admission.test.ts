import { describe, expect, it } from "@effect/vitest";
import { CalculationEngineLive } from "@taxkit/core";
import { Cents, Money } from "@taxkit/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@taxkit/rules-au-pay";
import {
  Predicate,
  Function as EffectFunction,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
} from "effect";
import { TestClock } from "effect/testing";

import { PublicCalculatorServiceRateLimited } from "../src/admission.layer.js";
import { CalculatorClientRateKey } from "../src/admission.schemas.js";
import {
  CalculatorAdmission,
  CalculatorRequestRateKey,
} from "../src/admission.service.js";
import { PublicCalculatorServiceLive } from "../src/live.layer.js";
import {
  CalculatorAdmissionUnavailable,
  CalculatorRateLimited,
  CalculatorRunServiceRequest,
  MetadataQuery,
} from "../src/schemas.js";
import { PublicCalculatorService } from "../src/service.js";
import { PublicCalculatorServiceBounded } from "../src/work.layer.js";

const request = CalculatorRunServiceRequest.make({
  calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
  payload: {
    facts: {
      grossPay: new GrossPay({
        amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
        period: "weekly",
      }),
      taxFreeThresholdClaimed: true,
    },
  },
});
const calculators = PublicCalculatorServiceRateLimited.pipe(
  Layer.provide(PublicCalculatorServiceLive),
  Layer.provide(CalculationEngineLive)
);
describe("anonymous calculation admission", () => {
  it.effect("canonicalises IPv6 and prevents ordinary key serialisation", () =>
    Effect.gen(function* () {
      const first = yield* Schema.decodeEffect(CalculatorClientRateKey)(
        "2001:db8::75"
      );
      const second = yield* Schema.decodeEffect(CalculatorClientRateKey)(
        "2001:0db8:0000:0000:0000:0000:0000:0075"
      );
      expect(first).toStrictEqual(second);
      // oxlint-disable-next-line typescript/no-base-to-string -- Verify that implicit string conversion cannot reveal the secret.
      EffectFunction.pipe(String(first), (actual) => {
        expect(actual).not.toContain("2001:");
      });
      EffectFunction.pipe(
        Result.isFailure(
          yield* Schema.encodeEffect(CalculatorClientRateKey)(first).pipe(
            Effect.result
          )
        ),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
      yield* Effect.forEach(
        ["", "999.0.0.1", "203.0.113.1, 203.0.113.2", "private-canary"],
        (invalid) =>
          Schema.decodeEffect(CalculatorClientRateKey)(invalid).pipe(
            Effect.result,
            Effect.tap((result) =>
              Effect.sync(() => {
                EffectFunction.pipe(Result.isFailure(result), (actual) => {
                  expect(actual).toBeTruthy();
                });
              })
            )
          )
      );
    })
  );
  it.effect(
    "missing identity rejects calculation while metadata consumes no unit",
    () =>
      Effect.gen(function* () {
        const calls = yield* Ref.make(0);
        const service = yield* PublicCalculatorService.pipe(
          Effect.provide(
            calculators.pipe(
              Layer.provide(
                Layer.succeed(
                  CalculatorAdmission,
                  CalculatorAdmission.of({
                    admitCalculation: Effect.fn(
                      "CalculatorAdmission.admitCalculation"
                    )(() => Ref.update(calls, (count) => count + 1)),
                  })
                )
              )
            )
          )
        );
        const result = yield* service.calculate(request).pipe(Effect.result);
        expect(result).toStrictEqual(
          Result.fail(new CalculatorAdmissionUnavailable())
        );
        expect(
          (yield* service.listCalculators(MetadataQuery.make({}))).calculators
        ).toHaveLength(3);
        expect(yield* Ref.get(calls)).toBe(0);
      })
  );
  it.effect(
    "rejected admission does no calculation work and carries fixed safe guidance",
    () =>
      Effect.gen(function* () {
        const live = yield* PublicCalculatorService;
        const worked = yield* Ref.make(0);
        const key = yield* Schema.decodeEffect(CalculatorClientRateKey)(
          "203.0.113.75"
        );
        const service = yield* PublicCalculatorService.pipe(
          Effect.provide(
            PublicCalculatorServiceRateLimited.pipe(
              Layer.provide(
                Layer.succeed(
                  PublicCalculatorService,
                  PublicCalculatorService.of({
                    getCalculator: Effect.fn(
                      "PublicCalculatorService.getCalculator"
                    )(live.getCalculator),
                    getCalculatorGraph: Effect.fn(
                      "PublicCalculatorService.getCalculatorGraph"
                    )(live.getCalculatorGraph),
                    getCalculatorSchema: Effect.fn(
                      "PublicCalculatorService.getCalculatorSchema"
                    )(live.getCalculatorSchema),
                    listCalculators: Effect.fn(
                      "PublicCalculatorService.listCalculators"
                    )(live.listCalculators),
                    listFacts: Effect.fn("PublicCalculatorService.listFacts")(
                      live.listFacts
                    ),
                    listJurisdictions: Effect.fn(
                      "PublicCalculatorService.listJurisdictions"
                    )(live.listJurisdictions),
                    listRules: Effect.fn("PublicCalculatorService.listRules")(
                      live.listRules
                    ),
                    listTaxYears: Effect.fn(
                      "PublicCalculatorService.listTaxYears"
                    )(live.listTaxYears),
                    calculate: Effect.fn("PublicCalculatorService.calculate")(
                      () =>
                        Ref.update(worked, (count) => count + 1).pipe(
                          Effect.andThen(Effect.never)
                        )
                    ),
                  })
                )
              ),
              Layer.provide(
                Layer.succeed(
                  CalculatorAdmission,
                  CalculatorAdmission.of({
                    admitCalculation: Effect.fn(
                      "CalculatorAdmission.admitCalculation"
                    )(() => Effect.fail(new CalculatorRateLimited())),
                  })
                )
              )
            )
          )
        );
        const result = yield* service
          .calculate(request)
          .pipe(
            Effect.provideService(CalculatorRequestRateKey, Option.some(key)),
            Effect.result
          );
        expect(result).toStrictEqual(Result.fail(new CalculatorRateLimited()));
        expect(yield* Ref.get(worked)).toBe(0);
        const encoded = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorRateLimited)
        )(new CalculatorRateLimited());
        expect(encoded).not.toContain("203.0.113.75");
        expect(encoded).not.toContain("165400");
      }).pipe(
        Effect.provide(
          PublicCalculatorServiceLive.pipe(Layer.provide(CalculationEngineLive))
        )
      )
  );
  it.effect(
    "the five-second work budget includes stalled admission and its cleanup",
    () =>
      Effect.gen(function* () {
        const started = yield* Deferred.make<boolean>();
        const released = yield* Ref.make(false);
        const key = yield* Schema.decodeEffect(CalculatorClientRateKey)(
          "203.0.113.75"
        );
        const service = yield* PublicCalculatorService.pipe(
          Effect.provide(
            PublicCalculatorServiceBounded.pipe(
              Layer.provide(calculators),
              Layer.provide(
                Layer.succeed(
                  CalculatorAdmission,
                  CalculatorAdmission.of({
                    admitCalculation: Effect.fn(
                      "CalculatorAdmission.admitCalculation"
                    )(() =>
                      Deferred.succeed(started, true).pipe(
                        Effect.andThen(Effect.never),
                        Effect.ensuring(Ref.set(released, true))
                      )
                    ),
                  })
                )
              )
            )
          )
        );
        const pending = yield* service
          .calculate(request)
          .pipe(
            Effect.provideService(CalculatorRequestRateKey, Option.some(key)),
            Effect.result,
            Effect.forkChild
          );
        yield* Deferred.await(started);
        yield* TestClock.adjust("5 seconds");
        const result = yield* Fiber.join(pending);
        EffectFunction.pipe(Result.isFailure(result), (actual) => {
          expect(actual).toBeTruthy();
        });
        if (Result.isFailure(result)) {
          EffectFunction.pipe(
            Predicate.isTagged(result.failure, "CalculatorOperationTimedOut"),
            (matches) => {
              expect(matches).toBeTruthy();
            }
          );
        }
        expect(yield* Ref.get(released)).toBeTruthy();
      })
  );
});
