import { RegistryContext } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { CalculatorRpcUnavailable } from "@taxkit/api-rpc/errors";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { Effect, Layer, Option, Result, Schema } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";

import {
  calculateAtom,
  calculatorRuntime,
  editTakeHomeAtom,
  publicSettingsAtom,
  submitTakeHomeAtom,
} from "./calculator.atoms";
import { initialTakeHomeForm, takeHomeRequestFromForm } from "./form.boundary";
import {
  WebsitePublicSettings,
  WebsiteSubmission,
  WebsiteSubmissionTransport,
} from "./schemas";
import { TakeHomeCalculator } from "./take-home.container";

describe("browser calculator lifetime", () => {
  it.live(
    "retains checked settings while the form is idle, then attempts its request",
    () =>
      Effect.gen(function* () {
        const apiOrigin = yield* Schema.decodeUnknownEffect(
          WebsitePublicSettings.fields.apiOrigin
        )("http://127.0.0.1:49999");
        const request = yield* Effect.fromResult(
          takeHomeRequestFromForm(initialTakeHomeForm)
        );
        const registry = yield* Effect.acquireRelease(
          Effect.sync(() =>
            AtomRegistry.make({
              initialValues: [
                [
                  publicSettingsAtom,
                  Option.some(WebsitePublicSettings.make({ apiOrigin })),
                ],
              ],
            })
          ),
          (value) => Effect.sync(() => value.dispose())
        );
        yield* Effect.sleep("750 millis");
        const unmount = registry.mount(calculateAtom);
        yield* Effect.addFinalizer(() => Effect.sync(unmount));
        registry.set(calculateAtom, request);
        yield* Effect.promise(() =>
          expect
            .poll(() => AsyncResult.isFailure(registry.get(calculateAtom)))
            .toBe(true)
        );
        const result = registry.get(calculateAtom);
        expect(AsyncResult.isFailure(result)).toBe(true);
        if (AsyncResult.isFailure(result)) {
          const failure = yield* result.cause.pipe(
            Effect.failCause,
            Effect.result
          );
          expect(Result.isFailure(failure)).toBe(true);
          if (Result.isFailure(failure)) {
            expect(failure.failure._tag).toBe("CalculatorRpcUnavailable");
          }
        }
      }).pipe(Effect.scoped)
  );

  it.effect("an edit interrupts work and removes the waiting result", () =>
    Effect.gen(function* () {
      const started = vi.fn();
      const cancelled = vi.fn();
      const client = Layer.succeed(
        TaxKitRpcClient,
        TaxKitRpcClient.of({
          calculate: Effect.fn("TaxKitRpcClient.calculate")(() =>
            Effect.sync(started).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Effect.sync(cancelled))
            )
          ),
        })
      );
      const registry = yield* Effect.acquireRelease(
        Effect.sync(() =>
          AtomRegistry.make({
            initialValues: [[calculatorRuntime.layer, client]],
          })
        ),
        (value) => Effect.sync(() => value.dispose())
      );
      const unmount = registry.mount(calculateAtom);
      yield* Effect.addFinalizer(() => Effect.sync(unmount));
      registry.set(submitTakeHomeAtom, "calculate");
      yield* Effect.promise(() =>
        expect.poll(() => started.mock.calls.length).toBe(1)
      );
      registry.set(editTakeHomeAtom, {
        ...initialTakeHomeForm,
        grossDollars: "2000",
      });
      yield* Effect.promise(() =>
        expect.poll(() => cancelled.mock.calls.length).toBe(1)
      );
      expect(registry.get(calculateAtom).waiting).toBe(false);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "leaving the rendered form interrupts work before the registry is disposed",
    () =>
      Effect.gen(function* () {
        const started = vi.fn();
        const cancelled = vi.fn();
        const client = Layer.succeed(
          TaxKitRpcClient,
          TaxKitRpcClient.of({
            calculate: Effect.fn("TaxKitRpcClient.calculate")(() =>
              Effect.sync(started).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() => Effect.sync(cancelled))
              )
            ),
          })
        );
        const registry = yield* Effect.acquireRelease(
          Effect.sync(() =>
            AtomRegistry.make({
              initialValues: [[calculatorRuntime.layer, client]],
            })
          ),
          (value) => Effect.sync(() => value.dispose())
        );
        const host = yield* Effect.acquireRelease(
          Effect.sync(() => {
            const element = document.createElement("div");
            document.body.appendChild(element);
            return element;
          }),
          (element) => Effect.sync(() => element.remove())
        );
        const root = yield* Effect.acquireRelease(
          Effect.sync(() => createRoot(host)),
          (value) => Effect.sync(() => value.unmount())
        );
        root.render(
          <RegistryContext.Provider value={registry}>
            <TakeHomeCalculator submission={Option.none()} />
          </RegistryContext.Provider>
        );
        yield* Effect.promise(() =>
          expect.poll(() => host.querySelector("form")).not.toBeNull()
        );
        registry.set(submitTakeHomeAtom, "calculate");
        yield* Effect.promise(() =>
          expect.poll(() => started.mock.calls.length).toBe(1)
        );
        root.render(
          <RegistryContext.Provider value={registry}>
            <p>Another page</p>
          </RegistryContext.Provider>
        );
        yield* Effect.promise(() =>
          expect.poll(() => cancelled.mock.calls.length).toBe(1)
        );
        expect(host.textContent).toBe("Another page");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "restores an expected server error without starting another calculation",
    () =>
      Effect.gen(function* () {
        const called = vi.fn();
        const errors = vi.fn();
        const client = Layer.succeed(
          TaxKitRpcClient,
          TaxKitRpcClient.of({
            calculate: Effect.fn("TaxKitRpcClient.calculate")(() =>
              Effect.sync(called).pipe(
                Effect.andThen(Effect.fail(new CalculatorRpcUnavailable()))
              )
            ),
          })
        );
        const submission = yield* Schema.encodeEffect(
          WebsiteSubmissionTransport
        )(
          WebsiteSubmission.make({
            form: initialTakeHomeForm,
            result: Result.fail(new CalculatorRpcUnavailable()),
          })
        );
        const registry = yield* Effect.acquireRelease(
          Effect.sync(() =>
            AtomRegistry.make({
              initialValues: [[calculatorRuntime.layer, client]],
            })
          ),
          (value) => Effect.sync(() => value.dispose())
        );
        const restored = yield* Schema.decodeEffect(WebsiteSubmissionTransport)(
          submission
        );
        const view = (
          <RegistryContext.Provider value={registry}>
            <TakeHomeCalculator submission={Option.some(restored)} />
          </RegistryContext.Provider>
        );
        const host = yield* Effect.acquireRelease(
          Effect.sync(() => {
            const element = document.createElement("div");
            element.insertAdjacentHTML("afterbegin", renderToString(view));
            document.body.appendChild(element);
            return element;
          }),
          (element) => Effect.sync(() => element.remove())
        );
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            hydrateRoot(host, view, {
              onRecoverableError: errors,
              onUncaughtError: errors,
            })
          ),
          (value) => Effect.sync(() => value.unmount())
        );
        yield* Effect.promise(() =>
          expect
            .poll(() => host.querySelector('[role="alert"]')?.textContent)
            .toContain("Check your pay details")
        );
        expect(called).not.toHaveBeenCalled();
        expect(errors).not.toHaveBeenCalled();
        expect(host.textContent).not.toContain("Take-home pay:");
      }).pipe(Effect.scoped)
  );
});
