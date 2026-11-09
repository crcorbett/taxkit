import { createFileRoute, Link } from "@tanstack/react-router";
import type { CalculatorSummary } from "@taxkit/calculators/schemas";
import { Option } from "effect";

import { CalculatorPage } from "#/lib/calculators/calculator.container";
import { loadCalculatorPage } from "#/lib/pages/loaders";

// The take-home calculator's address redirects to Home; an unknown address is
// a 404 with a way back, never a calculator page that cannot load.
export const Route = createFileRoute("/calculators/$calculatorId")({
  component: CalculatorRoute,
  // An explicit parameter type keeps loader inference independent of head.
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<{ calculator: CalculatorSummary }> | undefined;
  }>) => ({
    meta: [
      {
        title: Option.fromNullishOr(loaderData).pipe(
          Option.map(({ calculator }) => `${calculator.title} | TaxKit`),
          Option.getOrElse(() => "Calculator not found | TaxKit")
        ),
      },
    ],
  }),
  loader: ({ params, context, abortController }) =>
    loadCalculatorPage({
      calculatorId: params.calculatorId,
      context,
      signal: abortController.signal,
    }),
  notFoundComponent: CalculatorNotFound,
  remountDeps: ({ params }) => params.calculatorId,
});

function CalculatorRoute() {
  const { calculator } = Route.useLoaderData();
  return <CalculatorPage calculator={calculator} />;
}

function CalculatorNotFound() {
  return (
    <section className="calculator-page" aria-labelledby="calculator-title">
      <h1 id="calculator-title">Calculator not found</h1>
      <p>
        This address does not match a TaxKit calculator. Choose one from the
        list above, or start with take-home pay.
      </p>
      <p>
        <Link to="/">Go to Home</Link>
      </p>
    </section>
  );
}
