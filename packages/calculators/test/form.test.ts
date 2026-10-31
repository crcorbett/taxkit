import { describe, expect, it } from "@effect/vitest";
import { AuAnnualTaxCalculatorId } from "@taxkit/rules-au-income-tax/schemas";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import { Function as EffectFunction, Result } from "effect";

import {
  AnnualTaxForm,
  annualTaxRequestFromForm,
  initialTakeHomeForm,
  requestFromForm,
  takeHomeRequestFromForm,
} from "../src/form.ingress.js";

describe("calculator form admission", () => {
  it("keeps the chosen pay calculator and checked annual facts", () => {
    const withholdingsId = AuPayCalculatorId.make("au.pay.withholdings");
    const pay = takeHomeRequestFromForm(initialTakeHomeForm, withholdingsId);
    expect(Result.isSuccess(pay) && pay.success.calculatorId).toBe(
      "au.pay.withholdings"
    );
    const annual = EffectFunction.pipe(
      AnnualTaxForm.make({ taxableDollars: "67000" }),
      annualTaxRequestFromForm
    );
    EffectFunction.pipe(Result.isSuccess(annual), (actual) => {
      expect(actual).toBeTruthy();
    });
    const request = annual.pipe(
      Result.match({
        onFailure: () =>
          expect.fail("Expected a checked annual calculation request"),
        onSuccess: (value) => value,
      })
    );
    expect(request.calculatorId).toBe("au.income-tax.annual");
    expect(request.payload.facts).toMatchObject({
      taxableIncome: { cents: 6_700_000, currency: "AUD" },
    });
  });

  it("rejects invalid annual numbers before making a work request", () => {
    EffectFunction.pipe(
      Result.isFailure(
        EffectFunction.pipe(
          AnnualTaxForm.make({ taxableDollars: "invalid" }),
          annualTaxRequestFromForm
        )
      ),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    EffectFunction.pipe(
      Result.isFailure(
        EffectFunction.pipe(
          AnnualTaxForm.make({ taxableDollars: "Infinity" }),
          annualTaxRequestFromForm
        )
      ),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
  });

  it("refuses a form of the other calculator's kind", () => {
    const annualId = AuAnnualTaxCalculatorId.make("au.income-tax.annual");
    EffectFunction.pipe(
      requestFromForm(annualId, initialTakeHomeForm),
      Result.isFailure,
      (refused) => {
        expect(refused).toBeTruthy();
      }
    );
    const payId = AuPayCalculatorId.make("au.pay.take-home");
    const annualForm = AnnualTaxForm.make({ taxableDollars: "67000" });
    EffectFunction.pipe(
      requestFromForm(payId, annualForm),
      Result.isFailure,
      (refused) => {
        expect(refused).toBeTruthy();
      }
    );
  });
});
