import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import {
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import {
  Cause,
  Match,
  Option,
  Result,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";

import { initialCalculatorForm, requestFromForm } from "./form.ingress.js";
import type { CalculatorForm } from "./form.ingress.js";
import type { CalculatorViewState } from "./page.schemas.js";
import type {
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "./schemas.js";

type CalculatorId = CalculatorRunServiceRequest["calculatorId"];
/** One calculator page's state and commands, held in the shared registry. */
export interface CalculatorPage<E> {
  // Checked request identity belongs to one visible attempt. An edit or a
  // newer manual or tool submission invalidates a waiter for the older one.
  readonly attempt: Atom.Writable<Option.Option<CalculatorRunServiceRequest>>;
  readonly calculation: Atom.AtomResultFn<
    CalculatorRunServiceRequest,
    CalculatorRunResponse,
    E
  >;
  readonly cancel: Atom.Writable<Option.Option<void>, "cancel">;
  readonly edit: Atom.Writable<Option.Option<void>, CalculatorForm>;
  readonly form: Atom.Writable<CalculatorForm>;
  readonly submit: Atom.Writable<Option.Option<void>, "calculate">;
  readonly view: Atom.Atom<CalculatorViewState>;
}
// The report kind each calculator answers with.
const answersWithItsReport = (
  calculatorId: CalculatorId,
  report: CalculatorRunResponse["report"]
) =>
  Match.value(calculatorId).pipe(
    Match.when("au.income-tax.annual", () =>
      Schema.is(AnnualTaxReport)(report)
    ),
    Match.when("au.pay.take-home", () => Schema.is(TakeHomePayReport)(report)),
    Match.orElse(() => Schema.is(PayWithholdingsLedger)(report))
  );
/**
 * Calculator pages over the host's calculation command. The registry owns
 * separate temporary state for each checked calculator ID; the family
 * memoises descriptions, never a client or a computed answer. `calculation`
 * makes one cancellable command per page; `failureMessage` turns its checked
 * failure into safe page text.
 */
export const makeCalculatorPages = <E>({
  calculation: makeCalculation,
  failureMessage,
}: Readonly<{
  calculation: () => Atom.AtomResultFn<
    CalculatorRunServiceRequest,
    CalculatorRunResponse,
    E
  >;
  failureMessage: (error: E) => string;
}>) =>
  Atom.family((calculatorId: CalculatorId): CalculatorPage<E> => {
    const form = Atom.make<CalculatorForm>(initialCalculatorForm(calculatorId));
    // Replacing the request or interrupting it cancels the call.
    const calculation = makeCalculation();
    const showCalculation = Atom.make(false);
    const formError = Atom.make(Option.none<string>());
    const attempt = Atom.make(Option.none<CalculatorRunServiceRequest>());
    const cancel = Atom.fnSync<"cancel">()((_, get) => {
      get.set(attempt, Option.none());
      get.set(calculation, Atom.Interrupt);
      get.set(showCalculation, false);
    });
    const edit = Atom.fnSync<CalculatorForm>()((value, get) => {
      get.set(attempt, Option.none());
      get.set(calculation, Atom.Interrupt);
      get.set(showCalculation, false);
      get.set(formError, Option.none());
      get.set(form, value);
    });
    const submit = Atom.fnSync<"calculate">()((_, get) => {
      const current = get(form);
      const request = requestFromForm(calculatorId, current);
      get.set(showCalculation, true);
      if (Result.isFailure(request)) {
        get.set(attempt, Option.none());
        get.set(calculation, Atom.Interrupt);
        get.set(formError, Option.some(request.failure.message));
        return;
      }
      get.set(formError, Option.none());
      get.set(attempt, Option.some(request.success));
      get.set(calculation, request.success);
    });
    const group: CalculatorPage<E> = {
      attempt,
      calculation,
      cancel,
      edit,
      form,
      submit,
      // The registry retains this in-memory page snapshot across an
      // uncommitted React render; page cleanup still interrupts live work.
      // Reading `group.form` keeps the whole weak-family description group
      // alive, so browser GC cannot replace it on a return visit while the old
      // values remain in the registry. Disposing the root registry releases it.
      view: Atom.make((get): CalculatorViewState => {
        const current = get(calculation);
        const submitted = get(showCalculation);
        const inputError = get(formError);
        const report = AsyncResult.value(current).pipe(
          Option.filter(
            (value) => value.calculator.calculatorId === calculatorId
          ),
          Option.map((value) => value.report),
          Option.filter((value) => answersWithItsReport(calculatorId, value))
        );
        const failed =
          submitted &&
          !current.waiting &&
          (AsyncResult.isFailure(current) ||
            (AsyncResult.isSuccess(current) && Option.isNone(report)));
        const calculationMessage = Match.value(current).pipe(
          Match.when(AsyncResult.isFailure, (matchedValue) =>
            matchedValue.cause.pipe(
              Cause.findErrorOption,
              Option.map(failureMessage)
            )
          ),
          Match.orElse(() =>
            Option.some("The calculation could not finish. Please try again.")
          )
        );
        const message = Option.match(inputError, {
          onNone: () =>
            EffectBoolean.match(failed, {
              onFalse: () => Option.none<string>(),
              onTrue: () => calculationMessage,
            }),
          onSome: Option.some,
        });
        return {
          busy: submitted && current.waiting,
          calculatorId,
          form: get(group.form),
          message,
          report,
          stale:
            Option.isSome(report) &&
            (!submitted ||
              current.waiting ||
              !AsyncResult.isSuccess(current) ||
              Option.isSome(inputError)),
        };
      }).pipe(Atom.keepAlive),
    };
    return group;
  });
