import type { CalculationCallFailure } from "@taxkit/api-http/errors";
import { requestCalculation } from "@taxkit/api-http/requests";
import type { CalculatorInputError } from "@taxkit/calculators/errors";
import {
  initialCalculatorForm,
  requestFromForm,
} from "@taxkit/calculators/form";
import type { CalculatorForm } from "@taxkit/calculators/form";
import { calculatorViewState } from "@taxkit/calculators/page";
import type { CalculatorPage } from "@taxkit/calculators/page";
import type { CalculatorRunRequest } from "@taxkit/calculators/schemas";
import { Effect, Option, Result } from "effect";
import * as Atom from "effect/reactivity/Atom";

import {
  ApiClient,
  apiClientRuntime,
  browserSettingsUnavailable,
  publicSettingsAtom,
} from "../api-client.atoms";
import type { TaxKitWebConfigError } from "../host/errors";
import { calculationFailureMessage } from "./failure";

/**
 * One static family of calculator page state, keyed by the checked calculator
 * ID. The registry owns separate temporary state for each page; the family
 * memoises descriptions, never a client or a computed answer. Replacing the
 * request or interrupting it cancels the browser call.
 */
export const calculatorPageAtoms = Atom.family(
  (
    calculatorId: CalculatorRunRequest["calculatorId"]
  ): CalculatorPage<CalculationCallFailure | TaxKitWebConfigError> => {
    const form = Atom.make<CalculatorForm>(initialCalculatorForm(calculatorId));
    // Settings are checked before the client is used; missing settings keep
    // their own failure and message.
    const calculation = apiClientRuntime.fn<CalculatorRunRequest>()(
      (request, get) =>
        Effect.fromOption(get(publicSettingsAtom)).pipe(
          Effect.mapError(() => browserSettingsUnavailable),
          Effect.andThen(ApiClient),
          Effect.flatMap((client) => requestCalculation({ client, request }))
        )
    );
    const showCalculation = Atom.make(false);
    const inputError = Atom.make(Option.none<CalculatorInputError>());
    const edit = Atom.fnSync<CalculatorForm>()((value, get) => {
      get.set(calculation, Atom.Interrupt);
      get.set(showCalculation, false);
      get.set(inputError, Option.none());
      get.set(form, value);
    });
    const submit = Atom.fnSync<"calculate">()((_, get) => {
      const current = get(form);
      const request = requestFromForm(calculatorId, current);
      get.set(showCalculation, true);
      if (Result.isFailure(request)) {
        get.set(calculation, Atom.Interrupt);
        get.set(inputError, Option.some(request.failure));
        return;
      }
      get.set(inputError, Option.none());
      get.set(calculation, request.success);
    });
    const page: CalculatorPage<CalculationCallFailure | TaxKitWebConfigError> =
      {
        calculation,
        calculatorId,
        edit,
        form,
        submit,
        // The registry retains this in-memory page snapshot across an
        // uncommitted React render; page cleanup still interrupts live work.
        // Reading `page.form` keeps the whole weak-family description group alive,
        // so browser GC cannot replace it on a return visit while the old values
        // remain in the registry. Disposing the root registry releases it.
        view: Atom.make((get) =>
          calculatorViewState({
            calculation: get(calculation),
            calculatorId,
            failureMessage: calculationFailureMessage,
            form: get(page.form),
            inputError: get(inputError),
            submitted: get(showCalculation),
          })
        ).pipe(Atom.keepAlive),
      };
    return page;
  }
);
