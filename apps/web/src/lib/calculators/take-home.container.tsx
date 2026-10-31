import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { TakeHomeForm, initialTakeHomeForm } from "@taxkit/calculators/form";
import {
  AuPayCalculatorId,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Match, Option, Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import { calculatorPageAtoms } from "./page.atoms";
import { TakeHomeFormView } from "./take-home.view";
import { calculatorToolsAtom } from "./tools.atoms";

const calculatorId = AuPayCalculatorId.make("au.pay.take-home");
// Home is the take-home calculator page with its own form view.
export const TakeHomeCalculator = () => {
  const atoms = useMemo(() => calculatorPageAtoms(calculatorId), []);
  const browserTools = useMemo(() => calculatorToolsAtom(calculatorId), []);
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
    <TakeHomeFormView
      form={Match.value(view.form).pipe(
        Match.when(Schema.is(TakeHomeForm), (matchedValue) => matchedValue),
        Match.orElse(() => initialTakeHomeForm)
      )}
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
