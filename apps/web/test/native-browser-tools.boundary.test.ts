import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { CalculatorCatalogResponse } from "@taxkit/api-rpc/schemas";
import {
  Array,
  Effect,
  FileSystem,
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

import { WebsiteBrowserToolFailure } from "../src/lib/browser-tools.schemas";
import { WebsiteBrowserToolkit } from "../src/lib/browser-tools.toolkit";
import { WebsiteCalculatorViewState } from "../src/lib/schemas";
import { nativeRateFixture } from "./native-rate.fixture";

const apiOrigin = "http://127.0.0.1:4231";
const websiteOrigin = "http://127.0.0.1:4230";
const BrowserReply = Schema.toCodecJson(
  Schema.Union([
    WebsiteCalculatorViewState,
    WebsiteBrowserToolFailure,
    CalculatorCatalogResponse,
  ])
);

it.live(
  "calls mounted calculator tools through Chrome's real native caller",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const apiRoot = path.join(root, ".alchemy/native-pair/bundles/TaxKitApi");
      const websiteRoot = path.join(root, "apps/web/dist/server");
      const apiFiles = yield* fs.glob("**/*.js", { root: apiRoot });
      const websiteFiles = yield* fs.glob("**/*.js", { root: websiteRoot });
      expect(apiFiles).toContain("worker.js");
      expect(websiteFiles).toContain("server.js");
      const apiModules = Record.fromEntries(
        yield* Effect.forEach(apiFiles, (file) =>
          fs
            .readFileString(path.join(apiRoot, file))
            .pipe(
              Effect.map(
                (contents) =>
                  [file, { contents, type: "esm" as const }] as const
              )
            )
        )
      );
      const websiteModules = Record.fromEntries(
        yield* Effect.forEach(websiteFiles, (file) =>
          fs
            .readFileString(path.join(websiteRoot, file))
            .pipe(
              Effect.map(
                (contents) =>
                  [file, { contents, type: "esm" as const }] as const
              )
            )
        )
      );
      const exceptions = yield* Queue.make<string>();
      const apiWorker = (name: string) => ({
        config: {
          compatibilityDate: "2026-10-04",
          compatibilityFlags: ["nodejs_compat"],
          env: {
            ...nativeRateFixture("10090"),
            API_PUBLIC_ORIGIN: { type: "json" as const, value: apiOrigin },
            WEBSITE_PUBLIC_ORIGIN: {
              type: "json" as const,
              value: websiteOrigin,
            },
            WORKER_URL: { type: "json" as const, value: apiOrigin },
          },
          manifest: {
            mainModule: "worker.js",
            modules: apiModules,
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
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                    },
                    manifest: {
                      mainModule: "server.js",
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
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/rpc")) {
          Queue.offerUnsafe(calls, request.url());
        }
      });
      yield* Effect.promise(() => caller.send("WebMCP.enable"));
      const discover = Effect.fnUntraced(function* () {
        return yield* Stream.fromQueue(added).pipe(
          Stream.map((event) => event.tools),
          Stream.tap((tools) =>
            Effect.logInfo("native-webmcp: discovered", {
              names: Array.map(tools, (tool) => tool.name),
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
      const waitForReply = Effect.fnUntraced(function* (invocationId: string) {
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
      const tools = yield* Effect.promise(() => page.goto(websiteOrigin)).pipe(
        Effect.andThen(discover())
      );
      expect(
        Array.sort(
          Array.map(tools, (tool) => tool.name),
          Order.String
        )
      ).toEqual(
        Array.sort(Record.keys(WebsiteBrowserToolkit.tools), Order.String)
      );
      expect(yield* Queue.clear(calls)).toEqual([]);
      const call = Effect.fnUntraced(function* (
        currentTools: readonly Added["tools"][number][],
        name: keyof typeof WebsiteBrowserToolkit.tools,
        input: Input = {}
      ) {
        const tool = yield* Array.findFirst(
          currentTools,
          (entry) => entry.name === name
        ).pipe(Effect.fromOption);
        const started = yield* Effect.promise(() =>
          caller.send("WebMCP.invokeTool", {
            frameId: tool.frameId,
            input,
            toolName: tool.name,
          })
        );
        const response = yield* waitForReply(started.invocationId);
        yield* Effect.logInfo("native-webmcp: tool replied", {
          name,
          status: response.status,
        });
        expect(
          response.status,
          `${name}: ${response.errorText ?? "no host detail"}`
        ).toBe("Completed");
        return yield* Schema.decodeUnknownEffect(BrowserReply)(response.output);
      });
      const catalogue = yield* call(tools, "taxkit_find_calculators");
      expect(Schema.is(CalculatorCatalogResponse)(catalogue)).toBe(true);
      const read = yield* call(tools, "taxkit_read_calculator");
      expect(Schema.is(WebsiteCalculatorViewState)(read)).toBe(true);
      const initial = yield* call(tools, "taxkit_calculate_visible_form");
      expect(Schema.is(WebsiteCalculatorViewState)(initial)).toBe(true);
      yield* Effect.promise(() =>
        page.getByText("$1,301.00", { exact: true }).waitFor()
      );
      const visible = yield* call(tools, "taxkit_read_result");
      expect(visible).toEqual(initial);
      const invalid = yield* call(tools, "taxkit_calculate_visible_form", {
        unexpected: "PRIVATE9",
      });
      expect(Schema.is(WebsiteBrowserToolFailure)(invalid)).toBe(true);
      if (Schema.is(WebsiteBrowserToolFailure)(invalid)) {
        expect(invalid.code).toBe("invalid-input");
      }
      expect(yield* Queue.clear(calls)).toHaveLength(1);
      yield* Effect.promise(() =>
        page.locator('nav a[href="/calculators/au.income-tax.annual"]').click()
      );
      yield* Effect.logInfo("native-webmcp: annual navigation complete");
      const annualTools = yield* discover();
      expect(yield* waitForRemoval()).toHaveLength(5);
      const filled = yield* call(annualTools, "taxkit_fill_calculator", {
        taxableDollars: "75000",
      });
      expect(Schema.is(WebsiteCalculatorViewState)(filled)).toBe(true);
      expect(
        yield* Effect.promise(() =>
          page.getByLabel("Annual taxable income").inputValue()
        )
      ).toBe("75000");
      expect(yield* Queue.clear(calls)).toEqual([]);
      const annual = yield* call(annualTools, "taxkit_calculate_visible_form");
      expect(Schema.is(WebsiteCalculatorViewState)(annual)).toBe(true);
      yield* Effect.promise(() =>
        page.getByText("$14,788.00", { exact: true }).first().waitFor()
      );
      expect(yield* call(annualTools, "taxkit_read_result")).toEqual(annual);
      const manualResponse = yield* Effect.sync(() =>
        page.waitForResponse(
          (response) =>
            response.url().startsWith(`${apiOrigin}/rpc`) && response.ok()
        )
      );
      yield* Effect.promise(() =>
        page.getByRole("button", { exact: true, name: "Calculate" }).click()
      );
      yield* Effect.promise(() => manualResponse);
      yield* Effect.promise(() =>
        expect
          .poll(() =>
            page
              .getByRole("button", { exact: true, name: "Calculate" })
              .isEnabled()
          )
          .toBe(true)
      );
      expect(yield* call(annualTools, "taxkit_read_result")).toEqual(annual);
      yield* call(annualTools, "taxkit_fill_calculator", {
        taxableDollars: "76000",
      });
      const edited = yield* call(annualTools, "taxkit_read_result");
      if (Schema.is(WebsiteCalculatorViewState)(edited)) {
        expect(edited.stale).toBe(true);
        expect(edited.report).toEqual(
          Schema.is(WebsiteCalculatorViewState)(annual)
            ? annual.report
            : Option.none()
        );
      }
      // Hold actual requests at the browser transport. Observe caller abort,
      // form edit and page exit separately; tools share the visible request.
      const held = yield* Queue.make<Route>();
      yield* Effect.promise(() =>
        page.route(`${apiOrigin}/rpc`, (route) => {
          Queue.offerUnsafe(held, route);
        })
      );
      const calculateTool = yield* Array.findFirst(
        annualTools,
        (tool) => tool.name === "taxkit_calculate_visible_form"
      ).pipe(Effect.fromOption);
      const invoke = Effect.promise(() =>
        caller.send("WebMCP.invokeTool", {
          frameId: calculateTool.frameId,
          input: {},
          toolName: calculateTool.name,
        })
      );
      const aborted = yield* invoke;
      const abortedRequest = yield* Queue.take(held);
      yield* Effect.promise(() =>
        expect
          .poll(() =>
            page
              .getByRole("button", { exact: true, name: "Calculating…" })
              .isEnabled()
          )
          .toBe(false)
      );
      const busy = yield* call(annualTools, "taxkit_calculate_visible_form");
      if (Schema.is(WebsiteBrowserToolFailure)(busy)) {
        expect(busy.code).toBe("calculation-busy");
      } else {
        expect.fail("Busy calculator admitted a second tool call");
      }
      yield* Effect.promise(() =>
        caller.send("WebMCP.cancelInvocation", {
          invocationId: aborted.invocationId,
        })
      );
      expect((yield* waitForReply(aborted.invocationId)).status).not.toBe(
        "Completed"
      );
      yield* Effect.promise(() =>
        expect
          .poll(() =>
            page
              .getByRole("button", { exact: true, name: "Calculate" })
              .isEnabled()
          )
          .toBe(true)
      );
      const afterAbort = yield* call(annualTools, "taxkit_read_calculator");
      if (Schema.is(WebsiteCalculatorViewState)(afterAbort)) {
        expect(afterAbort.busy).toBe(false);
        expect(afterAbort.stale).toBe(true);
      } else {
        expect.fail("Caller abort did not return the visible calculator state");
      }
      yield* Effect.promise(() => abortedRequest.abort());
      const replaced = yield* invoke;
      const replacedRequest = yield* Queue.take(held);
      yield* call(annualTools, "taxkit_fill_calculator", {
        taxableDollars: "77000",
      });
      expect((yield* waitForReply(replaced.invocationId)).status).not.toBe(
        "Completed"
      );
      yield* Effect.promise(() => replacedRequest.abort());
      const retryResponse = yield* Effect.sync(() =>
        page.waitForResponse(
          (response) =>
            response.url().startsWith(`${apiOrigin}/rpc`) && response.ok()
        )
      );
      yield* Effect.promise(() =>
        page.getByRole("button", { exact: true, name: "Calculate" }).click()
      );
      const retryRequest = yield* Queue.take(held);
      yield* Effect.promise(() => retryRequest.continue());
      yield* Effect.promise(() => retryResponse);
      yield* Effect.promise(() =>
        expect
          .poll(() =>
            page
              .getByRole("button", { exact: true, name: "Calculate" })
              .isEnabled()
          )
          .toBe(true)
      );
      const retry = yield* call(annualTools, "taxkit_read_result");
      if (Schema.is(WebsiteCalculatorViewState)(retry)) {
        expect(retry.busy).toBe(false);
        expect(retry.stale).toBe(false);
        expect(retry.form).toEqual({ taxableDollars: "77000" });
      } else {
        expect.fail("Manual retry after a cancelled tool did not complete");
      }
      const pending = yield* invoke;
      yield* Queue.take(held);
      // Tool removal alone does not cancel native execution in Chrome153.
      yield* Effect.promise(() =>
        page
          .getByRole("link", { exact: true, name: "For agents: API access" })
          .click()
      );
      expect(yield* waitForRemoval()).toHaveLength(5);
      const cancelled = yield* waitForReply(pending.invocationId);
      expect(cancelled.status).not.toBe("Completed");
      yield* Queue.clear(calls);
      // The registry retains a page snapshot, so its weak-family description
      // must survive too. Force actual browser GC between departure and return.
      yield* Effect.promise(() => page.waitForLoadState("networkidle"));
      yield* Effect.promise(() => caller.send("HeapProfiler.collectGarbage"));
      yield* Effect.promise(() =>
        page.locator('nav a[href="/calculators/au.income-tax.annual"]').click()
      );
      const returnedTools = yield* discover();
      yield* Effect.promise(() =>
        expect
          .poll(() => page.getByLabel("Annual taxable income").inputValue())
          .toBe("77000")
      );
      const returned = yield* call(returnedTools, "taxkit_read_result");
      if (Schema.is(WebsiteCalculatorViewState)(returned)) {
        expect(returned.form).toEqual({ taxableDollars: "77000" });
        expect(returned.report).toEqual(
          Schema.is(WebsiteCalculatorViewState)(retry)
            ? retry.report
            : Option.none()
        );
        expect(returned.busy).toBe(false);
        expect(returned.stale).toBe(true);
      } else {
        expect.fail("Returned calculator lost its retained page snapshot");
      }
      expect(yield* Queue.clear(calls)).toEqual([]);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
      yield* Effect.logInfo("native-webmcp: actual caller completed", {
        browser: browser.version(),
        tools: tools.length,
      });
    }).pipe(
      Effect.timeout("35 seconds"),
      Effect.scoped,
      Effect.provide(NodeServices.layer)
    ),
  { timeout: 40_000 }
);
