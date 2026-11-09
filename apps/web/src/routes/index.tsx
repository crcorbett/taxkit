import { createFileRoute } from "@tanstack/react-router";
import { TakeHomeCalculatorSummary } from "@taxkit/calculators/summaries";

import { CalculatorPage } from "#/lib/calculators/calculator.container";

// Home is the take-home calculator page.
export const Route = createFileRoute("/")({
  component: HomeRoute,
  head: () => ({
    meta: [{ title: `${TakeHomeCalculatorSummary.title} | TaxKit` }],
  }),
});

function HomeRoute() {
  return <CalculatorPage calculator={TakeHomeCalculatorSummary} />;
}
