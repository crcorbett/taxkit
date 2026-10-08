import {
  useAtomInitialValues,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react";
import type { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import type { CalculatorCatalogResponse } from "@taxkit/api-rpc/schemas";
import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import { PayWithholdingsLedger } from "@taxkit/rules-au-pay/schemas";
import { Option, Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import { browserCalculatorToolsAtom } from "./browser-tools.atoms";
import { calculationFailureMessage } from "./calculation-failure";
import { CalculatorPageView } from "./calculator-page.view";
import { calculatorPageAtoms } from "./calculator.atoms";
import type { TaxKitWebConfigError } from "./config";
import type { WebsiteInputError, WebsiteCalculatorForm } from "./form.boundary";

const calculatorPageReport = Schema.Union([
  AnnualTaxReport,
  PayWithholdingsLedger,
]);

export const CalculatorPage = ({
  calculator,
  report,
  savedError,
  savedForm,
}: {
  readonly calculator: CalculatorCatalogResponse["calculators"][number];
  readonly report: Option.Option<AnnualTaxReport | PayWithholdingsLedger>;
  readonly savedError: Option.Option<
    CalculatorRpcClientError | TaxKitWebConfigError | WebsiteInputError
  >;
  readonly savedForm: Option.Option<WebsiteCalculatorForm>;
}) => {
  const atoms = useMemo(
    () => calculatorPageAtoms(calculator.calculatorId),
    [calculator.calculatorId]
  );
  const browserTools = useMemo(
    () => browserCalculatorToolsAtom(calculator.calculatorId),
    [calculator.calculatorId]
  );
  useAtomInitialValues(
    Option.match(savedForm, {
      onNone: () => [],
      onSome: (value) => [[atoms.form, value]],
    })
  );
  useAtomInitialValues([
    [atoms.savedReport, report],
    [
      atoms.savedMessage,
      savedError.pipe(Option.map(calculationFailureMessage)),
    ],
  ]);
  const controlBrowserTools = useAtomSet(browserTools);
  useEffect(() => {
    controlBrowserTools("register");
    return () => controlBrowserTools(Atom.Interrupt);
  }, [controlBrowserTools]);
  const view = useAtomValue(atoms.view);
  const edit = useAtomSet(atoms.edit);
  const submit = useAtomSet(atoms.submit);
  const controlCalculation = useAtomSet(atoms.calculation);
  useEffect(
    () => () => controlCalculation(Atom.Interrupt),
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
      onCalculate={() => submit("calculate")}
    />
  );
};
