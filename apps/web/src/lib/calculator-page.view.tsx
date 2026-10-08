import type { CalculatorRunServiceRequest } from "@taxkit/api-rpc/schemas";
import type { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import type { PayWithholdingsLedger } from "@taxkit/rules-au-pay/schemas";
import type { Option } from "effect";

import { CalculatorPageResultView } from "./calculator-page-result.view";
import type { WebsiteCalculatorForm } from "./form.boundary";

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
  readonly form: WebsiteCalculatorForm;
  readonly title: string;
  readonly year: string;
  readonly busy: boolean;
  readonly message: string | undefined;
  readonly report: Option.Option<AnnualTaxReport | PayWithholdingsLedger>;
  readonly stale: boolean;
  readonly onEdit: (form: WebsiteCalculatorForm) => void;
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
    <form
      action={`/calculators/${calculatorId}`}
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        onCalculate();
      }}
    >
      {"taxableDollars" in form ? (
        <label>
          Annual taxable income ($)
          <input
            name="taxableDollars"
            inputMode="decimal"
            value={form.taxableDollars}
            onChange={(event) =>
              onEdit({ ...form, taxableDollars: event.currentTarget.value })
            }
          />
        </label>
      ) : (
        <>
          <label>
            Pay before tax ($)
            <input
              name="grossDollars"
              inputMode="decimal"
              value={form.grossDollars}
              onChange={(event) =>
                onEdit({ ...form, grossDollars: event.currentTarget.value })
              }
            />
          </label>
          <label>
            Pay period
            <select
              name="period"
              value={form.period}
              onChange={(event) =>
                onEdit({ ...form, period: event.currentTarget.value })
              }
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
              checked={form.taxFreeThresholdClaimed}
              onChange={(event) =>
                onEdit({
                  ...form,
                  taxFreeThresholdClaimed: event.currentTarget.checked,
                })
              }
            />{" "}
            Claim the tax-free threshold
          </label>
        </>
      )}
      <button type="submit" disabled={busy}>
        {busy ? "Calculating…" : "Calculate"}
      </button>
    </form>
    {message && <p role="alert">{message}</p>}
    <CalculatorPageResultView report={report} stale={stale} />
  </section>
);
