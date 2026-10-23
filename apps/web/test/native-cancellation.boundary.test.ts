import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import { CalculatorRunRequest } from "@taxkit/calculators/schemas";
import { CalculationRequest } from "@taxkit/calculators/testing/fixtures";
import {
  Array,
  Clock,
  Effect,
  Fiber,
  FileSystem,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";

import { boundedResponses } from "../src/lib/api/bounded-response";
import { WebsiteApiDeadlineExceeded } from "../src/lib/api/errors";
import { calculate } from "../src/lib/api/requests";
import { nativeForwardingFixture } from "./native-forwarding.fixture";
import {
  nativeLocalModeFixture,
  nativeRateFixture,
} from "./native-rate.fixture";

const apiOrigin = "http://127.0.0.1:4201";
const websiteOrigin = "http://127.0.0.1:4202";
const headersOrigin = "http://127.0.0.1:4203";
const Json = Schema.fromJsonString(Schema.Unknown);
// The browser's only calculation request: the public HTTP calculate route.
const calculation = `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`;
const isCalculation = (
  request: Readonly<{ method: () => string; url: () => string }>
) => request.method() === "POST" && request.url() === calculation;

it.live(
  "keeps native headers/body deadlines and cancels browser reads on editing and departure",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const logs = yield* Queue.make<WorkerdStructuredLog>();
      const exceptions = yield* Queue.make<string>();
      const workers = yield* Effect.forEach(
        [
          {
            entry: "worker.js",
            name: "api-body",
            output: ".alchemy/native-pair/bundles/TaxKitApiStalledBody",
          },
          {
            entry: "worker.js",
            name: "api-headers",
            output: ".alchemy/native-pair/bundles/TaxKitApiStalledHeaders",
          },
          {
            entry: "worker.js",
            name: "api-normal",
            output: ".alchemy/native-pair/bundles/TaxKitApi",
          },
          {
            entry: "server.js",
            name: "website",
            output: "apps/web/dist/server",
          },
        ] as const,
        (artifact) =>
          Effect.gen(function* () {
            const modulesRoot = path.join(root, artifact.output);
            const files = yield* fs.glob("**/*.js", { root: modulesRoot });
            expect(files).toContain(artifact.entry);
            const modules = Record.fromEntries(
              yield* Effect.forEach(files, (file) =>
                fs
                  .readFileString(path.join(modulesRoot, file))
                  .pipe(
                    Effect.map(
                      (contents) =>
                        [file, { contents, type: "esm" as const }] as const
                    )
                  )
              )
            );
            if (
              artifact.name === "api-body" ||
              artifact.name === "api-headers"
            ) {
              expect(
                Array.some(
                  Record.toEntries(modules),
                  ([file, module]) =>
                    file === "worker.js" && module.contents.includes("PRIVATE9")
                )
              ).toBe(true);
            }
            const origins = {
              ...nativeForwardingFixture,
              ...(artifact.entry === "worker.js"
                ? {
                    ...nativeRateFixture("10078"),
                  }
                : nativeLocalModeFixture),
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
            };
            return {
              config: {
                assets:
                  artifact.entry === "server.js"
                    ? {
                        directory: path.join(root, "apps/web/dist/client"),
                        hasUserWorker: true,
                        runWorkerFirst: false,
                      }
                    : undefined,
                compatibilityDate: "2026-10-04",
                compatibilityFlags: ["nodejs_compat"],
                env:
                  artifact.entry === "server.js"
                    ? {
                        ...origins,
                        TAXKIT_API: {
                          type: "worker" as const,
                          worker: "api-body",
                        },
                      }
                    : origins,

                manifest: { mainModule: artifact.entry, modules, modulesRoot },
                name: artifact.name,
              },
            };
          })
      );
      const host = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleStructuredLogs: (log) => {
                Queue.offerUnsafe(logs, log);
              },
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4201,
              workers,
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => host.ready).pipe(
        Effect.timeout("10 seconds")
      );
      const body = yield* Schema.encodeEffect(
        Schema.fromJsonString(CalculatorRunRequest)
      )(CalculationRequest.payload);
      const ordinary = yield* Effect.promise(() =>
        host.getWorker("api-normal")
      );
      const control = yield* Effect.promise(() =>
        ordinary.fetch(calculation, {
          body,
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      );
      expect(yield* Effect.promise(() => control.text())).toContain("130100");

      const headerWorker = Array.map(
        Array.filter(workers, (worker) => worker.config.name === "api-headers"),
        (worker) => ({
          config: {
            ...worker.config,
            env: {
              ...nativeForwardingFixture,
              ...nativeLocalModeFixture,
              ...worker.config.env,
              API_PUBLIC_ORIGIN: {
                type: "json" as const,
                value: headersOrigin,
              },
              WORKER_URL: { type: "json" as const, value: headersOrigin },
            },
          },
        })
      );
      const headerHost = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleStructuredLogs: (log) => {
                Queue.offerUnsafe(logs, log);
              },
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4203,
              workers: headerWorker,
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => headerHost.ready).pipe(
        Effect.timeout("10 seconds")
      );
      yield* Effect.forEach([apiOrigin, headersOrigin], (address) =>
        Effect.gen(function* () {
          const started = yield* Clock.currentTimeMillis;
          // The Website's own generated client and deadline, as the server and
          // browser use them.
          const error = yield* HttpClient.HttpClient.pipe(
            Effect.flatMap((http) =>
              HttpApiClient.makeWith(TaxKitApi, {
                baseUrl: address,
                httpClient: boundedResponses(http),
              })
            ),
            Effect.flatMap((client) => calculate(client, CalculationRequest)),
            Effect.flip,
            Effect.provide(FetchHttpClient.layer)
          );
          const elapsed = (yield* Clock.currentTimeMillis) - started;
          // The native client exposes a closed safe error union. Report only
          // its tag and the fixed fixture phase; never inspect raw causes or
          // request/response bytes to diagnose a transport regression.
          expect(
            Schema.is(WebsiteApiDeadlineExceeded)(error),
            `Native ${address === apiOrigin ? "body" : "headers"} fixture returned ${error._tag} after ${elapsed}ms`
          ).toBe(true);
          expect(elapsed).toBeGreaterThanOrEqual(9500);
          expect(elapsed).toBeLessThan(12_000);
        })
      );

      const websiteHost = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
              handleStructuredLogs: (log) => {
                Queue.offerUnsafe(logs, log);
              },
              handleUncaughtError: (error) => {
                Queue.offerUnsafe(exceptions, error.message);
              },
              host: "127.0.0.1",
              port: 4202,
              workers: [
                ...Array.filter(
                  workers,
                  (worker) => worker.config.name === "website"
                ),
                ...Array.filter(
                  workers,
                  (worker) => worker.config.name !== "website"
                ),
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => websiteHost.ready).pipe(
        Effect.timeout("10 seconds")
      );
      yield* Effect.logInfo("native-cancellation: browser deadline");
      const browser = yield* Effect.acquireRelease(
        Effect.promise(() => chromium.launch({ headless: true })),
        (value) => Effect.promise(() => value.close())
      );
      const context = yield* Effect.acquireRelease(
        Effect.promise(() => browser.newContext()),
        (value) => Effect.promise(() => value.close())
      );
      const page = yield* Effect.promise(() => context.newPage());
      const calls = yield* Queue.make<string>();
      const failed = yield* Queue.make<string>();
      page.on("pageerror", (error) => {
        Queue.offerUnsafe(exceptions, error.message);
      });
      page.on("request", (request) => {
        // Record calculator routes.
        const { pathname } = new URL(request.url());
        if (pathname.startsWith("/api/v1/calculators/")) {
          Queue.offerUnsafe(calls, `${request.method()} ${request.url()}`);
        }
      });
      page.on("requestfailed", (request) => {
        if (isCalculation(request)) {
          Queue.offerUnsafe(
            failed,
            request.failure()?.errorText ??
              "Missing browser cancellation reason"
          );
        }
      });
      yield* Effect.promise(() => page.goto(websiteOrigin));
      // Prepare a same-document browser Back destination. The actual Back
      // event drives TanStack route departure and React cleanup; a hard page
      // replacement can drop the old document's request-failed observation.
      yield* Effect.promise(() =>
        page.evaluate(() => {
          window.history.replaceState(null, "", "/no-calculator");
          window.history.pushState(null, "", "/");
        })
      );
      const payInput = page.getByLabel("Pay before tax ($)");
      yield* Effect.promise(() => payInput.fill("1654"));
      expect(yield* Queue.clear(calls)).toEqual([]);
      const deadlineStarted = yield* Clock.currentTimeMillis;
      yield* Effect.promise(() =>
        page.getByRole("button", { exact: true, name: "Calculate" }).click()
      );
      yield* Effect.promise(() =>
        page
          .getByRole("button", { exact: true, name: "Calculating…" })
          .waitFor({ timeout: 5000 })
      );
      yield* Effect.promise(() =>
        page.getByRole("alert").waitFor({ timeout: 12_000 })
      );
      const deadlineElapsed =
        (yield* Clock.currentTimeMillis) - deadlineStarted;
      expect(deadlineElapsed).toBeGreaterThanOrEqual(9500);
      expect(deadlineElapsed).toBeLessThan(12_000);
      expect(
        yield* Effect.promise(() => page.getByRole("alert").textContent())
      ).toBe(new WebsiteApiDeadlineExceeded().message);
      expect(yield* Queue.clear(calls)).toEqual([`POST ${calculation}`]);
      expect(yield* Queue.take(failed)).toContain("ERR_ABORTED");
      yield* Effect.promise(() => payInput.fill("1700"));
      yield* Effect.promise(() =>
        page.getByRole("alert").waitFor({ state: "hidden", timeout: 5000 })
      );

      yield* Effect.logInfo("native-cancellation: editing");
      const editResponse = yield* Effect.promise(() =>
        page.waitForResponse((response) => isCalculation(response.request()), {
          timeout: 5000,
        })
      ).pipe(Effect.forkScoped);
      yield* Effect.promise(() =>
        page.getByRole("button", { exact: true, name: "Calculate" }).click()
      );
      expect((yield* Fiber.join(editResponse)).status()).toBe(200);
      yield* Effect.promise(() => payInput.fill("1800"));
      expect(
        yield* Queue.take(failed).pipe(Effect.timeout("3 seconds"))
      ).toContain("ERR_ABORTED");
      expect(yield* Queue.clear(calls)).toEqual([`POST ${calculation}`]);
      expect(yield* Effect.promise(() => page.getByRole("alert").count())).toBe(
        0
      );
      expect(
        yield* Effect.promise(() =>
          page.getByText("$1,301.00", { exact: true }).count()
        )
      ).toBe(0);

      yield* Effect.logInfo("native-cancellation: departure");
      const departureResponse = yield* Effect.promise(() =>
        page.waitForResponse((response) => isCalculation(response.request()), {
          timeout: 5000,
        })
      ).pipe(Effect.forkScoped);
      yield* Effect.promise(() =>
        page.getByRole("button", { exact: true, name: "Calculate" }).click()
      );
      expect((yield* Fiber.join(departureResponse)).status()).toBe(200);
      yield* Effect.promise(() => page.goBack());
      yield* Effect.promise(() =>
        page
          .getByRole("heading", { name: "Australian take-home pay" })
          .waitFor({ state: "hidden", timeout: 5000 })
      );
      expect(
        yield* Queue.take(failed).pipe(Effect.timeout("3 seconds"))
      ).toContain("ERR_ABORTED");
      expect(yield* Queue.clear(calls)).toEqual([`POST ${calculation}`]);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
      const capturedLogs = yield* Queue.clear(logs);
      const logText = yield* Schema.encodeEffect(Json)(capturedLogs);
      const messageText = yield* Schema.encodeEffect(Json)(
        Array.map(capturedLogs, (log) => log.message)
      );
      expect(logText).toContain("api.runtime.event");
      expect(logText).not.toContain("PRIVATE9");
      expect(messageText).not.toContain("1654");
      expect(messageText).not.toContain("130100");
      // Browser abort and caller cleanup are observed. The local Worker runtime
      // does not establish upstream cancellation of its artificial twelve-second
      // stream; never report this as provider or remote-operation cancellation.
    }).pipe(
      // Three ten-second deadline checks run sequentially, alongside Worker
      // and browser startup. Keep each operation's own bound above; allow
      // enough time for the whole fixture and its departure assertions.
      Effect.timeout("65 seconds"),
      Effect.scoped,
      Effect.provide(NodeServices.layer)
    ),
  70_000
);
