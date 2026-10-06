import { describe, expect, it } from "@effect/vitest";
import { Money, Cents } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { Cause, Effect, Match, Schema } from "effect";

import { TaxKitCalculationError, toTaxKitCalculationError } from "./errors.js";
import { TaxKit } from "./index.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
} from "./testing/index.js";
import { defineSdkCalculation } from "./types.js";

class SdkPromiseRejectionError extends Schema.TaggedError<SdkPromiseRejectionError>()(
  "SdkPromiseRejectionError",
  {
    rejection: Schema.Unknown,
  }
) {}

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

      expect(report._tag).toBe("TakeHomePayReport");
      expect(report.netPay.cents).toBe(130_100);
      expect(report.rulePackVersion).toBe("rules-au-pay/1.0.0");
    })
  );

  it.effect("scopes plain clients to their supplied modules", () =>
    Effect.gen(function* () {
      const client = TaxKit.createClient(AuPay2025_26Module);
      const report = yield* Effect.promise(() =>
        client.calculations.calculate(AuPayTakeHomeCalculation, takeHomeFacts)
      );

      expect(report._tag).toBe("TakeHomePayReport");
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

      expect(result._tag).toBe("TaxKitFailure");
      yield* Match.value(result).pipe(
        Match.tag("TaxKitSuccess", () =>
          Effect.sync(() => expect.fail("Expected a safe failure"))
        ),
        Match.tag("TaxKitFailure", (failure) =>
          Effect.gen(function* () {
            expect(Schema.is(TaxKitCalculationError)(failure.error)).toBe(true);
            expect(failure.error.error._tag).toBe("CalculatorInputDecodeError");
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
          Schema.decodeUnknownEffect(TaxKitCalculationError)(failure.rejection)
        )
      );

      expect(Schema.is(TaxKitCalculationError)(rejectedError)).toBe(true);
      expect(rejectedError.message).toBe("TaxKit calculation failed");
      expect(rejectedError.error._tag).toBe("CalculatorInputDecodeError");
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

      expect(result._tag).toBe("TaxKitFailure");
      yield* Match.value(result).pipe(
        Match.tag("TaxKitSuccess", () =>
          Effect.sync(() => expect.fail("Expected a safe failure"))
        ),
        Match.tag("TaxKitFailure", (failure) =>
          Effect.sync(() => {
            expect(failure.error.message).toBe("TaxKit calculation failed");
            expect(failure.error.error._tag).toBe("TaxKitSchemaDecodeError");
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
      const unexpectedError = toTaxKitCalculationError(
        Cause.die(new Error(`${secretSentinel}:${privatePathSentinel}`))
      );
      expect(unexpectedError.message).toBe("TaxKit calculation failed");
      expect(unexpectedError.error._tag).toBe("TaxKitUnexpectedError");
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

      expect(report._tag).toBe("AnnualTaxReport");
      expect(report.liability.cents).toBe(1_958_800);
      expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.0");
    })
  );
});
