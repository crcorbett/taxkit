import type { CalculatorRunReport } from "@taxkit/calculators/schemas";
import type { LedgerComponent } from "@taxkit/core/ledger";
import type { Money } from "@taxkit/core/primitives";
import {
  Array,
  Function as EffectFunction,
  Match,
  Option,
  Predicate,
  Record,
} from "effect";
import type { ReactNode } from "react";

import { medicareThresholdCaveat } from "./caveats";

// One formatter for every amount on the page.
const currency = new Intl.NumberFormat("en-AU", {
  currency: "AUD",
  style: "currency",
});
const formatMoney = (money: Money) => currency.format(money.cents / 100);
// The withholding scale notes shown beside a pay breakdown.
const scaleNotes: Record.ReadonlyRecord<string, string> = {
  scale1: "Tax-free threshold not claimed.",
  scale2: "Tax-free threshold claimed.",
};

type BreakdownRow = Readonly<{ key: string; label: string; value: string }>;

// The polite live answer. It keeps its place when empty, so a new answer
// never moves the form above it.
const ResultSummary = ({
  answer,
  stale,
}: Readonly<{
  answer: Option.Option<Readonly<{ label: string; amount: Money }>>;
  stale: boolean;
}>) => (
  <output
    aria-atomic="true"
    aria-label="Calculation result"
    aria-live="polite"
    className="calculator-result"
  >
    {Option.isSome(answer) && stale && (
      <span className="calculator-stale">
        This answer is out of date. Calculate again to update it.
      </span>
    )}
    {Option.isSome(answer) && (
      <span>
        {answer.value.label}:{" "}
        <strong className="calculator-amount">
          {formatMoney(answer.value.amount)}
        </strong>
      </span>
    )}
  </output>
);

const componentRows = (components: readonly LedgerComponent[]) =>
  EffectFunction.pipe(
    components,
    Array.map((component): BreakdownRow => ({
      key: component.id,
      label: component.label,
      value: EffectFunction.pipe(
        [
          Option.some(formatMoney(component.amount)),
          Option.some(" (reduces the total)").pipe(
            Option.filter(() => component.effect === "subtractive")
          ),
          Option.some(" (not included in total)").pipe(
            Option.filter(() => component.status !== "active")
          ),
        ],
        Array.getSomes,
        Array.join("")
      ),
    }))
  );

const CalculationBreakdown = ({
  children,
  description,
  rows,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  rows: readonly BreakdownRow[];
  title: string;
}>) => (
  <details className="calculation-details">
    <summary>How this answer was worked out</summary>
    <h2>{title}</h2>
    <p>
      These details belong to the answer above, even when you change the form.{" "}
      {description}
    </p>
    <dl>
      {EffectFunction.pipe(
        rows,
        Array.map((row) => (
          <div key={row.key}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))
      )}
    </dl>
    {children}
  </details>
);

const WithholdingAssumptions = ({
  components,
}: Readonly<{ components: readonly LedgerComponent[] }>) => (
  <>
    <h3>Assumptions and limits</h3>
    <ul>
      <li>2025–26 tax year, for an Australian resident.</li>
      <li>
        PAYG withholding only: tax taken from this pay, rather than your final
        annual tax bill.
      </li>
      <li>
        Other deductions, study-loan repayments and salary sacrifice are not
        included.
      </li>
      {EffectFunction.pipe(
        components,
        Array.flatMap((component) =>
          Record.get(component.trace.inputs, "scale").pipe(
            // The trace input is open JSON; only the two named scales have a note.
            Option.flatMap((scale) =>
              Option.liftPredicate(scale, Predicate.isString)
            ),
            Option.flatMap((scale) => Record.get(scaleNotes, scale)),
            Option.map((text) => <li key={component.id}>{text}</li>),
            Array.fromOption
          )
        )
      )}
    </ul>
  </>
);

const AnnualTaxAssumptions = () => (
  <>
    <h3>Assumptions and limits</h3>
    <ul>
      <li>2025–26 tax year, for an Australian resident.</li>
      <li>
        Includes income tax, the low income tax offset and the Medicare levy.
        Tax liability cannot fall below zero.
      </li>
      <li>
        Uses the single-person Medicare levy rules without the seniors and
        pensioners tax offset. Family thresholds and the Medicare levy surcharge
        are not included.
      </li>
      <li>{medicareThresholdCaveat}</li>
    </ul>
  </>
);

// Only a valid HTTPS reference becomes a link; any other checked reference
// text stays plain.
const RuleSources = ({
  components,
}: Readonly<{ components: readonly LedgerComponent[] }>) => (
  <>
    <h3>Rule sources</h3>
    <ul>
      {EffectFunction.pipe(
        components,
        Array.flatMap((component) =>
          EffectFunction.pipe(
            component.trace.sources,
            Array.map((source) => (
              <li key={`${component.id}:${source.reference}`}>
                {Match.value(
                  URL.canParse(source.reference) &&
                    source.reference.startsWith("https://")
                ).pipe(
                  Match.when(true, () => (
                    <a href={source.reference}>{source.title}</a>
                  )),
                  Match.orElse(() => (
                    <span>
                      {source.title}: {source.reference}
                    </span>
                  ))
                )}
              </li>
            ))
          )
        )
      )}
    </ul>
  </>
);

// The checked report selects its own summary and explanation. Every part comes
// from the answer and its trace, never from the edited form.
export const CalculatorResult = ({
  report,
  stale,
}: Readonly<{
  report: Option.Option<CalculatorRunReport>;
  stale: boolean;
}>) => {
  const parts = report.pipe(
    Option.map((value) =>
      Match.value(value).pipe(
        Match.tag("TakeHomePayReport", (pay) => ({
          answer: { amount: pay.netPay, label: "Take-home pay" },
          details: (
            <CalculationBreakdown
              description={`Amounts are in Australian dollars for a ${pay.period} pay period.`}
              rows={[
                {
                  key: "gross",
                  label: "Pay before tax",
                  value: formatMoney(pay.grossPay),
                },
                {
                  key: "taxable",
                  label: "Pay used to calculate withholding",
                  value: formatMoney(pay.taxablePay),
                },
                ...componentRows(pay.withholdings.components),
                {
                  key: "total",
                  label: "Total withheld",
                  value: formatMoney(pay.withholdingsTotal),
                },
              ]}
              title="Pay breakdown"
            >
              <WithholdingAssumptions
                components={pay.withholdings.components}
              />
              <RuleSources components={pay.withholdings.components} />
            </CalculationBreakdown>
          ),
        })),
        Match.tag("PayWithholdingsLedger", (ledger) => ({
          answer: { amount: ledger.total, label: "Total withheld" },
          details: (
            <CalculationBreakdown
              description={`Amounts are in Australian dollars for a ${ledger.period} pay period.`}
              rows={[
                ...componentRows(ledger.components),
                {
                  key: "total",
                  label: "Total withheld",
                  value: formatMoney(ledger.total),
                },
              ]}
              title="Withholding breakdown"
            >
              <WithholdingAssumptions components={ledger.components} />
              <RuleSources components={ledger.components} />
            </CalculationBreakdown>
          ),
        })),
        Match.tag("AnnualTaxReport", (annual) => ({
          answer: { amount: annual.liability, label: "Annual tax liability" },
          details: (
            <CalculationBreakdown
              description="Amounts are in Australian dollars for the year."
              rows={[
                {
                  key: "taxable-income",
                  label: "Annual taxable income",
                  value: formatMoney(annual.taxableIncome),
                },
                ...componentRows(annual.ledger.components),
                {
                  key: "raw-liability",
                  label: "Total before the zero minimum",
                  value: formatMoney(annual.rawLiability),
                },
                {
                  key: "liability",
                  label: "Annual tax liability",
                  value: formatMoney(annual.liability),
                },
              ]}
              title="Annual tax breakdown"
            >
              <AnnualTaxAssumptions />
              <RuleSources components={annual.ledger.components} />
            </CalculationBreakdown>
          ),
        })),
        Match.exhaustive
      )
    )
  );
  return (
    <>
      <ResultSummary
        answer={parts.pipe(Option.map(({ answer }) => answer))}
        stale={stale}
      />
      {Option.isSome(parts) && parts.value.details}
    </>
  );
};
