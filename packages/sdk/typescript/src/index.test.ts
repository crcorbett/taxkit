import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { Cause, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { TaxKitCalculationError, toTaxKitCalculationError } from "./errors.js";
import { TaxKit } from "./index.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
} from "./testing/index.js";
import { defineSdkCalculation } from "./types.js";

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
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
  it("runs calculations through plain Promise methods", async () => {
    const report = await TaxKit.calculate(
      AuPayTakeHomeCalculation,
      takeHomeFacts
    );

    expect(report._tag).toBe("TakeHomePayReport");
    expect(report.netPay.cents).toBe(130_100);
    expect(report.rulePackVersion).toBe("rules-au-pay/1.0.0");
  });

  it("scopes plain clients to their supplied modules", async () => {
    const client = TaxKit.createClient(AuPay2025_26Module);
    const report = await client.calculations.calculate(
      AuPayTakeHomeCalculation,
      takeHomeFacts
    );

    expect(report._tag).toBe("TakeHomePayReport");
  });

  it("returns Data-owned safe failures for invalid external input", async () => {
    const result = await TaxKit.safe.calculate(
      AuPayTakeHomeCalculation,
      // @ts-expect-error runtime diagnostic-safety coverage bypasses the typed boundary.
      rejectedFacts
    );

    expect(result._tag).toBe("TaxKitFailure");
    if (result._tag === "TaxKitFailure") {
      expect(result.error).toBeInstanceOf(TaxKitCalculationError);
      expect(result.error.error._tag).toBe("CalculatorInputDecodeError");
      expect(result.error.message).toBe("TaxKit calculation failed");
      expect(result.error.error.message).toBe(
        "Invalid facts for au.pay.take-home"
      );
      expect(JSON.stringify(result.error)).not.toContain(secretSentinel);
      expect(JSON.stringify(result.error)).not.toContain(privatePathSentinel);
    }
  });

  it("rejects with the same stable safe public error", async () => {
    const rejection = TaxKit.calculate(
      AuPayTakeHomeCalculation,
      // @ts-expect-error runtime diagnostic-safety coverage bypasses the typed boundary.
      rejectedFacts
    );

    const rejectedError = await rejection.catch((error: unknown) => error);

    expect(rejectedError).toBeInstanceOf(TaxKitCalculationError);
    if (Schema.is(TaxKitCalculationError)(rejectedError)) {
      expect(rejectedError.message).toBe("TaxKit calculation failed");
      expect(rejectedError.error._tag).toBe("CalculatorInputDecodeError");
      expect(JSON.stringify(rejectedError)).not.toContain(secretSentinel);
      expect(JSON.stringify(rejectedError)).not.toContain(privatePathSentinel);
    }
  });

  it("uses a stable safe message for output schema failures", async () => {
    const result = await TaxKit.safe.calculate(
      defineSdkCalculation({
        calculatorId: AuPayTakeHomeCalculation.calculatorId,
        inputSchema: AuPayTakeHomeCalculation.inputSchema,
        jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
        outputSchema: AuAnnualIncomeTaxCalculation.outputSchema,
        taxYear: AuPayTakeHomeCalculation.taxYear,
      }),
      takeHomeFacts
    );

    expect(result._tag).toBe("TaxKitFailure");
    if (result._tag === "TaxKitFailure") {
      expect(result.error.message).toBe("TaxKit calculation failed");
      expect(result.error.error._tag).toBe("TaxKitSchemaDecodeError");
      expect(result.error.error.message).toBe(
        "TaxKit calculation response failed schema validation"
      );
    }
  });

  it("uses a stable safe message for unexpected failures", () => {
    const unexpectedError = toTaxKitCalculationError(
      Cause.die(new Error(`${secretSentinel}:${privatePathSentinel}`))
    );
    expect(unexpectedError.message).toBe("TaxKit calculation failed");
    expect(unexpectedError.error._tag).toBe("TaxKitUnexpectedError");
    expect(unexpectedError.error.message).toBe(
      "TaxKit calculation failed unexpectedly"
    );
    expect(JSON.stringify(unexpectedError)).not.toContain(secretSentinel);
    expect(JSON.stringify(unexpectedError)).not.toContain(privatePathSentinel);
  });

  it("keeps generic descriptors usable outside AU helpers", async () => {
    const report = await TaxKit.calculate(AuAnnualIncomeTaxCalculation, {
      taxableIncome: aud(9_000_000),
    });

    expect(report._tag).toBe("AnnualTaxReport");
    expect(report.liability.cents).toBe(1_958_800);
    expect(report.rulePackVersion).toBe("rules-au-income-tax/1.0.0");
  });
});
