import { describe, expect, it } from "@effect/vitest";
import { Money, Cents } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import {
  Predicate,
  Function as EffectFunction,
  Cause,
  Effect,
  Match,
  Schema,
} from "effect";

import {
  TaxKitCalculationError,
  toTaxKitCalculationError,
} from "../src/errors.js";
import { TaxKit } from "../src/index.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
} from "../src/testing/index.js";
import { defineSdkCalculation } from "../src/types.js";

class SdkPromiseRejectionError extends Schema.TaggedError<
  SdkPromiseRejectionError,
  {
    readonly brand: unique symbol;
  }
>()("SdkPromiseRejectionError", {
  rejection: Schema.Defect(),
}) {}
const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};
const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/plain-sdk-input.json";
const rejectedFacts = {
  grossPay: `${secretSentinel}:${privatePathSentinel}`,
  taxFreeThresholdClaimed: true,
};
describe("plain SDK facade", () => {
  it.effect("runs calculations through plain Promise methods", () =>
    Effect.gen(function* () {
      const report = yield* Effect.promise(() =>
        TaxKit.calculate(AuPayTakeHomeCalculation, takeHomeFacts)
      );
      EffectFunction.pipe(
        Predicate.isTagged(report, "TakeHomePayReport"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      expect(report.netPay.cents).toBe(130_100);
      expect(report.rulePackVersion).toBe("rules-au-pay/1.0.2");
    })
  );
  it.effect("scopes plain clients to their supplied modules", () =>
    Effect.gen(function* () {
      const client = TaxKit.createClient(AuPay2025_26Module);
      const report = yield* Effect.promise(() =>
        client.calculations.calculate(AuPayTakeHomeCalculation, takeHomeFacts)
      );
      EffectFunction.pipe(
        Predicate.isTagged(report, "TakeHomePayReport"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      yield* Effect.promise(() => client.dispose());
    })
  );
  it.effect("returns Data-owned safe failures for invalid external input", () =>
    Effect.gen(function* () {
      const result = yield* Effect.promise(() =>
        TaxKit.safe.calculate(
          AuPayTakeHomeCalculation,
          // @ts-expect-error runtime diagnostic-safety coverage bypasses the typed boundary.
          rejectedFacts
        )
      );
      EffectFunction.pipe(
        Predicate.isTagged(result, "TaxKitFailure"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      yield* Match.value(result).pipe(
        Match.tag("TaxKitSuccess", () =>
          Effect.sync(() => expect.fail("Expected a safe failure"))
        ),
        Match.tag("TaxKitFailure", (failure) =>
          Effect.gen(function* () {
            EffectFunction.pipe(
              Schema.is(TaxKitCalculationError)(failure.error),
              (actual) => {
                expect(actual).toBeTruthy();
              }
            );
            EffectFunction.pipe(
              Predicate.isTagged(
                failure.error.error,
                "CalculatorInputDecodeError"
              ),
              (matches) => {
                expect(matches).toBeTruthy();
              }
            );
            expect(failure.error.message).toBe("TaxKit calculation failed");
            expect(failure.error.error.message).toBe(
              "Invalid facts for au.pay.take-home"
            );
            expect(
              yield* Schema.encodeEffect(
                Schema.toCodecJson(TaxKitCalculationError)
              )(failure.error)
            ).not.toContain(secretSentinel);
            expect(
              yield* Schema.encodeEffect(
                Schema.toCodecJson(TaxKitCalculationError)
              )(failure.error)
            ).not.toContain(privatePathSentinel);
          })
        ),
        Match.exhaustive
      );
    })
  );
  it.effect("rejects with the same stable safe public error", () =>
    Effect.gen(function* () {
      const rejectedError = yield* Effect.tryPromise({
        catch: (rejection) => new SdkPromiseRejectionError({ rejection }),
        try: () =>
          TaxKit.calculate(
            AuPayTakeHomeCalculation,
            // @ts-expect-error runtime diagnostic-safety coverage bypasses the typed boundary.
            rejectedFacts
          ),
      }).pipe(
        Effect.flip,
        Effect.flatMap((failure) =>
          Schema.decodeUnknownEffect(Schema.toType(TaxKitCalculationError))(
            failure.rejection
          )
        )
      );
      EffectFunction.pipe(
        Schema.is(TaxKitCalculationError)(rejectedError),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
      expect(rejectedError.message).toBe("TaxKit calculation failed");
      EffectFunction.pipe(
        Predicate.isTagged(rejectedError.error, "CalculatorInputDecodeError"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      expect(
        yield* Schema.encodeEffect(Schema.toCodecJson(TaxKitCalculationError))(
          rejectedError
        )
      ).not.toContain(secretSentinel);
      expect(
        yield* Schema.encodeEffect(Schema.toCodecJson(TaxKitCalculationError))(
          rejectedError
        )
      ).not.toContain(privatePathSentinel);
    })
  );
  it.effect("uses a stable safe message for output schema failures", () =>
    Effect.gen(function* () {
      const result = yield* Effect.promise(() =>
        TaxKit.safe.calculate(
          defineSdkCalculation({
            calculatorId: AuPayTakeHomeCalculation.calculatorId,
            inputSchema: AuPayTakeHomeCalculation.inputSchema,
            jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
            outputSchema: AuAnnualIncomeTaxCalculation.outputSchema,
            taxYear: AuPayTakeHomeCalculation.taxYear,
          }),
          takeHomeFacts
        )
      );
      EffectFunction.pipe(
        Predicate.isTagged(result, "TaxKitFailure"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      yield* Match.value(result).pipe(
        Match.tag("TaxKitSuccess", () =>
          Effect.sync(() => expect.fail("Expected a safe failure"))
        ),
        Match.tag("TaxKitFailure", (failure) =>
          Effect.sync(() => {
            expect(failure.error.message).toBe("TaxKit calculation failed");
            EffectFunction.pipe(
              Predicate.isTagged(
                failure.error.error,
                "TaxKitSchemaDecodeError"
              ),
              (matches) => {
                expect(matches).toBeTruthy();
              }
            );
            expect(failure.error.error.message).toBe(
              "TaxKit calculation response failed schema validation"
            );
          })
        ),
        Match.exhaustive
      );
    })
  );
  it.effect("uses a stable safe message for unexpected failures", () =>
    Effect.gen(function* () {
      const unexpectedError = EffectFunction.pipe(
        Cause.die(new Error(`${secretSentinel}:${privatePathSentinel}`)),
        toTaxKitCalculationError
      );
      expect(unexpectedError.message).toBe("TaxKit calculation failed");
      EffectFunction.pipe(
        Predicate.isTagged(unexpectedError.error, "TaxKitUnexpectedError"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      expect(unexpectedError.error.message).toBe(
        "TaxKit calculation failed unexpectedly"
      );
      expect(
        yield* Schema.encodeEffect(Schema.toCodecJson(TaxKitCalculationError))(
          unexpectedError
        )
      ).not.toContain(secretSentinel);
      expect(
        yield* Schema.encodeEffect(Schema.toCodecJson(TaxKitCalculationError))(
          unexpectedError
        )
      ).not.toContain(privatePathSentinel);
    })
  );
  it.effect("keeps generic descriptors usable outside AU helpers", () =>
    Effect.gen(function* () {
      const report = yield* Effect.promise(() =>
        TaxKit.calculate(AuAnnualIncomeTaxCalculation, {
          taxableIncome: new Money({
            cents: Cents.make(9_000_000),
            currency: "AUD",
          }),
        })
      );
      EffectFunction.pipe(
        Predicate.isTagged(report, "AnnualTaxReport"),
        (matches) => {
          expect(matches).toBeTruthy();
        }
      );
      expect(report.liability.cents).toBe(1_958_800);
      expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.1");
    })
  );
});
