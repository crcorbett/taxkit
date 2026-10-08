import { describe, expect, it } from "@effect/vitest";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculatorServiceError } from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { CalculationEngineLive } from "@taxkit/core";
import { Money, Cents } from "@taxkit/core/primitives";
import { AuPayCalculatorId, GrossPay } from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import {
  Array as EffectArray,
  Cause,
  Effect,
  Exit,
  Layer,
  Match,
  Option,
  Schema,
} from "effect";

import { calculateReport, calculateRunRequest } from "./effect.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeCalculation,
} from "./testing/index.js";

const ServiceLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/effect-sdk-input.json";

describe("Effect SDK facade", () => {
  it.effect(
    "keeps selected-calculator help when omitted options use defaults",
    () =>
      Effect.gen(function* () {
        const error = yield* calculateRunRequest(AuPayTakeHomeCalculation, {
          help: Option.some(Option.some("errors")),
          payload: {
            facts: {
              // @ts-expect-error rejected external input must still reach the selected calculator decoder.
              grossPay: `${secretSentinel}:${privatePathSentinel}`,
              taxFreeThresholdClaimed: true,
            },
          },
        }).pipe(Effect.flip);
        yield* Match.value(error).pipe(
          Match.tag("CalculatorInputDecodeError", (failure) =>
            Effect.gen(function* () {
              expect(
                EffectArray.map(failure.issues, (issue) => issue.path)
              ).toContainEqual(["grossPay"]);
              expect(
                failure.help.pipe(
                  Option.flatten,
                  Option.map((help) => help.length)
                )
              ).toEqual(Option.some(2));
              const wire = yield* Schema.encodeEffect(
                Schema.toCodecJson(CalculatorServiceError)
              )(failure);
              expect(wire).not.toContain(secretSentinel);
              expect(wire).not.toContain(privatePathSentinel);
            })
          ),
          Match.orElse(() =>
            Effect.sync(() => expect.fail("Expected selected calculator help"))
          )
        );
      }).pipe(Effect.provide(ServiceLive))
  );

  it.effect(
    "returns the full canonical calculator run response with decoded report",
    () =>
      Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const sdkResult = yield* calculateRunRequest(AuPayTakeHomeCalculation, {
          payload: {
            facts: takeHomeFacts,
            jurisdiction: Option.some(
              Option.some(AuPayTakeHomeCalculation.jurisdiction)
            ),
            taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
          },
        });
        const serviceResult = yield* service.calculate({
          calculatorId: AuPayTakeHomeCalculation.calculatorId,
          help: Option.none(),
          payload: {
            facts: takeHomeFacts,
            jurisdiction: Option.some(
              Option.some(AuPayTakeHomeCalculation.jurisdiction)
            ),
            taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
          },
        });

        expect(sdkResult).toEqual(serviceResult);
        expect(sdkResult.report._tag).toBe("TakeHomePayReport");
        expect(sdkResult.report.rulePackVersion).toBe("rules-au-pay/1.0.0");
      }).pipe(Effect.provide(ServiceLive))
  );

  it.effect(
    "matches PublicCalculatorService for a successful calculation",
    () =>
      Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const sdkResult = yield* calculateReport(
          AuPayTakeHomeCalculation,
          takeHomeFacts
        );
        const serviceResult = yield* service.calculate({
          calculatorId: AuPayTakeHomeCalculation.calculatorId,
          help: Option.none(),
          payload: {
            facts: takeHomeFacts,
            jurisdiction: Option.some(
              Option.some(AuPayTakeHomeCalculation.jurisdiction)
            ),
            taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
          },
        });

        expect(sdkResult).toEqual(serviceResult.report);
      }).pipe(Effect.provide(ServiceLive))
  );

  it.effect("preserves guided calculator input errors from the service", () =>
    Effect.gen(function* () {
      const service = yield* PublicCalculatorService;
      const invalidFacts = {
        rejectedSource: `${secretSentinel}:${privatePathSentinel}`,
        taxableIncome: new Money({
          cents: Cents.make(9_000_000),
          currency: "AUD",
        }),
      };
      const sdkExit = yield* calculateReport(
        AuPayTakeHomeCalculation,
        // @ts-expect-error runtime parity covers invalid external input after the typed boundary is bypassed.
        invalidFacts
      ).pipe(Effect.exit);
      const serviceExit = yield* service
        .calculate({
          calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
          help: Option.none(),
          payload: {
            facts: invalidFacts,
            jurisdiction: Option.some(
              Option.some(AuPayTakeHomeCalculation.jurisdiction)
            ),
            taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
          },
        })
        .pipe(Effect.exit);

      expect(Exit.isFailure(sdkExit)).toBe(true);
      expect(Exit.isFailure(serviceExit)).toBe(true);

      if (Exit.isFailure(sdkExit) && Exit.isFailure(serviceExit)) {
        const sdkFailure = expectAt(
          EffectArray.filter(sdkExit.cause.reasons, Cause.isFailReason),
          0
        );
        const serviceFailure = expectAt(
          EffectArray.filter(serviceExit.cause.reasons, Cause.isFailReason),
          0
        );

        expect(sdkFailure.error).toEqual(serviceFailure.error);
        expect(sdkFailure.error._tag).toBe("CalculatorInputDecodeError");
        const encodedError = yield* Match.value(sdkFailure.error).pipe(
          Match.tag("SchemaError", () =>
            Effect.sync(() => expect.fail("Expected calculator input error"))
          ),
          Match.orElse((error) =>
            Schema.encodeEffect(Schema.toCodecJson(CalculatorServiceError))(
              error
            )
          )
        );
        expect(encodedError).not.toContain(secretSentinel);
        expect(encodedError).not.toContain(privatePathSentinel);
      }
    }).pipe(Effect.provide(ServiceLive))
  );

  it.effect(
    "narrows canonical reports without decoding their wire form again",
    () =>
      Effect.gen(function* () {
        const service = yield* PublicCalculatorService;
        const response = yield* service.calculate({
          calculatorId: AuPayTakeHomeCalculation.calculatorId,
          help: Option.none(),
          payload: {
            facts: takeHomeFacts,
            jurisdiction: Option.some(
              Option.some(AuPayTakeHomeCalculation.jurisdiction)
            ),
            taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
          },
        });
        const report = yield* AuPayTakeHomeCalculation.decodeOutput(
          response.report
        );
        expect(report).toEqual(response.report);
        const encoded = yield* Schema.encodeEffect(
          AuPayTakeHomeCalculation.outputSchema
        )(report);
        const wireAsDomain = yield* AuPayTakeHomeCalculation.decodeOutput(
          encoded
        ).pipe(Effect.exit);
        expect(Exit.isFailure(wireAsDomain)).toBe(true);
        const malformed = yield* AuPayTakeHomeCalculation.decodeOutput({
          ...report,
          trace: { ...report.trace, formula: secretSentinel },
        }).pipe(Effect.exit);
        expect(Exit.isFailure(malformed)).toBe(true);
      }).pipe(Effect.provide(ServiceLive))
  );

  it.effect(
    "keeps annual-tax descriptors executable through the same facade",
    () =>
      Effect.gen(function* () {
        const report = yield* calculateReport(AuAnnualIncomeTaxCalculation, {
          taxableIncome: new Money({
            cents: Cents.make(9_000_000),
            currency: "AUD",
          }),
        });

        expect(report._tag).toBe("AnnualTaxReport");
        expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.1");
        expect(report.liability.cents).toBe(1_958_800);
      }).pipe(Effect.provide(ServiceLive))
  );
});
