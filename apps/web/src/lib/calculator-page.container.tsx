import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { CalculatorSummary } from "@taxkit/calculators/schemas";
import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import { PayWithholdingsLedger } from "@taxkit/rules-au-pay/schemas";
import { Option, Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import { browserCalculatorToolsAtom } from "./browser-tools.atoms";
import { CalculatorPageView } from "./calculator-page.view";
import { calculatorPageAtoms } from "./calculator.atoms";

const calculatorPageReport = Schema.Union([
  AnnualTaxReport,
  PayWithholdingsLedger,
]);

export const CalculatorPage = ({
  calculator,
}: {
  readonly calculator: CalculatorSummary;
}) => {
  const atoms = useMemo(
    () => calculatorPageAtoms(calculator.calculatorId),
    [calculator.calculatorId]
  );
  const browserTools = useMemo(
    () => browserCalculatorToolsAtom(calculator.calculatorId),
    [calculator.calculatorId]
  );
  const controlBrowserTools = useAtomSet(browserTools);
  useEffect(() => {
    controlBrowserTools("register");
    return () => {
      controlBrowserTools(Atom.Interrupt);
    };
  }, [controlBrowserTools]);
  const view = useAtomValue(atoms.view);
  const edit = useAtomSet(atoms.edit);
  const submit = useAtomSet(atoms.submit);
  const controlCalculation = useAtomSet(atoms.calculation);
  useEffect(
    () => () => {
      controlCalculation(Atom.Interrupt);
    },
    [controlCalculation]
  );
  return (
    <CalculatorPageView
      calculatorId={calculator.calculatorId}
      form={view.form}
      title={calculator.title}
      year={calculator.context.taxYear}
      busy={view.busy}
      message={Option.getOrUndefined(view.message)}
      report={view.report.pipe(Option.filter(Schema.is(calculatorPageReport)))}
      stale={view.stale}
      onEdit={edit}
      onCalculate={() => {
        submit("calculate");
      }}
    />
  );
};
