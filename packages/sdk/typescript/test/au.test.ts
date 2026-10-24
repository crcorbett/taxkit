import { describe, expect, it } from "@effect/vitest";
import { Money, Cents } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { Effect } from "effect";

import { au } from "../src/au.js";

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

describe("AU SDK subpath", () => {
  it.effect("keeps the monthly 33-cent correction through the public SDK", () =>
    Effect.gen(function* () {
      const report = yield* Effect.promise(() =>
        au.pay.takeHomePay({
          grossPay: new GrossPay({
            amount: new Money({ cents: Cents.make(260_433), currency: "AUD" }),
            period: "monthly",
          }),
          taxFreeThresholdClaimed: true,
        })
      );
      expect(report.withholdingsTotal.cents).toBe(21_200);
      expect(report.rulePackVersion).toBe("rules-au-pay/1.0.2");
    })
  );
  it.effect("exposes typed current AU convenience helpers", () =>
    Effect.gen(function* () {
      const report = yield* Effect.promise(() =>
        au.pay.takeHomePay(takeHomeFacts)
      );

      expect(report._tag).toBe("TakeHomePayReport");
      expect(report.netPay.cents).toBe(130_100);
      expect(report.rulePackVersion).toBe("rules-au-pay/1.0.2");
    })
  );

  it.effect("keeps AU helpers thin over the generic descriptor client", () =>
    Effect.gen(function* () {
      const client = au.createClient();
      const [helperReport, descriptorReport] = yield* Effect.all(
        [
          Effect.promise(() =>
            au.incomeTax.annual({
              taxableIncome: new Money({
                cents: Cents.make(9_000_000),
                currency: "AUD",
              }),
            })
          ),
          Effect.promise(() =>
            client.calculations.calculate(au.calculations.annualIncomeTax, {
              taxableIncome: new Money({
                cents: Cents.make(9_000_000),
                currency: "AUD",
              }),
            })
          ),
        ],
        { concurrency: "unbounded" }
      );

      expect(helperReport).toEqual(descriptorReport);
      expect(helperReport.rulePackVersion).toBe("rules-au-income-tax/1.0.1");
      yield* Effect.promise(() => client.dispose());
    })
  );

  it.effect("returns safe AU failures through SDK-owned result values", () =>
    Effect.gen(function* () {
      const result = yield* Effect.promise(() =>
        au.pay.safe.takeHomePay({
          // @ts-expect-error runtime coverage bypasses the typed SDK boundary.
          taxableIncome: new Money({
            cents: Cents.make(9_000_000),
            currency: "AUD",
          }),
        })
      );

      expect(result._tag).toBe("TaxKitFailure");
    })
  );
});
