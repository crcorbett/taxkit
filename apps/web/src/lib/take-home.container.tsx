import { useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  AuPayCalculatorId,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Option, Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import { browserCalculatorToolsAtom } from "./browser-tools.atoms";
import {
  calculateAtom,
  calculatorPageAtoms,
  editTakeHomeAtom,
  submitTakeHomeAtom,
  takeHomeFormAtom,
} from "./calculator.atoms";
import { TakeHomeFormView } from "./take-home.view";

export const TakeHomeCalculator = () => {
  const atoms = useMemo(
    () => calculatorPageAtoms(AuPayCalculatorId.make("au.pay.take-home")),
    []
  );
  const browserTools = useMemo(
    () =>
      browserCalculatorToolsAtom(AuPayCalculatorId.make("au.pay.take-home")),
    []
  );
  const controlBrowserTools = useAtomSet(browserTools);
  useEffect(() => {
    controlBrowserTools("register");
    return () => {
      controlBrowserTools(Atom.Interrupt);
    };
  }, [controlBrowserTools]);
  const form = useAtomValue(takeHomeFormAtom);
  const view = useAtomValue(atoms.view);
  const edit = useAtomSet(editTakeHomeAtom);
  const submit = useAtomSet(submitTakeHomeAtom);
  const controlCalculation = useAtomSet(calculateAtom);
  useEffect(
    () => () => {
      controlCalculation(Atom.Interrupt);
    },
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
      onCalculate={() => {
        submit("calculate");
      }}
    />
  );
};
