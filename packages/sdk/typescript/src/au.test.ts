import { describe, expect, it } from "@effect/vitest";
import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { Effect } from "effect";

import { au } from "./au.js";

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

describe("AU SDK subpath", () => {
  it.effect("exposes typed current AU convenience helpers", () =>
    Effect.gen(function* () {
      const report = yield* Effect.promise(() =>
        au.pay.takeHomePay(takeHomeFacts)
      );

      expect(report._tag).toBe("TakeHomePayReport");
      expect(report.netPay.cents).toBe(130_100);
      expect(report.rulePackVersion).toBe("rules-au-pay/1.0.0");
    })
  );

  it.effect("keeps AU helpers thin over the generic descriptor client", () =>
    Effect.gen(function* () {
      const client = au.createClient();
      const [helperReport, descriptorReport] = yield* Effect.all(
        [
          Effect.promise(() =>
            au.incomeTax.annual({ taxableIncome: aud(9_000_000) })
          ),
          Effect.promise(() =>
            client.calculations.calculate(au.calculations.annualIncomeTax, {
              taxableIncome: aud(9_000_000),
            })
          ),
        ],
        { concurrency: "unbounded" }
      );

      expect(helperReport).toEqual(descriptorReport);
      expect(helperReport.rulePackVersion).toBe("rules-au-income-tax/1.0.0");
      yield* Effect.promise(() => client.dispose());
    })
  );

  it.effect("returns safe AU failures through SDK-owned result values", () =>
    Effect.gen(function* () {
      const result = yield* Effect.promise(() =>
        au.pay.safe.takeHomePay(
          // @ts-expect-error runtime coverage bypasses the typed SDK boundary.
          { taxableIncome: aud(9_000_000) }
        )
      );

      expect(result._tag).toBe("TaxKitFailure");
    })
  );
});
