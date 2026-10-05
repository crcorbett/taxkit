import type { CalculatorRpcClientError } from "@taxkit/api-rpc/errors";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import type {
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
} from "@taxkit/api-rpc/schemas";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { Effect, Layer, Option, Result } from "effect";
import { FetchHttpClient } from "effect/http";
import * as Atom from "effect/reactivity/Atom";

import { TaxKitWebConfigError } from "./config";
import { takeHomeRequestFromForm, initialTakeHomeForm } from "./form.boundary";
import type { TakeHomeForm } from "./form.boundary";
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
