import type { TakeHomePayReport } from "@taxkit/rules-au-pay/schemas";
import { Option } from "effect";

import type { TakeHomeForm } from "./form.boundary";

export const TakeHomeFormView = ({
  form,
  busy,
  message,
  report,
  stale,
  onEdit,
  onCalculate,
}: {
  readonly form: TakeHomeForm;
  readonly busy: boolean;
  readonly message: string | undefined;
  readonly report: Option.Option<TakeHomePayReport>;
  readonly stale: boolean;
  readonly onEdit: (form: TakeHomeForm) => void;
  readonly onCalculate: () => void;
}) => (
  <section className="home">
    <h1>TaxKit</h1>
    <h2>Australian take-home pay</h2>
    <p>2025–26 tax year</p>
    <form
      action="/"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        onCalculate();
      }}
    >
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
      <button type="submit" disabled={busy}>
        {busy ? "Calculating…" : "Calculate"}
      </button>
    </form>
    {message && <p role="alert">{message}</p>}
    <output
      aria-atomic="true"
      aria-label="Calculation result"
      aria-live="polite"
    >
      {Option.isSome(report) && stale && (
        <span>This answer is out of date. Calculate again to update it.</span>
      )}
      {Option.isSome(report) && (
        <span>
          Take-home pay:{" "}
          <strong>
            {new Intl.NumberFormat("en-AU", {
              currency: "AUD",
              style: "currency",
            }).format(report.value.netPay.cents / 100)}
          </strong>
        </span>
      )}
    </output>
  </section>
);
