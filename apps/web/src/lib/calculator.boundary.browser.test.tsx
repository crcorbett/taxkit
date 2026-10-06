import { RegistryContext } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorRpcUnavailable,
  CalculatorRpcDeadlineExceeded,
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorRpcRequestTimedOut,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  CalculatorRpcRequestTooLarge,
  CalculatorRpcResponseTooLarge,
} from "@taxkit/api-rpc/errors";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { Cents, aud } from "@taxkit/core/primitives";
import { RuleId, SourceRef, TraceNode } from "@taxkit/core/trace";
import {
  AuPayCalculatorId,
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Effect, Layer, Option, Ref, Result, Schema } from "effect";
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
import { TakeHomeResultView } from "./take-home-result.view";
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
          getCalculator: () => Effect.die("Metadata not used by this fixture"),
          getCalculatorGraph: () =>
            Effect.die("Metadata not used by this fixture"),
          getCalculatorSchema: () =>
            Effect.die("Metadata not used by this fixture"),
          listCalculators: () =>
            Effect.die("Catalogue not used by this fixture"),
          listFacts: () => Effect.die("Metadata not used by this fixture"),
          listJurisdictions: () =>
            Effect.die("Metadata not used by this fixture"),
          listRules: () => Effect.die("Metadata not used by this fixture"),
          listTaxYears: () => Effect.die("Metadata not used by this fixture"),
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
            getCalculator: () =>
              Effect.die("Metadata not used by this fixture"),
            getCalculatorGraph: () =>
              Effect.die("Metadata not used by this fixture"),
            getCalculatorSchema: () =>
              Effect.die("Metadata not used by this fixture"),
            listCalculators: () =>
              Effect.die("Catalogue not used by this fixture"),
            listFacts: () => Effect.die("Metadata not used by this fixture"),
            listJurisdictions: () =>
              Effect.die("Metadata not used by this fixture"),
            listRules: () => Effect.die("Metadata not used by this fixture"),
            listTaxYears: () => Effect.die("Metadata not used by this fixture"),
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

  it.effect.each([
    {
      error: new CalculatorRpcUnavailable(),
      message: "Check your details",
    },
    {
      error: new CalculatorRpcDeadlineExceeded(),
      message: "within ten seconds",
    },
    { error: new CalculatorRateLimited(), message: "Wait a minute" },
    {
      error: new CalculatorAdmissionUnavailable(),
      message: "Try again when you are ready",
    },
    { error: new CalculatorRpcRequestTimedOut(), message: "request timed out" },
    {
      error: new CalculatorCapacityExceeded(),
      message: "The calculators are busy",
    },
    {
      error: new CalculatorOperationTimedOut(),
      message: "within five seconds",
    },
    { error: new CalculatorRpcRequestTooLarge(), message: "64 KiB or less" },
    { error: new CalculatorRpcResponseTooLarge(), message: "Reduce the query" },
  ])(
    "restores $error._tag and its guidance without starting another calculation",
    ({ error, message }) =>
      Effect.gen(function* () {
        const called = vi.fn();
        const errors = vi.fn();
        const client = Layer.succeed(
          TaxKitRpcClient,
          TaxKitRpcClient.of({
            calculate: Effect.fn("TaxKitRpcClient.calculate")(() =>
              Effect.sync(called).pipe(Effect.andThen(Effect.fail(error)))
            ),
            getCalculator: () =>
              Effect.die("Metadata not used by this fixture"),
            getCalculatorGraph: () =>
              Effect.die("Metadata not used by this fixture"),
            getCalculatorSchema: () =>
              Effect.die("Metadata not used by this fixture"),
            listCalculators: () =>
              Effect.die("Catalogue not used by this fixture"),
            listFacts: () => Effect.die("Metadata not used by this fixture"),
            listJurisdictions: () =>
              Effect.die("Metadata not used by this fixture"),
            listRules: () => Effect.die("Metadata not used by this fixture"),
            listTaxYears: () => Effect.die("Metadata not used by this fixture"),
          })
        );
        const submission = yield* Schema.encodeEffect(
          WebsiteSubmissionTransport
        )(
          WebsiteSubmission.make({
            calculatorId: AuPayCalculatorId.make("au.pay.take-home"),
            form: initialTakeHomeForm,
            result: Result.fail(error),
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
            .toContain(message)
        );
        expect(called).not.toHaveBeenCalled();
        expect(errors).not.toHaveBeenCalled();
        expect(host.textContent).not.toContain("Take-home pay:");
      }).pipe(Effect.scoped)
  );

  it.effect("keeps old request errors hidden while a retry is running", () =>
    Effect.gen(function* () {
      const attempt = yield* Ref.make(0);
      const client = Layer.succeed(
        TaxKitRpcClient,
        TaxKitRpcClient.of({
          calculate: Effect.fn("TaxKitRpcClient.calculate")(() =>
            Ref.getAndUpdate(attempt, (value) => value + 1).pipe(
              Effect.flatMap((value) =>
                value === 0
                  ? Effect.fail(new CalculatorRpcUnavailable())
                  : Effect.never
              )
            )
          ),
          getCalculator: () => Effect.die("Metadata not used by this fixture"),
          getCalculatorGraph: () =>
            Effect.die("Metadata not used by this fixture"),
          getCalculatorSchema: () =>
            Effect.die("Metadata not used by this fixture"),
          listCalculators: () =>
            Effect.die("Catalogue not used by this fixture"),
          listFacts: () => Effect.die("Metadata not used by this fixture"),
          listJurisdictions: () =>
            Effect.die("Metadata not used by this fixture"),
          listRules: () => Effect.die("Metadata not used by this fixture"),
          listTaxYears: () => Effect.die("Metadata not used by this fixture"),
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
        expect
          .poll(() => host.querySelector('[role="alert"]')?.textContent)
          .toContain("Please try again.")
      );
      expect(registry.get(calculateAtom).waiting).toBe(false);
      registry.set(submitTakeHomeAtom, "calculate");
      yield* Effect.promise(() =>
        expect.poll(() => host.textContent).toContain("Calculating…")
      );
      expect(registry.get(calculateAtom).waiting).toBe(true);
      expect(host.querySelector('[role="alert"]')).toBeNull();
    }).pipe(Effect.scoped)
  );

  it.effect.each([
    { linked: true, reference: "https://www.ato.gov.au/example" },
    { linked: false, reference: "data:text/html,example" },
    { linked: false, reference: "https://" },
  ])(
    "renders only valid HTTPS rule-source links: $reference",
    ({ reference, linked }) =>
      Effect.sync(() => {
        // Checked SourceRef allows general reference text; link presentation is narrower.
        const trace = TraceNode.make({
          children: [],
          inputs: {},
          result: 100,
          ruleId: RuleId.make("test/source-link"),
          sources: [
            SourceRef.make({
              kind: "ato-publication",
              reference,
              title: "Rule source",
            }),
          ],
          title: "Source link fixture",
        });
        const component = LedgerComponent.make({
          amount: aud(Cents.make(100)),
          effect: "additive",
          id: ComponentId.make("test/payg"),
          label: "PAYG withholding",
          status: "active",
          trace,
        });
        const report = new TakeHomePayReport({
          grossPay: aud(Cents.make(200)),
          netPay: aud(Cents.make(100)),
          period: "weekly",
          rulePackVersion: "rules-au-pay/1.0.0",
          taxablePay: aud(Cents.make(200)),
          trace,
          withholdings: new PayWithholdingsLedger({
            components: [component],
            period: "weekly",
            total: aud(Cents.make(100)),
            trace,
          }),
          withholdingsTotal: aud(Cents.make(100)),
        });
        const html = renderToString(
          <TakeHomeResultView report={Option.some(report)} stale={false} />
        );
        expect(html.includes("href=")).toBe(linked);
        expect(html).toContain("Rule source");
        // No absent or unrecognised trace field can imply a threshold choice.
        expect(html).not.toContain("Tax-free threshold claimed.");
        expect(html).not.toContain("Tax-free threshold not claimed.");
      })
  );
});
