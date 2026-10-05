import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { TakeHomePayReport } from "@taxkit/rules-au-pay/schemas";
import { Option, Result, Schema } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import {
  calculateAtom,
  editTakeHomeAtom,
  formErrorAtom,
  showCalculationAtom,
  showServerResultAtom,
  submitTakeHomeAtom,
  takeHomeFormAtom,
} from "./calculator.atoms";
import type { WebsiteSubmission } from "./schemas";
import { TakeHomeFormView } from "./take-home.view";

export const TakeHomeCalculator = ({
  submission,
}: {
  readonly submission: Option.Option<typeof WebsiteSubmission.Type>;
}) => {
  const saved = submission;
  const form = useAtomValue(takeHomeFormAtom);
  const calculation = useAtomValue(calculateAtom);
  const showServerResult = useAtomValue(showServerResultAtom);
  const showCalculation = useAtomValue(showCalculationAtom);
  const formError = useAtomValue(formErrorAtom);
  const edit = useAtomSet(editTakeHomeAtom);
  const submit = useAtomSet(submitTakeHomeAtom);
  const controlCalculation = useAtomSet(calculateAtom);
  useEffect(
    () => () => controlCalculation(Atom.Interrupt),
    [controlCalculation]
  );
  const report = useMemo(
    () =>
      AsyncResult.value(calculation).pipe(
        Option.map((value) => value.report),
        Option.orElse(() =>
          saved.pipe(
            Option.flatMap((value) => Result.getSuccess(value.result)),
            Option.map((value) => value.report)
          )
        ),
        Option.filter(Schema.is(TakeHomePayReport))
      ),
    [calculation, saved]
  );
  const stale =
    Option.isSome(report) &&
    !showServerResult &&
    (!showCalculation ||
      calculation.waiting ||
      !AsyncResult.isSuccess(calculation) ||
      Option.isSome(formError));
  const message = useMemo(() => {
    if (Option.isSome(formError)) {
      return formError;
    }
    if (
      showCalculation &&
      (AsyncResult.isFailure(calculation) ||
        (AsyncResult.isSuccess(calculation) && Option.isNone(report)))
    ) {
      return Option.some("The calculation could not finish. Please try again.");
    }
    if (showServerResult) {
      return saved.pipe(
        Option.flatMap((value) => Result.getFailure(value.result)),
        Option.map(
          () =>
            "The calculation could not finish. Check your pay details and try again."
        )
      );
    }
    return Option.none<string>();
  }, [
    formError,
    showCalculation,
    calculation,
    showServerResult,
    saved,
    report,
  ]);
  return (
    <TakeHomeFormView
      form={form}
      busy={showCalculation && calculation.waiting}
      message={Option.getOrUndefined(message)}
      report={report}
      stale={stale}
      onEdit={edit}
      onCalculate={() => submit("calculate")}
    />
  );
};
