import type { TakeHomePayReport } from "@taxkit/rules-au-pay/schemas";
import { Array, Match, Option, Record } from "effect";

export const TakeHomeResultView = ({
  report,
  stale,
}: {
  readonly report: Option.Option<TakeHomePayReport>;
  readonly stale: boolean;
}) => {
  const currency = new Intl.NumberFormat("en-AU", {
    currency: "AUD",
    style: "currency",
  });
  return (
    <>
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
            <strong>{currency.format(report.value.netPay.cents / 100)}</strong>
          </span>
        )}
      </output>
      {Option.isSome(report) && (
        <details className="calculation-details">
          <summary>How this answer was worked out</summary>
          <h3>Pay breakdown</h3>
          <p>
            These details belong to the answer above, even when you change the
            form. Amounts are in Australian dollars for a {report.value.period}{" "}
            pay period.
          </p>
          <dl>
            <div>
              <dt>Pay before tax</dt>
              <dd>{currency.format(report.value.grossPay.cents / 100)}</dd>
            </div>
            <div>
              <dt>Pay used to calculate withholding</dt>
              <dd>{currency.format(report.value.taxablePay.cents / 100)}</dd>
            </div>
            {Array.map(report.value.withholdings.components, (component) => (
              <div key={component.id}>
                <dt>{component.label}</dt>
                <dd>
                  {currency.format(component.amount.cents / 100)}
                  {component.status !== "active" && " (not included in total)"}
                </dd>
              </div>
            ))}
            <div>
              <dt>Total withheld</dt>
              <dd>
                {currency.format(report.value.withholdingsTotal.cents / 100)}
              </dd>
            </div>
          </dl>
          <h3>Assumptions and limits</h3>
          <ul>
            <li>2025–26 tax year, for an Australian resident.</li>
            <li>
              PAYG withholding only: tax taken from this pay, rather than your
              final annual tax bill.
            </li>
            <li>
              Other deductions, study-loan repayments and salary sacrifice are
              not included.
            </li>
            {Array.map(report.value.withholdings.components, (component) =>
              Record.get(component.trace.inputs, "scale").pipe(
                Option.match({
                  onNone: () => null,
                  onSome: (scale) =>
                    Match.value(scale).pipe(
                      Match.when("scale1", () => (
                        <li key={component.id}>
                          Tax-free threshold not claimed.
                        </li>
                      )),
                      Match.when("scale2", () => (
                        <li key={component.id}>Tax-free threshold claimed.</li>
                      )),
                      Match.orElse(() => null)
                    ),
                })
              )
            )}
          </ul>
          <h3>Rule sources</h3>
          <ul>
            {Array.flatMap(report.value.withholdings.components, (component) =>
              Array.map(component.trace.sources, (source) => (
                <li key={`${component.id}:${source.reference}`}>
                  {URL.canParse(source.reference) &&
                  source.reference.startsWith("https://") ? (
                    <a href={source.reference}>{source.title}</a>
                  ) : (
                    <span>
                      {source.title}: {source.reference}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </details>
      )}
    </>
  );
};
