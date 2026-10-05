import {
  useAtomInitialValues,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react";
import type { CalculatorCatalogResponse } from "@taxkit/api-rpc/schemas";
import type { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import type { PayWithholdingsLedger } from "@taxkit/rules-au-pay/schemas";
import { Option } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import { CalculatorPageView } from "./calculator-page.view";
import { calculatorPageAtoms } from "./calculator.atoms";
import type { WebsiteCalculatorForm } from "./form.boundary";

export const CalculatorPage = ({
  calculator,
  report,
  savedFailed,
  savedForm,
}: {
  readonly calculator: CalculatorCatalogResponse["calculators"][number];
  readonly report: Option.Option<AnnualTaxReport | PayWithholdingsLedger>;
  readonly savedFailed: boolean;
  readonly savedForm: Option.Option<WebsiteCalculatorForm>;
}) => {
  const atoms = useMemo(
    () => calculatorPageAtoms(calculator.calculatorId),
    [calculator.calculatorId]
  );
  useAtomInitialValues(
    Option.match(savedForm, {
      onNone: () => [],
      onSome: (value) => [[atoms.form, value]],
    })
  );
  const form = useAtomValue(atoms.form);
  const calculation = useAtomValue(atoms.calculation);
  const showSaved = useAtomValue(atoms.showSaved);
  const showCalculation = useAtomValue(atoms.showCalculation);
  const formError = useAtomValue(atoms.formError);
  const edit = useAtomSet(atoms.edit);
  const submit = useAtomSet(atoms.submit);
  const controlCalculation = useAtomSet(atoms.calculation);
  useEffect(
    () => () => controlCalculation(Atom.Interrupt),
    [controlCalculation]
  );
  const stale =
    Option.isSome(report) &&
    !showSaved &&
    (!showCalculation ||
      calculation.waiting ||
      !AsyncResult.isSuccess(calculation) ||
      Option.isSome(formError));
  const message = useMemo(() => {
    if (Option.isSome(formError)) {
      return formError.value;
    }
    if (
      showCalculation &&
      !calculation.waiting &&
      (AsyncResult.isFailure(calculation) ||
        (AsyncResult.isSuccess(calculation) && Option.isNone(report)))
    ) {
      return "The calculation could not finish. Please try again.";
    }
    return showSaved && savedFailed
      ? "The calculation could not finish. Check your details and try again."
      : undefined;
  }, [formError, showCalculation, calculation, report, showSaved, savedFailed]);
  return (
    <CalculatorPageView
      calculatorId={calculator.calculatorId}
      form={form}
      title={calculator.title}
      year={calculator.context.taxYear}
      busy={showCalculation && calculation.waiting}
      message={message}
      report={report}
      stale={stale}
      onEdit={edit}
      onCalculate={() => submit("calculate")}
    />
  );
};
