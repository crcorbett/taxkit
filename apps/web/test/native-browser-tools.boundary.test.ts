import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  CalculatorToolFailure,
  CalculatorViewState,
} from "@taxkit/calculators/page-schemas";
import { CalculatorPageToolkit } from "@taxkit/calculators/page-tools";
import { CalculatorCatalogResponse } from "@taxkit/calculators/schemas";
import {
  Schedule,
  Match,
  Function as EffectFunction,
  Array,
  Effect,
  HashMap,
  Option,
  Order,
  Path,
  Queue,
  Record,
  Ref,
  Schema,
  Stream,
} from "effect";
import { Miniflare } from "miniflare";
import { chromium } from "playwright";
import type { Route } from "playwright";

import { readWorkerModules } from "./native-modules.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

const apiOrigin = "http://127.0.0.1:4231";
const websiteOrigin = "http://127.0.0.1:4230";
// The browser calls the public API directly; calculation is its only POST.
const catalogueRead = "GET /api/v1/calculators";
const calculation = (calculatorId: string) =>
  `POST /api/v1/calculators/${calculatorId}/calculate`;
const isAnnualCalculation = (url: URL) =>
  url.origin === apiOrigin &&
  url.pathname === "/api/v1/calculators/au.income-tax.annual/calculate";
const BrowserReply = Schema.toCodecJson(
  Schema.Union([
    CalculatorViewState,
    CalculatorToolFailure,
    CalculatorCatalogResponse,
  ])
);
it.live(
  "calls mounted calculator tools through Chrome's real native caller",
  () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const apiRoot = path.join(root, ".alchemy/native-pair/bundles/TaxKitApi");
      const websiteRoot = path.join(root, "apps/web/dist/server");
      const {
        files: apiFiles,
        modules: apiModules,
        wasm: apiWasm,
      } = yield* readWorkerModules({
        modulesRoot: apiRoot,
      });
      const { files: websiteFiles, modules: websiteModules } =
        yield* readWorkerModules({
          modulesRoot: websiteRoot,
        });
      expect(apiFiles).toContain("worker.js");
      expect(websiteFiles).toContain("entry.server.js");
      const exceptions = yield* Queue.make<string>();
      const apiWorker = (name: string) => ({
        config: {
          compatibilityDate: "2026-10-04",
          compatibilityFlags: ["nodejs_compat"],
          env: {
            ...nativeRateFixture("10090"),
            API_PUBLIC_ORIGIN: { type: "json" as const, value: apiOrigin },
            TAXKIT_PUBLICATION_ORIGIN: {
              type: "json" as const,
              value: websiteOrigin,
            },
            WEBSITE_PUBLIC_ORIGIN: {
              type: "json" as const,
              value: websiteOrigin,
            },
            WORKER_URL: { type: "json" as const, value: apiOrigin },
          },
          manifest: {
            mainModule: "worker.js",
            modules: { ...apiModules, ...apiWasm },
            modulesRoot: apiRoot,
          },
          name,
        },
      });
      const api = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4231,
              workers: [apiWorker("browser-public-api")],
            })
        ),
        (host) => Effect.promise(() => host.dispose())
      );
      const website = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4230,
              workers: [
                {
                  config: {
                    assets: {
                      directory: path.join(root, "apps/web/dist/client"),
                      hasUserWorker: true,
                      runWorkerFirst: false,
                    },
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    env: {
                      ...nativeRateFixture("10091"),
                      API_PUBLIC_ORIGIN: { type: "json", value: apiOrigin },
                      TAXKIT_API: {
                        type: "worker",
                        worker: "browser-private-api",
                      },
                      TAXKIT_PUBLICATION_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                    },
                    manifest: {
                      mainModule: "entry.server.js",
                      modules: websiteModules,
                      modulesRoot: websiteRoot,
                    },
                    name: "browser-website",
                  },
                },
                apiWorker("browser-private-api"),
              ],
            })
        ),
        (host) => Effect.promise(() => host.dispose())
      );
      yield* Effect.promise(() => api.ready);
      yield* Effect.promise(() => website.ready);
      const browser = yield* Effect.acquireRelease(
        Effect.promise(() =>
          chromium.launch({
            args: ["--enable-features=WebMCP"],
            headless: true,
          })
        ),
        (host) => Effect.promise(() => host.close())
      );
      const context = yield* Effect.acquireRelease(
        Effect.promise(() => browser.newContext()),
        (host) => Effect.promise(() => host.close())
      );
      const page = yield* Effect.promise(() => context.newPage());
      page.on("pageerror", (error) => {
        Queue.offerUnsafe(exceptions, error.message);
      });
      const caller = yield* Effect.acquireRelease(
        Effect.promise(() => context.newCDPSession(page)),
        (host) => Effect.promise(() => host.detach())
      );
      // Derive observations and commands from the installed caller's own types.
      // Chrome153's document caller takes JSON text; this native caller accepts
      // structured input. No invented document API or type assertion is used.
      type Added = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolsAdded">>[1]
      >[0];
      type Responded = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolResponded">>[1]
      >[0];
      type Removed = Parameters<
        Parameters<typeof caller.on<"WebMCP.toolsRemoved">>[1]
      >[0];
      type Input = NonNullable<
        Parameters<typeof caller.send<"WebMCP.invokeTool">>[1]
      >["input"];
      const added = yield* Queue.make<Added>();
      const replied = yield* Queue.make<Responded>();
      const observedReplies = yield* Ref.make(
        HashMap.empty<Responded["invocationId"], Responded>()
      );
      const removed = yield* Queue.make<Removed>();
      const calls = yield* Queue.make<string>();
      caller.on("WebMCP.toolsAdded", (event) => {
        Queue.offerUnsafe(added, event);
      });
      caller.on("WebMCP.toolResponded", (event) => {
        Queue.offerUnsafe(replied, event);
      });
      caller.on("WebMCP.toolsRemoved", (event) => {
        Queue.offerUnsafe(removed, event);
      });
      // Calls are calculations plus any retired Website transport path;
      // public API reads are recorded separately.
      const reads = yield* Queue.make<string>();
      page.on("request", (request) => {
        const url = new URL(request.url());
        const call = `${request.method()} ${url.pathname}`;
        if (url.origin === apiOrigin && request.method() === "GET") {
          Queue.offerUnsafe(reads, call);
        } else if (
          url.origin === apiOrigin ||
          url.pathname.startsWith("/_serverFn")
        ) {
          Queue.offerUnsafe(calls, `${call}${url.search}`);
        }
      });
      yield* Effect.promise(() => caller.send("WebMCP.enable"));
      const discover = Effect.fnUntraced(function* () {
        return yield* Stream.fromQueue(added).pipe(
          Stream.map((event) => event.tools),
          Stream.tap((tools) =>
            Effect.logInfo("native-webmcp: discovered", {
              names: EffectFunction.pipe(
                tools,
                Array.map((tool) => tool.name)
              ),
            })
          ),
          Stream.scan(
            () => Array.empty<Added["tools"][number]>(),
            (current, next) => Array.appendAll(current, next)
          ),
          Stream.filter((tools) => tools.length === 5),
          Stream.take(1),
          Stream.runHead,
          Effect.flatMap(Effect.fromOption)
        );
      });
      const waitForReply = Effect.fnUntraced(function* ({
        invocationId,
      }: {
        readonly invocationId: string;
      }) {
        const observed = yield* Ref.get(observedReplies);
        const previous = HashMap.get(observed, invocationId);
        if (Option.isSome(previous)) {
          yield* Ref.update(observedReplies, HashMap.remove(invocationId));
          return previous.value;
        }
        const response = yield* Stream.fromQueue(replied).pipe(
          Stream.tap((event) =>
            Ref.update(observedReplies, HashMap.set(event.invocationId, event))
          ),
          Stream.filter((event) => event.invocationId === invocationId),
          Stream.take(1),
          Stream.runHead,
          Effect.flatMap(Effect.fromOption)
        );
        yield* Ref.update(observedReplies, HashMap.remove(invocationId));
        return response;
      });
      const waitForRemoval = Effect.fnUntraced(function* () {
        return yield* Stream.fromQueue(removed).pipe(
          Stream.map((event) => event.tools),
          Stream.scan(
            () => Array.empty<Removed["tools"][number]>(),
            (current, next) => Array.appendAll(current, next)
          ),
          Stream.filter((tools) => tools.length === 5),
          Stream.take(1),
          Stream.runHead,
          Effect.flatMap(Effect.fromOption)
        );
      });
      const { tools, call } = yield* Effect.gen(function* verifyInitialTools() {
        const initialTools = yield* Effect.promise(() =>
          page.goto(websiteOrigin)
        ).pipe(Effect.andThen(discover()));
        expect({
          toolNames: EffectFunction.pipe(
            initialTools,
            Array.map((tool) => tool.name),
            Array.sort(Order.String)
          ),
          QueueClearCalls: yield* Queue.clear(calls),
        }).toStrictEqual({
          toolNames: EffectFunction.pipe(
            Record.keys(CalculatorPageToolkit.tools),
            Array.sort(Order.String)
          ),
          QueueClearCalls: [],
        });
        const invokeCheckedTool = Effect.fnUntraced(function* ({
          currentTools,
          name,
          input = {},
        }: {
          readonly currentTools: readonly Added["tools"][number][];
          readonly name: keyof typeof CalculatorPageToolkit.tools;
          readonly input?: Input;
        }) {
          const tool = yield* EffectFunction.pipe(
            currentTools,
            Array.findFirst((entry) => entry.name === name)
          ).pipe(Effect.fromOption);
          const started = yield* Effect.promise(() =>
            caller.send("WebMCP.invokeTool", {
              frameId: tool.frameId,
              input,
              toolName: tool.name,
            })
          );
          const response = yield* waitForReply({
            invocationId: started.invocationId,
          });
          yield* Effect.logInfo("native-webmcp: tool replied", {
            name,
            status: response.status,
          });
          expect(
            response.status,
            `${name}: ${response.errorText ?? "no host detail"}`
          ).toBe("Completed");
          return yield* Schema.decodeUnknownEffect(BrowserReply)(
            response.output
          );
        });
        const catalogue = yield* invokeCheckedTool({
          currentTools: initialTools,
          name: "taxkit_find_calculators",
        });
        EffectFunction.pipe(
          Schema.is(CalculatorCatalogResponse)(catalogue),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        const read = yield* invokeCheckedTool({
          currentTools: initialTools,
          name: "taxkit_read_calculator",
        });
        EffectFunction.pipe(Schema.is(CalculatorViewState)(read), (actual) => {
          expect(actual).toBeTruthy();
        });
        const initial = yield* invokeCheckedTool({
          currentTools: initialTools,
          name: "taxkit_calculate_visible_form",
        });
        EffectFunction.pipe(
          Schema.is(CalculatorViewState)(initial),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        yield* Effect.promise(() =>
          page.getByText("$1,301.00", { exact: true }).waitFor()
        );
        const visible = yield* invokeCheckedTool({
          currentTools: initialTools,
          name: "taxkit_read_result",
        });
        expect(visible).toStrictEqual(initial);
        const invalid = yield* invokeCheckedTool({
          currentTools: initialTools,
          name: "taxkit_calculate_visible_form",
          input: {
            unexpected: "PRIVATE9",
          },
        });
        EffectFunction.pipe(
          Schema.is(CalculatorToolFailure)(invalid),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        if (Schema.is(CalculatorToolFailure)(invalid)) {
          expect(invalid.code).toBe("invalid-input");
        }
        expect({
          QueueClearReads: yield* Queue.clear(reads),
          QueueClearCalls: yield* Queue.clear(calls),
        }).toStrictEqual({
          QueueClearReads: [catalogueRead],
          QueueClearCalls: [calculation("au.pay.take-home")],
        });
        return { tools: initialTools, call: invokeCheckedTool };
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyInitialTools"));
      const { annualTools } = yield* Effect.gen(function* verifyAnnualTools() {
        yield* Effect.promise(() =>
          page
            .locator('nav a[href="/calculators/au.income-tax.annual"]')
            .click()
        );
        yield* Effect.logInfo("native-webmcp: annual navigation complete");
        const registeredAnnualTools = yield* discover();
        expect(yield* waitForRemoval()).toHaveLength(5);
        const filled = yield* call({
          currentTools: registeredAnnualTools,
          name: "taxkit_fill_calculator",
          input: {
            taxableDollars: "75000",
          },
        });
        expect({
          viewChecked: Schema.is(CalculatorViewState)(filled),
          annualForm: {
            taxableIncomeInput: yield* Effect.promise(() =>
              page.getByLabel("Annual taxable income").inputValue()
            ),
            QueueClearCalls: yield* Queue.clear(calls),
          },
        }).toStrictEqual({
          viewChecked: true,
          annualForm: {
            taxableIncomeInput: "75000",
            QueueClearCalls: [],
          },
        });
        const annualResult = yield* call({
          currentTools: registeredAnnualTools,
          name: "taxkit_calculate_visible_form",
        });
        EffectFunction.pipe(
          Schema.is(CalculatorViewState)(annualResult),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        yield* Effect.promise(() =>
          page.getByText("$14,788.00", { exact: true }).first().waitFor()
        );
        expect({
          callAnnualToolsTaxkit_read_result: yield* call({
            currentTools: registeredAnnualTools,
            name: "taxkit_read_result",
          }),
          QueueClearCalls: yield* Queue.clear(calls),
        }).toStrictEqual({
          callAnnualToolsTaxkit_read_result: annualResult,
          QueueClearCalls: [calculation("au.income-tax.annual")],
        });
        const manualResponse = yield* Effect.sync(() =>
          page.waitForResponse(
            (response) =>
              isAnnualCalculation(new URL(response.url())) &&
              response.request().method() === "POST" &&
              response.ok()
          )
        );
        yield* Effect.promise(() =>
          page.getByRole("button", { exact: true, name: "Calculate" }).click()
        );
        yield* Effect.promise(() => manualResponse);
        yield* Effect.promise(() =>
          page
            .getByRole("button", { exact: true, name: "Calculate" })
            .isEnabled()
        ).pipe(
          Effect.repeat({
            until: (observed) => observed,
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          Effect.tap((observed) =>
            Effect.sync(() => {
              expect(observed).toBeTruthy();
            })
          )
        );
        expect(
          yield* call({
            currentTools: registeredAnnualTools,
            name: "taxkit_read_result",
          })
        ).toStrictEqual(annualResult);
        yield* call({
          currentTools: registeredAnnualTools,
          name: "taxkit_fill_calculator",
          input: {
            taxableDollars: "76000",
          },
        });
        const edited = yield* call({
          currentTools: registeredAnnualTools,
          name: "taxkit_read_result",
        });
        if (Schema.is(CalculatorViewState)(edited)) {
          expect({
            isStale: edited.stale,
            editedReport: edited.report,
          }).toStrictEqual({
            isStale: true,
            editedReport: Match.value(annualResult).pipe(
              Match.when(
                Schema.is(CalculatorViewState),
                (matchedValue) => matchedValue.report
              ),
              Match.orElse(() => Option.none())
            ),
          });
        }
        return { annualTools: registeredAnnualTools };
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyAnnualTools"));
      const { held, invoke } = yield* Effect.gen(
        function* verifyToolCancellation() {
          // Hold actual requests at the browser transport. Observe caller abort,
          // form edit and page exit separately; tools share the visible request.
          const heldRequests = yield* Queue.make<Route>();
          yield* Effect.promise(() =>
            page.route(isAnnualCalculation, (route) => {
              Queue.offerUnsafe(heldRequests, route);
            })
          );
          const calculateTool = yield* EffectFunction.pipe(
            annualTools,
            Array.findFirst(
              (tool) => tool.name === "taxkit_calculate_visible_form"
            )
          ).pipe(Effect.fromOption);
          const invokeCalculation = Effect.promise(() =>
            caller.send("WebMCP.invokeTool", {
              frameId: calculateTool.frameId,
              input: {},
              toolName: calculateTool.name,
            })
          );
          const aborted = yield* invokeCalculation;
          const abortedRequest = yield* Queue.take(heldRequests);
          yield* Effect.promise(() =>
            page
              .getByRole("button", { exact: true, name: "Calculating…" })
              .isEnabled()
          ).pipe(
            Effect.repeat({
              until: (observed) => !observed,
              schedule: Schedule.spaced("50 millis"),
            }),
            Effect.timeout(1000),
            Effect.tap((observed) =>
              Effect.sync(() => {
                expect(observed).toBeFalsy();
              })
            )
          );
          const busy = yield* call({
            currentTools: annualTools,
            name: "taxkit_calculate_visible_form",
          });
          if (Schema.is(CalculatorToolFailure)(busy)) {
            expect(busy.code).toBe("calculation-busy");
          } else {
            expect.fail("Busy calculator admitted a second tool call");
          }
          yield* Effect.promise(() =>
            caller.send("WebMCP.cancelInvocation", {
              invocationId: aborted.invocationId,
            })
          );
          expect(
            (yield* waitForReply({
              invocationId: aborted.invocationId,
            })).status
          ).not.toBe("Completed");
          yield* Effect.promise(() =>
            page
              .getByRole("button", { exact: true, name: "Calculate" })
              .isEnabled()
          ).pipe(
            Effect.repeat({
              until: (observed) => observed,
              schedule: Schedule.spaced("50 millis"),
            }),
            Effect.timeout(1000),
            Effect.tap((observed) =>
              Effect.sync(() => {
                expect(observed).toBeTruthy();
              })
            )
          );
          const afterAbort = yield* call({
            currentTools: annualTools,
            name: "taxkit_read_calculator",
          });
          if (Schema.is(CalculatorViewState)(afterAbort)) {
            expect({
              isIdle: !afterAbort.busy,
              isStale: afterAbort.stale,
            }).toStrictEqual({
              isIdle: true,
              isStale: true,
            });
          } else {
            expect.fail(
              "Caller abort did not return the visible calculator state"
            );
          }
          yield* Effect.promise(() => abortedRequest.abort());
          return { held: heldRequests, invoke: invokeCalculation };
        }
      ).pipe(Effect.withSpan("NativeBrowserTools.verifyToolCancellation"));
      const { retry } = yield* Effect.gen(function* verifyToolReplacement() {
        const replaced = yield* invoke;
        const replacedRequest = yield* Queue.take(held);
        yield* call({
          currentTools: annualTools,
          name: "taxkit_fill_calculator",
          input: {
            taxableDollars: "77000",
          },
        });
        expect(
          (yield* waitForReply({
            invocationId: replaced.invocationId,
          })).status
        ).not.toBe("Completed");
        yield* Effect.promise(() => replacedRequest.abort());
        const retryResponse = yield* Effect.sync(() =>
          page.waitForResponse(
            (response) =>
              isAnnualCalculation(new URL(response.url())) &&
              response.request().method() === "POST" &&
              response.ok()
          )
        );
        yield* Effect.promise(() =>
          page.getByRole("button", { exact: true, name: "Calculate" }).click()
        );
        const retryRequest = yield* Queue.take(held);
        yield* Effect.promise(() => retryRequest.continue());
        yield* Effect.promise(() => retryResponse);
        yield* Effect.promise(() =>
          page
            .getByRole("button", { exact: true, name: "Calculate" })
            .isEnabled()
        ).pipe(
          Effect.repeat({
            until: (observed) => observed,
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          Effect.tap((observed) =>
            Effect.sync(() => {
              expect(observed).toBeTruthy();
            })
          )
        );
        const retriedCalculation = yield* call({
          currentTools: annualTools,
          name: "taxkit_read_result",
        });
        if (Schema.is(CalculatorViewState)(retriedCalculation)) {
          expect({
            isIdle: !retriedCalculation.busy,
            isFresh: !retriedCalculation.stale,
            retryForm: retriedCalculation.form,
          }).toStrictEqual({
            isIdle: true,
            isFresh: true,
            retryForm: { taxableDollars: "77000" },
          });
        } else {
          expect.fail("Manual retry after a cancelled tool did not complete");
        }
        return { retry: retriedCalculation };
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyToolReplacement"));
      yield* Effect.gen(function* verifyToolDeparture() {
        const pending = yield* invoke;
        yield* Queue.take(held);
        // Tool removal alone does not cancel native execution in Chrome153.
        yield* Effect.promise(() =>
          page
            .getByRole("link", { exact: true, name: "For agents: API access" })
            .click()
        );
        expect(yield* waitForRemoval()).toHaveLength(5);
        const cancelled = yield* waitForReply({
          invocationId: pending.invocationId,
        });
        expect(cancelled.status).not.toBe("Completed");
        yield* Queue.clear(calls);
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyToolDeparture"));
      yield* Effect.gen(function* verifyToolRestoration() {
        // The registry retains a page snapshot, so its weak-family description
        // must survive too. Force actual browser GC between departure and return.
        yield* Effect.promise(() => page.waitForLoadState("networkidle"));
        yield* Effect.promise(() => caller.send("HeapProfiler.collectGarbage"));
        yield* Effect.promise(() =>
          page
            .locator('nav a[href="/calculators/au.income-tax.annual"]')
            .click()
        );
        const returnedTools = yield* discover();
        yield* Effect.promise(() =>
          page.getByLabel("Annual taxable income").inputValue()
        ).pipe(
          Effect.repeat({
            until: (observed) => observed === "77000",
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(1000),
          Effect.tap((observed) =>
            Effect.sync(() => {
              expect(observed).toBe("77000");
            })
          )
        );
        const returned = yield* call({
          currentTools: returnedTools,
          name: "taxkit_read_result",
        });
        if (Schema.is(CalculatorViewState)(returned)) {
          expect({
            restoredCalculation: {
              returnedForm: returned.form,
              returnedReport: returned.report,
            },
            isIdle: !returned.busy,
            isStale: returned.stale,
          }).toStrictEqual({
            restoredCalculation: {
              returnedForm: { taxableDollars: "77000" },
              returnedReport: Match.value(retry).pipe(
                Match.when(
                  Schema.is(CalculatorViewState),
                  (matchedValue) => matchedValue.report
                ),
                Match.orElse(() => Option.none())
              ),
            },
            isIdle: true,
            isStale: true,
          });
        } else {
          expect.fail("Returned calculator lost its retained page snapshot");
        }
        expect({
          QueueClearCalls: yield* Queue.clear(calls),
          QueueClearReads: yield* Queue.clear(reads),
          QueueClearExceptions: yield* Queue.clear(exceptions),
        }).toStrictEqual({
          QueueClearCalls: [],
          QueueClearReads: [],
          QueueClearExceptions: [],
        });
        yield* Effect.logInfo("native-webmcp: actual caller completed", {
          browser: browser.version(),
          tools: tools.length,
        });
      }).pipe(Effect.withSpan("NativeBrowserTools.verifyToolRestoration"));
    }).pipe(
      Effect.timeout("35 seconds"),
      Effect.scoped,
      Effect.provide(NodeServices.layer)
    ),
  { timeout: 40_000 }
);
