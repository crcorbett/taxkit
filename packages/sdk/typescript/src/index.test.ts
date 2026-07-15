import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { describe, expect, it } from "vitest";

import { TaxKitCalculationError } from "./errors.js";
import { TaxKit } from "./index.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
} from "./testing/index.js";

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
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
      // @ts-expect-error runtime coverage bypasses the typed SDK boundary.
      { taxableIncome: aud(9_000_000) }
    );

    expect(result._tag).toBe("TaxKitFailure");
    if (result._tag === "TaxKitFailure") {
      expect(result.error).toBeInstanceOf(TaxKitCalculationError);
      expect(result.error.error._tag).toBe("CalculatorInputDecodeError");
      expect(result.error.message).toContain(
        "Invalid facts for au.pay.take-home"
      );
    }
  });

  it("keeps generic descriptors usable outside AU helpers", async () => {
    const report = await TaxKit.calculate(AuAnnualIncomeTaxCalculation, {
      taxableIncome: aud(9_000_000),
    });

    expect(report._tag).toBe("AnnualTaxReport");
    expect(report.liability.cents).toBe(1_958_800);
  });
});
