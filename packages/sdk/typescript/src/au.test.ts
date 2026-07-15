import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { describe, expect, it } from "vitest";

import { au } from "./au.js";

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

describe("AU SDK subpath", () => {
  it("exposes typed current AU convenience helpers", async () => {
    const report = await au.pay.takeHomePay(takeHomeFacts);

    expect(report._tag).toBe("TakeHomePayReport");
    expect(report.netPay.cents).toBe(130_100);
  });

  it("keeps AU helpers thin over the generic descriptor client", async () => {
    const client = au.createClient();
    const [helperReport, descriptorReport] = await Promise.all([
      au.incomeTax.annual({ taxableIncome: aud(9_000_000) }),
      client.calculations.calculate(au.calculations.annualIncomeTax, {
        taxableIncome: aud(9_000_000),
      }),
    ]);

    expect(helperReport).toEqual(descriptorReport);
  });

  it("returns safe AU failures through SDK-owned result values", async () => {
    const result = await au.pay.safe.takeHomePay(
      // @ts-expect-error runtime coverage bypasses the typed SDK boundary.
      { taxableIncome: aud(9_000_000) }
    );

    expect(result._tag).toBe("TaxKitFailure");
  });
});
