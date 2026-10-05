import type { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import type {
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/api-rpc/schemas";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { AuPayCalculatorId } from "@taxkit/rules-au-pay/schemas";
import { Effect, Layer, Match, Option, Result } from "effect";
import { FetchHttpClient } from "effect/http";
import * as Atom from "effect/reactivity/Atom";

import { TaxKitWebConfigError } from "./config";
import {
  takeHomeRequestFromForm,
  annualTaxRequestFromForm,
  initialTakeHomeForm,
  AnnualTaxForm,
  WebsiteInputError,
} from "./form.boundary";
import type { TakeHomeForm, WebsiteCalculatorForm } from "./form.boundary";
import type { WebsitePublicSettings } from "./schemas";

// These are descriptions of work. React's registry owns client acquisition,
// execution and release; no module creates or runs a browser ManagedRuntime.
// The loader seeds these settings for the React registry's whole lifetime.
// They must survive an idle form before its first calculation.
export const publicSettingsAtom = Atom.make(
  Option.none<WebsitePublicSettings>()
).pipe(Atom.keepAlive);
export const calculatorRuntime = Atom.runtime((get) =>
  Option.match(get(publicSettingsAtom), {
    onNone: () =>
      Layer.effect(
        TaxKitRpcClient,
        Effect.fail(
          new TaxKitWebConfigError({
            message: "TaxKit web settings are missing or invalid.",
            operation: "settings",
            runtime: "client",
          })
        )
      ),
    onSome: (settings) =>
      TaxKitRpcClientLive(settings.apiOrigin).pipe(
        Layer.provide(FetchHttpClient.layer)
      ),
  })
);
export const calculateAtom: Atom.AtomResultFn<
  CalculatorRunServiceRequest,
  CalculatorRunResponse,
  CalculatorRpcClientError | TaxKitWebConfigError
> = calculatorRuntime.fn<CalculatorRunServiceRequest>()((request) =>
  TaxKitRpcClient.pipe(Effect.flatMap((client) => client.calculate(request)))
);
export const takeHomeFormAtom = Atom.make(initialTakeHomeForm);
export const showServerResultAtom = Atom.make(true);
export const showCalculationAtom = Atom.make(false);
export const formErrorAtom = Atom.make(Option.none<string>());
export const editTakeHomeAtom = Atom.fnSync<TakeHomeForm>()((form, get) => {
  get.set(calculateAtom, Atom.Interrupt);
  get.set(showCalculationAtom, false);
  get.set(showServerResultAtom, false);
  get.set(formErrorAtom, Option.none());
  get.set(takeHomeFormAtom, form);
});
export const submitTakeHomeAtom = Atom.fnSync<"calculate">()((_, get) => {
  const request = takeHomeRequestFromForm(get(takeHomeFormAtom));
  // Native AsyncResult retains the last success during refresh/failure.
  // Reset would erase that answer when invalid input prevents a new request.
  get.set(showCalculationAtom, true);
  get.set(showServerResultAtom, false);
  if (Result.isFailure(request)) {
    get.set(formErrorAtom, Option.some(request.failure.message));
    return;
  }
  get.set(formErrorAtom, Option.none());
  get.set(calculateAtom, request.success);
});

// The registry owns separate temporary state for each checked calculator ID.
// The family memoises descriptions, never a client or a computed answer.
export const calculatorPageAtoms = Atom.family(
  (calculatorId: CalculatorRunServiceRequest["calculatorId"]) => {
    const form = Atom.make<WebsiteCalculatorForm>(
      Match.value(calculatorId).pipe(
        Match.when("au.income-tax.annual", () =>
          AnnualTaxForm.make({ taxableDollars: "67000" })
        ),
        Match.when("au.pay.take-home", () => initialTakeHomeForm),
        Match.orElse(() => ({
          grossDollars: "9500",
          period: "monthly",
          taxFreeThresholdClaimed: false,
        }))
      )
    );
    const calculation = calculatorRuntime.fn<CalculatorRunServiceRequest>()(
      (request) =>
        TaxKitRpcClient.pipe(
          Effect.flatMap((client) => client.calculate(request))
        )
    );
    const showSaved = Atom.make(true);
    const showCalculation = Atom.make(false);
    const formError = Atom.make(Option.none<string>());
    const edit = Atom.fnSync<WebsiteCalculatorForm>()((value, get) => {
      get.set(calculation, Atom.Interrupt);
      get.set(showCalculation, false);
      get.set(showSaved, false);
      get.set(formError, Option.none());
      get.set(form, value);
    });
    const submit = Atom.fnSync<"calculate">()((_, get) => {
      const current = get(form);
      const request = Result.gen(function* () {
        if (calculatorId === "au.income-tax.annual") {
          return yield* "taxableDollars" in current
            ? annualTaxRequestFromForm(current)
            : Result.fail(
                new WebsiteInputError({
                  message: "Enter a valid annual taxable income.",
                })
              );
        }
        return yield* "grossDollars" in current
          ? takeHomeRequestFromForm(
              current,
              AuPayCalculatorId.make(calculatorId)
            )
          : Result.fail(
              new WebsiteInputError({
                message: "Enter a valid pay amount and pay period.",
              })
            );
      });
      get.set(showCalculation, true);
      get.set(showSaved, false);
      if (Result.isFailure(request)) {
        get.set(formError, Option.some(request.failure.message));
        return;
      }
      get.set(formError, Option.none());
      get.set(calculation, request.success);
    });
    return {
      calculation,
      edit,
      form,
      formError,
      showCalculation,
      showSaved,
      submit,
    } as const;
  }
);
