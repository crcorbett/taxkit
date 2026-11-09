import {
  RegistryContext,
  useAtomMount,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react";
import { AnnualTaxForm, TakeHomeForm } from "@taxkit/calculators/form";
import type { CalculatorSummary } from "@taxkit/calculators/schemas";
import { Match, Option, Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { useContext, useEffect, useId } from "react";

import {
  AnnualIncomeField,
  CalculatorFormView,
  PayFields,
} from "./calculator-form.view";
import { CalculatorPageView } from "./calculator-page.view";
import { CalculatorResult } from "./calculator-result.view";
import { calculatorCaveat } from "./caveats";
import { calculatorPageAtoms } from "./page.atoms";
import { calculatorToolsAtom } from "./tools.atoms";

/**
 * Every calculator page. The container owns the page's registry commands and
 * browser-tool registration, then composes focused leaves for the checked form
 * and report kinds. Leaving the page interrupts its calculation; unmounting the
 * tool registration removes the tools and stops their callbacks.
 */
export const CalculatorPage = ({
  calculator,
}: Readonly<{ calculator: CalculatorSummary }>) => {
  const page = calculatorPageAtoms(calculator.calculatorId);
  const browserTools = calculatorToolsAtom(calculator.calculatorId);
  useAtomMount(browserTools);
  const registry = useContext(RegistryContext);
  const view = useAtomValue(page.view);
  const edit = useAtomSet(page.edit);
  const submit = useAtomSet(page.submit);
  const controlCalculation = useAtomSet(page.calculation);
  useEffect(
    () => () => {
      controlCalculation(Atom.Interrupt);
    },
    [controlCalculation]
  );
  const fieldPrefix = useId();
  const fieldError = Option.all({
    field: view.invalidField,
    message: view.message,
  });
  return (
    <CalculatorPageView
      caveat={calculatorCaveat(calculator.calculatorId)}
      message={view.message.pipe(
        Option.filter(() => Option.isNone(view.invalidField))
      )}
      result={<CalculatorResult report={view.report} stale={view.stale} />}
      title={calculator.title}
      year={calculator.context.taxYear}
    >
      <CalculatorFormView
        busy={view.busy}
        onCalculate={() => {
          // The submit command is synchronous, so the field to correct is
          // known before the browser paints.
          submit("calculate");
          return registry.get(page.view).invalidField;
        }}
      >
        {Match.value(view.form).pipe(
          Match.when(Schema.is(AnnualTaxForm), (form) => (
            <AnnualIncomeField
              error={fieldError}
              fieldPrefix={fieldPrefix}
              form={form}
              onEdit={edit}
            />
          )),
          Match.when(Schema.is(TakeHomeForm), (form) => (
            <PayFields
              error={fieldError}
              fieldPrefix={fieldPrefix}
              form={form}
              onEdit={edit}
            />
          )),
          Match.exhaustive
        )}
      </CalculatorFormView>
    </CalculatorPageView>
  );
};
