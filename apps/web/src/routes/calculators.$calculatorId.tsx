import { createFileRoute, Navigate } from "@tanstack/react-router";
import { CalculatorSummaries } from "@taxkit/calculators/summaries";
import { Function as EffectFunction, Array, Option } from "effect";

import { CalculatorPage } from "#/lib/calculators/calculator-page.container";

export const Route = createFileRoute("/calculators/$calculatorId")({
  component: CalculatorRoute,
  remountDeps: ({ params }) => params.calculatorId,
});

function CalculatorRoute() {
  const { calculatorId } = Route.useParams();
  const calculator = EffectFunction.pipe(
    CalculatorSummaries,
    Array.findFirst((entry) => entry.calculatorId === calculatorId)
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
    <CalculatorPage
      key={calculator.value.calculatorId}
      calculator={calculator.value}
    />
  );
}
