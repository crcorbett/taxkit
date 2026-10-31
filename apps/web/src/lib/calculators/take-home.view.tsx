import type { TakeHomeForm } from "@taxkit/calculators/form";
import type { TakeHomePayReport } from "@taxkit/rules-au-pay/schemas";
import { Predicate, Boolean as EffectBoolean } from "effect";
import type { Option } from "effect";

import { TakeHomeResultView } from "./take-home-result.view";

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
    <noscript>
      <p role="alert">Turn on JavaScript to use this calculator.</p>
    </noscript>
    <form
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
          onChange={(event) => {
            onEdit({ ...form, grossDollars: event.currentTarget.value });
          }}
        />
      </label>
      <label>
        Pay period
        <select
          name="period"
          value={form.period}
          onChange={(event) => {
            onEdit({ ...form, period: event.currentTarget.value });
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
          checked={form.taxFreeThresholdClaimed}
          onChange={(event) => {
            onEdit({
              ...form,
              taxFreeThresholdClaimed: event.currentTarget.checked,
            });
          }}
        />{" "}
        Claim the tax-free threshold
      </label>
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
    <TakeHomeResultView report={report} stale={stale} />
  </section>
);
