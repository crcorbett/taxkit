import {
  useAtomInitialValues,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react";
import {
  AuPayCalculatorId,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Option, Result, Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import { browserCalculatorToolsAtom } from "./browser-tools.atoms";
import { calculationFailureMessage } from "./calculation-failure";
import {
  calculateAtom,
  calculatorPageAtoms,
  editTakeHomeAtom,
  submitTakeHomeAtom,
  takeHomeFormAtom,
} from "./calculator.atoms";
import { TakeHomeForm } from "./form.boundary";
import type { WebsiteSubmission } from "./schemas";
import { TakeHomeFormView } from "./take-home.view";

export const TakeHomeCalculator = ({
  submission,
}: {
  readonly submission: Option.Option<typeof WebsiteSubmission.Type>;
}) => {
  const atoms = useMemo(
    () => calculatorPageAtoms(AuPayCalculatorId.make("au.pay.take-home")),
    []
  );
  const browserTools = useMemo(
    () =>
      browserCalculatorToolsAtom(AuPayCalculatorId.make("au.pay.take-home")),
    []
  );
  const saved = submission.pipe(
    Option.filter((value) => value.calculatorId === "au.pay.take-home")
  );
  useAtomInitialValues(
    saved.pipe(
      Option.map((value) => value.form),
      Option.filter(Schema.is(TakeHomeForm)),
      Option.match({
        onNone: () => [],
        onSome: (form) => [[atoms.form, form]],
      })
    )
  );
  useAtomInitialValues([
    [
      atoms.savedReport,
      saved.pipe(
        Option.flatMap((value) => Result.getSuccess(value.result)),
        Option.map((value) => value.report)
      ),
    ],
    [
      atoms.savedMessage,
      saved.pipe(
        Option.flatMap((value) => Result.getFailure(value.result)),
        Option.map(calculationFailureMessage)
      ),
    ],
  ]);
  const controlBrowserTools = useAtomSet(browserTools);
  useEffect(() => {
    controlBrowserTools("register");
    return () => controlBrowserTools(Atom.Interrupt);
  }, [controlBrowserTools]);
  const form = useAtomValue(takeHomeFormAtom);
  const view = useAtomValue(atoms.view);
  const edit = useAtomSet(editTakeHomeAtom);
  const submit = useAtomSet(submitTakeHomeAtom);
  const controlCalculation = useAtomSet(calculateAtom);
  useEffect(
    () => () => controlCalculation(Atom.Interrupt),
    [controlCalculation]
  );
  return (
    <TakeHomeFormView
      form={form}
      busy={view.busy}
      message={Option.getOrUndefined(view.message)}
      report={view.report.pipe(Option.filter(Schema.is(TakeHomePayReport)))}
      stale={view.stale}
      onEdit={edit}
      onCalculate={() => submit("calculate")}
    />
  );
};
