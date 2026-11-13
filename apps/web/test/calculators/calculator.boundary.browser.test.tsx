import { RegistryContext } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import {
  initialTakeHomeForm,
  takeHomeRequestFromForm,
} from "@taxkit/calculators/form";
import { TakeHomeCalculatorSummary } from "@taxkit/calculators/summaries";
import { DocsPublicationOrigin } from "@taxkit/content/schemas";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { Money, Cents } from "@taxkit/core/primitives";
import { RuleId, SourceRef, TraceNode } from "@taxkit/core/trace";
import {
  AuPayCalculatorId,
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import {
  Array,
  Schedule,
  Predicate,
  Match,
  Function as EffectFunction,
  Effect,
  Layer,
  Option,
  Ref,
  Schema,
} from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { TestClock } from "effect/testing";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";

import {
  ApiClient,
  apiClientRuntime,
  publicSettingsAtom,
} from "../../src/lib/api-client.atoms";
import { CalculatorResult } from "../../src/lib/calculators/calculator-result.view";
import { CalculatorPage } from "../../src/lib/calculators/calculator.container";
import { calculatorPageAtoms } from "../../src/lib/calculators/page.atoms";
import { WebsitePublicSettings } from "../../src/lib/host/schemas";
// The home page's calculator state and commands.
const home = EffectFunction.pipe(
  AuPayCalculatorId.make("au.pay.take-home"),
  calculatorPageAtoms
);
const calculateAtom = home.calculation;
const editTakeHomeAtom = home.edit;
const submitTakeHomeAtom = home.submit;
// A real generated client over the test's controlled transport, supplied
// through the native client runtime's Layer.
const generatedClient = Layer.effect(
  ApiClient,
  HttpApiClient.make(TaxKitApi, { baseUrl: "http://127.0.0.1:49999" })
);
const unreachable = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.fail(
    new HttpClientError.HttpClientError({
      reason: new HttpClientError.TransportError({ request }),
    })
  );
describe("browser calculator lifetime", () => {
  it.effect(
    "retains checked settings while the form is idle, then attempts its request",
    () =>
      Effect.gen(function* () {
        const apiOrigin = yield* Schema.decodeUnknownEffect(
          WebsitePublicSettings.fields.apiOrigin
        )("http://127.0.0.1:49999");
        const websiteOrigin = yield* Schema.decodeUnknownEffect(
          WebsitePublicSettings.fields.websiteOrigin
        )("http://127.0.0.1:49998");
        const request = yield* Effect.fromResult(
          takeHomeRequestFromForm(initialTakeHomeForm)
        );
        // The browser transport fails deliberately, so no real socket or
        // closed-port assumption decides the outcome.
        const transport = yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi
              .spyOn(globalThis, "fetch")
              .mockRejectedValue(new TypeError("Failed to fetch"))
          ),
          (spy) =>
            Effect.sync(() => {
              spy.mockRestore();
            })
        );
        const registry = yield* Effect.acquireRelease(
          Effect.sync(() =>
            AtomRegistry.make({
              initialValues: [
                [
                  publicSettingsAtom,
                  Option.some(
                    WebsitePublicSettings.make({
                      apiOrigin,
                      publicationOrigin:
                        DocsPublicationOrigin.make(websiteOrigin),
                      websiteOrigin,
                    })
                  ),
                ],
              ],
            })
          ),
          (value) =>
            Effect.sync(() => {
              value.dispose();
            })
        );
        // Release the settings and an ordinary atom, then yield once: the
        // registry's idle removals run as microtasks before this resumes. The
        // ordinary atom goes; the kept-alive settings stay.
        const transient = Atom.make(0);
        registry.mount(publicSettingsAtom)();
        registry.mount(transient)();
        yield* Effect.yieldNow;
        EffectFunction.pipe(registry.getNodes().has(transient), (kept) => {
          expect(kept).toBeFalsy();
        });
        EffectFunction.pipe(
          registry.get(publicSettingsAtom),
          Option.isSome,
          (retained) => {
            expect(retained).toBeTruthy();
          }
        );
        const unmount = registry.mount(calculateAtom);
        yield* Effect.addFinalizer(() => Effect.sync(unmount));
        registry.set(calculateAtom, request);
        const failure = yield* AtomRegistry.getResult(registry, calculateAtom, {
          suspendOnWaiting: true,
        }).pipe(Effect.flip);
        EffectFunction.pipe(
          Predicate.isTagged(failure, "ApiUnavailable"),
          (matches) => {
            expect(matches).toBeTruthy();
          }
        );
        // The request used the retained settings' API origin.
        EffectFunction.pipe(
          transport.mock.calls,
          Array.head,
          Option.map(([input]) => new Request(input).url),
          (actual) => {
            expect(actual).toStrictEqual(
              Option.some(
                "http://127.0.0.1:49999/api/v2/calculators/au.pay.take-home/calculate"
              )
            );
          }
        );
      }).pipe(Effect.scoped)
  );
  it.effect("an edit interrupts work and removes the waiting result", () =>
    Effect.gen(function* () {
      const started = vi.fn<(...args: readonly unknown[]) => void>();
      const cancelled = vi.fn<(...args: readonly unknown[]) => void>();
      const client = generatedClient.pipe(
        Layer.provide(
          Layer.succeed(HttpClient.HttpClient)(
            HttpClient.make((request) =>
              Effect.sync(started)
                .pipe(
                  Effect.andThen(Effect.never),
                  Effect.onInterrupt(() => Effect.sync(cancelled))
                )
                .pipe(
                  Effect.map((response) =>
                    HttpClientResponse.fromWeb(request, response)
                  )
                )
            )
          )
        )
      );
      const registry = yield* Effect.acquireRelease(
        Effect.sync(() =>
          AtomRegistry.make({
            initialValues: [[apiClientRuntime.layer, client]],
          })
        ),
        (value) =>
          Effect.sync(() => {
            value.dispose();
          })
      );
      const unmount = registry.mount(calculateAtom);
      yield* Effect.addFinalizer(() => Effect.sync(unmount));
      registry.set(submitTakeHomeAtom, "calculate");
      yield* Effect.sync(() => started.mock.calls.length).pipe(
        Effect.repeat({
          until: (observed) => observed === 1,
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toBe(1);
          })
        )
      );
      registry.set(editTakeHomeAtom, {
        ...initialTakeHomeForm,
        grossDollars: "2000",
      });
      yield* Effect.sync(() => cancelled.mock.calls.length).pipe(
        Effect.repeat({
          until: (observed) => observed === 1,
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toBe(1);
          })
        )
      );
      expect(!registry.get(calculateAtom).waiting).toBeTruthy();
    }).pipe(Effect.scoped)
  );
  it.effect(
    "leaving the rendered form interrupts work before the registry is disposed",
    () =>
      Effect.gen(function* () {
        const started = vi.fn<(...args: readonly unknown[]) => void>();
        const cancelled = vi.fn<(...args: readonly unknown[]) => void>();
        const client = generatedClient.pipe(
          Layer.provide(
            Layer.succeed(HttpClient.HttpClient)(
              HttpClient.make((request) =>
                Effect.sync(started)
                  .pipe(
                    Effect.andThen(Effect.never),
                    Effect.onInterrupt(() => Effect.sync(cancelled))
                  )
                  .pipe(
                    Effect.map((response) =>
                      HttpClientResponse.fromWeb(request, response)
                    )
                  )
              )
            )
          )
        );
        const registry = yield* Effect.acquireRelease(
          Effect.sync(() =>
            AtomRegistry.make({
              initialValues: [[apiClientRuntime.layer, client]],
            })
          ),
          (value) =>
            Effect.sync(() => {
              value.dispose();
            })
        );
        const host = yield* Effect.acquireRelease(
          Effect.sync(() => {
            const element = document.createElement("div");
            document.body.insertBefore(element, null);
            return element;
          }),
          (element) => Effect.sync(() => element.remove())
        );
        const root = yield* Effect.acquireRelease(
          Effect.sync(() => createRoot(host)),
          (value) =>
            Effect.sync(() => {
              value.unmount();
            })
        );
        root.render(
          <RegistryContext.Provider value={registry}>
            <CalculatorPage calculator={TakeHomeCalculatorSummary} />
          </RegistryContext.Provider>
        );
        yield* Effect.sync(() => host.querySelector("form")).pipe(
          Effect.repeat({
            until: (observed) => Option.isSome(Option.fromNullishOr(observed)),
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          TestClock.withLive,
          Effect.tap((observed) =>
            Effect.sync(() => {
              expect(observed).not.toBeNull();
            })
          )
        );
        registry.set(submitTakeHomeAtom, "calculate");
        yield* Effect.sync(() => started.mock.calls.length).pipe(
          Effect.repeat({
            until: (observed) => observed === 1,
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          TestClock.withLive,
          Effect.tap((observed) =>
            Effect.sync(() => {
              expect(observed).toBe(1);
            })
          )
        );
        root.render(
          <RegistryContext.Provider value={registry}>
            <p>Another page</p>
          </RegistryContext.Provider>
        );
        yield* Effect.sync(() => cancelled.mock.calls.length).pipe(
          Effect.repeat({
            until: (observed) => observed === 1,
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          TestClock.withLive,
          Effect.tap((observed) =>
            Effect.sync(() => {
              expect(observed).toBe(1);
            })
          )
        );
        expect(host.textContent).toBe("Another page");
      }).pipe(Effect.scoped)
  );
  it.effect("keeps old request errors hidden while a retry is running", () =>
    Effect.gen(function* () {
      const attempt = yield* Ref.make(0);
      const client = generatedClient.pipe(
        Layer.provide(
          Layer.succeed(HttpClient.HttpClient)(
            HttpClient.make((request) =>
              Ref.getAndUpdate(attempt, (value) => value + 1)
                .pipe(
                  Effect.flatMap((value) =>
                    Match.value(value).pipe(
                      Match.when(0, () => unreachable(request)),
                      Match.orElse(() => Effect.never)
                    )
                  )
                )
                .pipe(
                  Effect.map((response) =>
                    HttpClientResponse.fromWeb(request, response)
                  )
                )
            )
          )
        )
      );
      const registry = yield* Effect.acquireRelease(
        Effect.sync(() =>
          AtomRegistry.make({
            initialValues: [[apiClientRuntime.layer, client]],
          })
        ),
        (value) =>
          Effect.sync(() => {
            value.dispose();
          })
      );
      const host = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const element = document.createElement("div");
          document.body.insertBefore(element, null);
          return element;
        }),
        (element) => Effect.sync(() => element.remove())
      );
      const root = yield* Effect.acquireRelease(
        Effect.sync(() => createRoot(host)),
        (value) =>
          Effect.sync(() => {
            value.unmount();
          })
      );
      root.render(
        <RegistryContext.Provider value={registry}>
          <CalculatorPage calculator={TakeHomeCalculatorSummary} />
        </RegistryContext.Provider>
      );
      yield* Effect.sync(() => host.querySelector("form")).pipe(
        Effect.repeat({
          until: (observed) => Option.isSome(Option.fromNullishOr(observed)),
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).not.toBeNull();
          })
        )
      );
      registry.set(submitTakeHomeAtom, "calculate");
      yield* Effect.sync(
        () => host.querySelector('[role="alert"]')?.textContent
      ).pipe(
        Effect.repeat({
          until: (observed) =>
            Option.fromNullishOr(observed).pipe(
              Option.exists((text) => text.includes("Please try again."))
            ),
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toContain("Please try again.");
          })
        )
      );
      expect(!registry.get(calculateAtom).waiting).toBeTruthy();
      registry.set(submitTakeHomeAtom, "calculate");
      yield* Effect.sync(() => host.textContent).pipe(
        Effect.repeat({
          until: (observed) =>
            Option.fromNullishOr(observed).pipe(
              Option.exists((text) => text.includes("Calculating…"))
            ),
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toContain("Calculating…");
          })
        )
      );
      expect(registry.get(calculateAtom).waiting).toBeTruthy();
      EffectFunction.pipe(host.querySelector('[role="alert"]'), (actual) => {
        expect(actual).toBeNull();
      });
    }).pipe(Effect.scoped)
  );
  it.effect(
    "marks, describes and focuses only the field to correct, without a request",
    () =>
      Effect.gen(function* () {
        const started = vi.fn<(...args: readonly unknown[]) => void>();
        const client = generatedClient.pipe(
          Layer.provide(
            Layer.succeed(HttpClient.HttpClient)(
              HttpClient.make((request) =>
                Effect.sync(started).pipe(Effect.andThen(unreachable(request)))
              )
            )
          )
        );
        const registry = yield* Effect.acquireRelease(
          Effect.sync(() =>
            AtomRegistry.make({
              initialValues: [[apiClientRuntime.layer, client]],
            })
          ),
          (value) =>
            Effect.sync(() => {
              value.dispose();
            })
        );
        const host = yield* Effect.acquireRelease(
          Effect.sync(() => {
            const element = document.createElement("div");
            document.body.insertBefore(element, null);
            return element;
          }),
          (element) => Effect.sync(() => element.remove())
        );
        const root = yield* Effect.acquireRelease(
          Effect.sync(() => createRoot(host)),
          (value) =>
            Effect.sync(() => {
              value.unmount();
            })
        );
        root.render(
          <RegistryContext.Provider value={registry}>
            <CalculatorPage calculator={TakeHomeCalculatorSummary} />
          </RegistryContext.Provider>
        );
        const button = yield* Effect.sync(() =>
          Option.fromNullishOr(
            host.querySelector<HTMLButtonElement>('button[type="submit"]')
          )
        ).pipe(
          Effect.repeat({
            until: Option.isSome,
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          TestClock.withLive,
          Effect.flatMap(Effect.fromOption)
        );
        registry.set(editTakeHomeAtom, {
          ...initialTakeHomeForm,
          grossDollars: "not money",
        });
        yield* Effect.sync(() => {
          button.focus();
          button.click();
        });
        const amount = yield* Effect.sync(() =>
          Option.fromNullishOr(
            host.querySelector<HTMLInputElement>('input[name="grossDollars"]')
          )
        ).pipe(
          Effect.repeat({
            until: (observed) =>
              observed.pipe(
                Option.exists(
                  (input) => input.getAttribute("aria-invalid") === "true"
                )
              ),
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          TestClock.withLive,
          Effect.flatMap(Effect.fromOption)
        );
        const description = Option.fromNullishOr(
          amount.getAttribute("aria-describedby")
        ).pipe(
          Option.flatMap((anchor) =>
            Option.fromNullishOr(
              document.querySelector(`#${CSS.escape(anchor)}`)
            )
          ),
          Option.map((element) => element.textContent)
        );
        expect({
          autoComplete: amount.getAttribute("autocomplete"),
          description: Option.getOrUndefined(description),
          focused: document.activeElement === amount,
          pageAlert: host.querySelector('[role="alert"]'),
          periodInvalid: host
            .querySelector('select[name="period"]')
            ?.getAttribute("aria-invalid"),
          requests: started.mock.calls.length,
        }).toStrictEqual({
          autoComplete: "off",
          description: "Enter a valid pay amount.",
          focused: true,
          pageAlert: null,
          periodInvalid: null,
          requests: 0,
        });
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
          amount: EffectFunction.pipe(Cents.make(100), Money.fromCents),
          effect: "additive",
          id: ComponentId.make("test/payg"),
          label: "PAYG withholding",
          status: "active",
          trace,
        });
        const report = TakeHomePayReport.make({
          salarySacrifice: Money.fromCents(Cents.make(0)),
          grossPay: EffectFunction.pipe(Cents.make(200), Money.fromCents),
          netPay: EffectFunction.pipe(Cents.make(100), Money.fromCents),
          period: "weekly",
          rulePackVersion: "rules-au-pay/1.0.2",
          taxablePay: EffectFunction.pipe(Cents.make(200), Money.fromCents),
          trace,
          withholdings: PayWithholdingsLedger.make({
            components: [component],
            period: "weekly",
            total: EffectFunction.pipe(Cents.make(100), Money.fromCents),
            trace,
          }),
          withholdingsTotal: EffectFunction.pipe(
            Cents.make(100),
            Money.fromCents
          ),
        });
        const html = renderToString(
          <CalculatorResult report={Option.some(report)} stale={false} />
        );
        EffectFunction.pipe(html.includes("href="), (actual) => {
          expect(actual).toBe(linked);
        });
        expect(html).toContain("Rule source");
        // No absent or unrecognised trace field can imply a threshold choice.
        expect(html).not.toContain("Tax-free threshold claimed.");
        expect(html).not.toContain("Tax-free threshold not claimed.");
      })
  );
});
