import { Boolean as EffectBoolean, Cause, Match, Option } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as Atom from "effect/reactivity/Atom";

import type { CalculatorForm, CalculatorInputError } from "./form.ingress.js";
import type { CalculatorViewState } from "./page.schemas.js";
import { CalculatorId as CatalogCalculatorId } from "./schemas.js";
import type { CalculatorRunResponse, CalculatorRunRequest } from "./schemas.js";

type CalculatorId = CalculatorRunRequest["calculatorId"];
/**
 * One calculator page's state and commands, held in the shared registry. The
 * host declares them as a static `Atom.family` keyed by the checked calculator
 * ID, because only the host owns the cancellable calculation command.
 */
export interface CalculatorPage<E> {
  readonly calculatorId: CalculatorId;
  readonly calculation: Atom.AtomResultFn<
    CalculatorRunRequest,
    CalculatorRunResponse,
    E
  >;
  readonly edit: Atom.Writable<Option.Option<void>, CalculatorForm>;
  readonly form: Atom.Writable<CalculatorForm>;
  readonly submit: Atom.Writable<Option.Option<void>, "calculate">;
  readonly view: Atom.Atom<CalculatorViewState>;
}
/**
 * The one readonly page view of the visible form.
 * The response is a tagged union over the calculator ID, so selecting this
 * page's variant already selects its report kind. Editing keeps the last
 * answer, visibly stale; an old error is hidden while a new request runs.
 */
export const calculatorViewState = <E>({
  calculation,
  calculatorId,
  failureMessage,
  form,
  inputError,
  submitted,
}: Readonly<{
  calculation: AsyncResult.AsyncResult<CalculatorRunResponse, E>;
  calculatorId: CalculatorId;
  failureMessage: (error: E) => string;
  form: CalculatorForm;
  inputError: Option.Option<CalculatorInputError>;
  submitted: boolean;
}>): CalculatorViewState => {
  const report = AsyncResult.value(calculation).pipe(
    Option.filter((value) => value.calculatorId === calculatorId),
    Option.map((value) => value.report)
  );
  const failed =
    submitted &&
    !calculation.waiting &&
    (AsyncResult.isFailure(calculation) ||
      (AsyncResult.isSuccess(calculation) && Option.isNone(report)));
  const calculationMessage = Match.value(calculation).pipe(
    Match.when(AsyncResult.isFailure, (failure) =>
      failure.cause.pipe(Cause.findErrorOption, Option.map(failureMessage))
    ),
    Match.orElse(() =>
      Option.some("The calculation could not finish. Please try again.")
    )
  );
  return {
    busy: submitted && calculation.waiting,
    calculatorId: CatalogCalculatorId.make(calculatorId),
    form,
    invalidField: inputError.pipe(Option.map((error) => error.field)),
    message: inputError.pipe(
      Option.match({
        onNone: () =>
          EffectBoolean.match(failed, {
            onFalse: () => Option.none<string>(),
            onTrue: () => calculationMessage,
          }),
        onSome: (error) => Option.some(error.message),
      })
    ),
    report,
    stale:
      Option.isSome(report) &&
      (!submitted ||
        calculation.waiting ||
        !AsyncResult.isSuccess(calculation) ||
        Option.isSome(inputError)),
  };
};
