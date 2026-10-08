import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import type { PayWithholdingsLedger } from "@taxkit/rules-au-pay/schemas";
import { Array, Match, Option, Record, Schema } from "effect";

export const CalculatorPageResultView = ({
  report,
  stale,
}: {
  readonly report: Option.Option<AnnualTaxReport | PayWithholdingsLedger>;
  readonly stale: boolean;
}) => {
  const currency = new Intl.NumberFormat("en-AU", {
    currency: "AUD",
    style: "currency",
  });
  const answer = Option.getOrUndefined(report);
  const annual = Schema.is(AnnualTaxReport)(answer);
  const components = report.pipe(
    Option.map((value) =>
      Match.value(value).pipe(
        Match.tag(
          "AnnualTaxReport",
          (annualReport) => annualReport.ledger.components
        ),
        Match.tag("PayWithholdingsLedger", (payReport) => payReport.components),
        Match.exhaustive
      )
    ),
    Option.getOrElse(() => [])
  );
  return (
    <>
      <output
        aria-atomic="true"
        aria-label="Calculation result"
        aria-live="polite"
      >
        {answer !== undefined && stale && (
          <span>This answer is out of date. Calculate again to update it.</span>
        )}
        {answer !== undefined && (
          <span>
            {annual ? "Annual tax liability" : "Total withheld"}:{" "}
            <strong>
              {currency.format(
                (annual ? answer.liability.cents : answer.total.cents) / 100
              )}
            </strong>
          </span>
        )}
      </output>
      {answer !== undefined && (
        <details className="calculation-details">
          <summary>How this answer was worked out</summary>
          <h3>{annual ? "Annual tax breakdown" : "Withholding breakdown"}</h3>
          <p>
            These details belong to the answer above, even when you change the
            form. Amounts are in Australian dollars
            {annual ? " for the year." : ` for a ${answer.period} pay period.`}
          </p>
          <dl>
            {annual && (
              <div>
                <dt>Annual taxable income</dt>
                <dd>{currency.format(answer.taxableIncome.cents / 100)}</dd>
              </div>
            )}
            {Array.map(components, (component) => (
              <div key={component.id}>
                <dt>{component.label}</dt>
                <dd>
                  {currency.format(component.amount.cents / 100)}
                  {component.effect === "subtractive" && " (reduces the total)"}
                  {component.status !== "active" && " (not included in total)"}
                </dd>
              </div>
            ))}
            {annual && (
              <div>
                <dt>Total before the zero minimum</dt>
                <dd>{currency.format(answer.rawLiability.cents / 100)}</dd>
              </div>
            )}
            <div>
              <dt>{annual ? "Annual tax liability" : "Total withheld"}</dt>
              <dd>
                {currency.format(
                  (annual ? answer.liability.cents : answer.total.cents) / 100
                )}
              </dd>
            </div>
          </dl>
          <h3>Assumptions and limits</h3>
          <ul>
            <li>2025–26 tax year, for an Australian resident.</li>
            {annual ? (
              <>
                <li>
                  Includes income tax, the low income tax offset and the
                  Medicare levy. Tax liability cannot fall below zero.
                </li>
                <li>
                  Uses the single-person Medicare levy rules without the seniors
                  and pensioners tax offset. Family thresholds and the Medicare
                  levy surcharge are not included.
                </li>
                <li>
                  The Medicare levy thresholds are awaiting correction; the
                  answer may overstate the levy for some lower incomes.
                </li>
              </>
            ) : (
              <>
                <li>
                  PAYG withholding only: tax taken from this pay, rather than
                  your final annual tax bill.
                </li>
                <li>
                  Other deductions, study-loan repayments and salary sacrifice
                  are not included.
                </li>
                {Array.map(components, (component) =>
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
                            <li key={component.id}>
                              Tax-free threshold claimed.
                            </li>
                          )),
                          Match.orElse(() => null)
                        ),
                    })
                  )
                )}
              </>
            )}
          </ul>
          <h3>Rule sources</h3>
          <ul>
            {Array.flatMap(components, (component) =>
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
