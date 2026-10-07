import type { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import type {
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/api-rpc/schemas";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import {
  AuPayCalculatorId,
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Cause, Effect, Layer, Match, Option, Result, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";

import { calculationFailureMessage } from "./calculation-failure";
import { TaxKitWebConfigError } from "./config";
import {
  takeHomeRequestFromForm,
  annualTaxRequestFromForm,
  initialTakeHomeForm,
  AnnualTaxForm,
  WebsiteInputError,
  TakeHomeForm,
} from "./form.boundary";
import type { WebsiteCalculatorForm } from "./form.boundary";
import type {
  WebsiteCalculatorViewState,
  WebsitePublicSettings,
} from "./schemas";

// These are descriptions of work. React's registry owns client acquisition,
// execution and release; no module creates or runs a browser ManagedRuntime.
// The loader seeds these settings for the React registry's whole lifetime.
// They must survive an idle form before its first calculation.
export const publicSettingsAtom = Atom.make(
  Option.none<WebsitePublicSettings>()
).pipe(Atom.keepAlive);
export const websiteCatalogueAtom = Atom.make(
  Option.none<CalculatorCatalogResponse>()
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
    const savedReport = Atom.make(
      Option.none<CalculatorRunResponse["report"]>()
    );
    const savedMessage = Atom.make(Option.none<string>());
    // Checked request identity belongs to one visible attempt. An edit or a
    // newer manual/tool submission invalidates a waiter for the older attempt.
    const attempt = Atom.make(Option.none<CalculatorRunServiceRequest>());
    const cancel = Atom.fnSync<"cancel">()((_, get) => {
      get.set(attempt, Option.none());
      get.set(calculation, Atom.Interrupt);
      get.set(showCalculation, false);
    });
    const edit = Atom.fnSync<WebsiteCalculatorForm>()((value, get) => {
      get.set(attempt, Option.none());
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
        get.set(attempt, Option.none());
        get.set(calculation, Atom.Interrupt);
        get.set(formError, Option.some(request.failure.message));
        return;
      }
      get.set(formError, Option.none());
      get.set(attempt, Option.some(request.success));
      get.set(calculation, request.success);
    });
    const group = {
      attempt,
      calculation,
      cancel,
      edit,
      form,
      formError,
      savedMessage,
      savedReport,
      showCalculation,
      showSaved,
      submit,
      // The registry retains this in-memory page snapshot across an uncommitted
      // React render. Otherwise idle cleanup can erase once-seeded SSR values
      // before hydration subscribes. Page cleanup still interrupts live work.
      // The retained view also holds its whole weak-family description group.
      // Otherwise browser GC can replace that group on a return visit while the
      // old values remain in the registry. The callback runs after group creation.
      // Disposing the root registry releases the snapshot and its client.
      view: Atom.make((get): WebsiteCalculatorViewState => {
        const current = get(calculation);
        const submitted = get(showCalculation);
        const saved = get(showSaved);
        const inputError = get(formError);
        const report = AsyncResult.value(current).pipe(
          Option.filter(
            (value) => value.calculator.calculatorId === calculatorId
          ),
          Option.map((value) => value.report),
          Option.orElse(() => get(savedReport)),
          Option.filter((value) =>
            Match.value(calculatorId).pipe(
              Match.when("au.income-tax.annual", () =>
                Schema.is(AnnualTaxReport)(value)
              ),
              Match.when("au.pay.take-home", () =>
                Schema.is(TakeHomePayReport)(value)
              ),
              Match.orElse(() => Schema.is(PayWithholdingsLedger)(value))
            )
          )
        );
        const message = Option.match(inputError, {
          onNone: () => {
            if (
              submitted &&
              !current.waiting &&
              (AsyncResult.isFailure(current) ||
                (AsyncResult.isSuccess(current) && Option.isNone(report)))
            ) {
              if (AsyncResult.isFailure(current)) {
                return current.cause.pipe(
                  Cause.findErrorOption,
                  Option.map(calculationFailureMessage)
                );
              }
              return Option.some(
                "The calculation could not finish. Please try again."
              );
            }
            return saved ? get(savedMessage) : Option.none<string>();
          },
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
            !saved &&
            (!submitted ||
              current.waiting ||
              !AsyncResult.isSuccess(current) ||
              Option.isSome(inputError)),
        };
      }).pipe(Atom.keepAlive),
    } as const;
    return group;
  }
);

// Home uses the same page commands and state owner as the other calculators.
// These existing names retain their narrow React/test call sites.
const home = calculatorPageAtoms(AuPayCalculatorId.make("au.pay.take-home"));
export const calculateAtom: Atom.AtomResultFn<
  CalculatorRunServiceRequest,
  CalculatorRunResponse,
  CalculatorRpcClientError | TaxKitWebConfigError
> = home.calculation;
export const takeHomeFormAtom = Atom.writable(
  (get) => {
    const form = get(home.form);
    return Schema.is(TakeHomeForm)(form) ? form : initialTakeHomeForm;
  },
  (get, form: TakeHomeForm) => get.set(home.form, form)
);
export const submitTakeHomeAtom = home.submit;
export const editTakeHomeAtom = Atom.fnSync<TakeHomeForm>()((value, get) =>
  get.set(home.edit, value)
);
