import { describe, expect, it } from "@effect/vitest";
import { AuAnnualTaxCalculatorId } from "@taxkit/rules-au-income-tax/schemas";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import { Result } from "effect";

import {
  AnnualTaxForm,
  annualTaxRequestFromForm,
  initialTakeHomeForm,
  requestFromForm,
  takeHomeRequestFromForm,
} from "../src/form.ingress.js";

describe("calculator form admission", () => {
  it("keeps the chosen pay calculator and checked annual facts", () => {
    const pay = takeHomeRequestFromForm(
      initialTakeHomeForm,
      AuPayCalculatorId.make("au.pay.withholdings")
    );
    expect(Result.isSuccess(pay) && pay.success.calculatorId).toBe(
      "au.pay.withholdings"
    );
    const annual = annualTaxRequestFromForm(
      AnnualTaxForm.make({ taxableDollars: "67000" })
    );
    expect(Result.isSuccess(annual)).toBe(true);
    if (Result.isSuccess(annual)) {
      expect(annual.success.calculatorId).toBe("au.income-tax.annual");
      expect(annual.success.payload.facts).toMatchObject({
        taxableIncome: { cents: 6_700_000, currency: "AUD" },
      });
    }
  });
  it("rejects invalid annual numbers before making a work request", () => {
    expect(
      Result.isFailure(
        annualTaxRequestFromForm(
          AnnualTaxForm.make({ taxableDollars: "invalid" })
        )
      )
    ).toBe(true);
    expect(
      Result.isFailure(
        annualTaxRequestFromForm(
          AnnualTaxForm.make({ taxableDollars: "Infinity" })
        )
      )
    ).toBe(true);
  });
  it("refuses a form of the other calculator's kind", () => {
    expect(
      Result.isFailure(
        requestFromForm(
          AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
          initialTakeHomeForm
        )
      )
    ).toBe(true);
    expect(
      Result.isFailure(
        requestFromForm(
          AuPayCalculatorId.make("au.pay.take-home"),
          AnnualTaxForm.make({ taxableDollars: "67000" })
        )
      )
    ).toBe(true);
  });
});
