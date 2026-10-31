import { AnnualTaxForm } from "@taxkit/calculators/form";
import type { CalculatorForm } from "@taxkit/calculators/form";
import type { CalculatorRunServiceRequest } from "@taxkit/calculators/schemas";
import type { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import type { PayWithholdingsLedger } from "@taxkit/rules-au-pay/schemas";
import { Predicate, Boolean as EffectBoolean, Match, Schema } from "effect";
import type { Option } from "effect";

import { CalculatorPageResultView } from "./calculator-page-result.view";

export const CalculatorPageView = ({
  calculatorId,
  form,
  title,
  year,
  busy,
  message,
  report,
  stale,
  onEdit,
  onCalculate,
}: {
  readonly calculatorId: CalculatorRunServiceRequest["calculatorId"];
  readonly form: CalculatorForm;
  readonly title: string;
  readonly year: string;
  readonly busy: boolean;
  readonly message: string | undefined;
  readonly report: Option.Option<AnnualTaxReport | PayWithholdingsLedger>;
  readonly stale: boolean;
  readonly onEdit: (form: CalculatorForm) => void;
  readonly onCalculate: () => void;
}) => (
  <section className="home">
    <h1>TaxKit</h1>
    <h2>{title}</h2>
    <p>{year} tax year · Australia</p>
    {calculatorId === "au.income-tax.annual" && (
      <p role="note">
        The Medicare levy thresholds in this calculator are awaiting correction.
        Its answer may overstate the levy for some lower incomes. Check the
        current thresholds before relying on the answer.
      </p>
    )}
    <noscript>
      <p role="alert">Turn on JavaScript to use this calculator.</p>
    </noscript>
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onCalculate();
      }}
    >
      {Match.value(form).pipe(
        Match.when(Schema.is(AnnualTaxForm), (annualForm) => (
          <label>
            Annual taxable income ($)
            <input
              name="taxableDollars"
              inputMode="decimal"
              value={annualForm.taxableDollars}
              onChange={(event) => {
                onEdit({
                  ...annualForm,
                  taxableDollars: event.currentTarget.value,
                });
              }}
            />
          </label>
        )),
        Match.orElse((withholdingForm) => (
          <>
            <label>
              Pay before tax ($)
              <input
                name="grossDollars"
                inputMode="decimal"
                value={withholdingForm.grossDollars}
                onChange={(event) => {
                  onEdit({
                    ...withholdingForm,
                    grossDollars: event.currentTarget.value,
                  });
                }}
              />
            </label>
            <label>
              Pay period
              <select
                name="period"
                value={withholdingForm.period}
                onChange={(event) => {
                  onEdit({
                    ...withholdingForm,
                    period: event.currentTarget.value,
                  });
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label>
              <input
                name="taxFreeThresholdClaimed"
                type="checkbox"
                checked={withholdingForm.taxFreeThresholdClaimed}
                onChange={(event) => {
                  onEdit({
                    ...withholdingForm,
                    taxFreeThresholdClaimed: event.currentTarget.checked,
                  });
                }}
              />{" "}
              Claim the tax-free threshold
            </label>
          </>
        ))
      )}
      <button type="submit" disabled={busy}>
        {EffectBoolean.match(busy, {
          onFalse: (): "Calculate" => "Calculate",
          onTrue: (): "Calculating…" => "Calculating…",
        })}
      </button>
    </form>
    {!Predicate.isUndefined(message) && message !== "" && (
      <p role="alert">{message}</p>
    )}
    <CalculatorPageResultView report={report} stale={stale} />
  </section>
);
