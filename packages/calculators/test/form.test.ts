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
    const pay = EffectFunction.pipe(initialTakeHomeForm, (argument1) =>
      EffectFunction.pipe(
        AuPayCalculatorId.make("au.pay.withholdings"),
        (argument2) => takeHomeRequestFromForm(argument1, argument2)
      )
    );
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
    EffectFunction.pipe(
      Result.isFailure(
        EffectFunction.pipe(
          AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
          (argument3) =>
            EffectFunction.pipe(initialTakeHomeForm, (argument4) =>
              requestFromForm(argument3, argument4)
            )
        )
      ),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    EffectFunction.pipe(
      Result.isFailure(
        EffectFunction.pipe(
          AuPayCalculatorId.make("au.pay.take-home"),
          (argument5) =>
            EffectFunction.pipe(
              AnnualTaxForm.make({ taxableDollars: "67000" }),
              (argument6) => requestFromForm(argument5, argument6)
            )
        )
      ),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
  });
});
