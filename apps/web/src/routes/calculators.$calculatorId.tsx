import { useAtomValue } from "@effect/atom-react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import type { CalculatorCatalogResponse } from "@taxkit/api-rpc/schemas";
import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import { PayWithholdingsLedger } from "@taxkit/rules-au-pay/schemas";
import { Array, Option, Result, Schema } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useContext, useMemo } from "react";

import { CalculatorPage } from "#/lib/calculator-page.container";
import { calculatorPageAtoms } from "#/lib/calculator.atoms";
import type { WebsiteSubmission } from "#/lib/schemas";

import { WebsiteCatalogueContext, WebsiteSubmissionContext } from "./__root";

const CalculatorRoutePage = ({
  calculator,
  submission,
}: {
  readonly calculator: CalculatorCatalogResponse["calculators"][number];
  readonly submission: Option.Option<typeof WebsiteSubmission.Type>;
}) => {
  const atoms = useMemo(
    () => calculatorPageAtoms(calculator.calculatorId),
    [calculator.calculatorId]
  );
  const calculation = useAtomValue(atoms.calculation);
  const saved = submission.pipe(
    Option.filter((value) => value.calculatorId === calculator.calculatorId)
  );
  // The route selects a checked answer for this page. The policy container
  // coordinates work; the result leaf only displays these readonly values.
  const report = AsyncResult.value(calculation).pipe(
    Option.orElse(() =>
      saved.pipe(Option.flatMap((value) => Result.getSuccess(value.result)))
    ),
    Option.filter(
      (value) => value.calculator.calculatorId === calculator.calculatorId
    ),
    Option.flatMap(
      (value): Option.Option<AnnualTaxReport | PayWithholdingsLedger> => {
        if (calculator.calculatorId === "au.income-tax.annual") {
          return Schema.is(AnnualTaxReport)(value.report)
            ? Option.some(value.report)
            : Option.none();
        }
        return Schema.is(PayWithholdingsLedger)(value.report)
          ? Option.some(value.report)
          : Option.none();
      }
    )
  );
  return (
    <CalculatorPage
      calculator={calculator}
      report={report}
      savedForm={saved.pipe(Option.map((value) => value.form))}
      savedError={saved.pipe(
        Option.flatMap((value) => Result.getFailure(value.result))
      )}
    />
  );
};

export const Route = createFileRoute("/calculators/$calculatorId")({
  component: function CalculatorRoute() {
    const { calculatorId } = Route.useParams();
    const catalogue = useContext(WebsiteCatalogueContext);
    const submission = useContext(WebsiteSubmissionContext);
    const calculator = catalogue.pipe(
      Option.flatMap((value) =>
        Array.findFirst(
          value.calculators,
          (entry) => entry.calculatorId === calculatorId
        )
      )
    );
    if (Option.isNone(calculator)) {
      return (
        <section className="home">
          <h1>TaxKit</h1>
          <p role="alert">
            This calculator could not load. Choose a calculator from the list or
            reload this page.
          </p>
        </section>
      );
    }
    if (calculator.value.calculatorId === "au.pay.take-home") {
      return <Navigate to="/" />;
    }
    return (
      <CalculatorRoutePage
        key={calculator.value.calculatorId}
        calculator={calculator.value}
        submission={submission}
      />
    );
  },
  remountDeps: ({ params }) => params.calculatorId,
});
