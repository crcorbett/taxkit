import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { CalculatorOperationTimedOut } from "@taxkit/api-rpc/errors";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import {
  CalculatorRpcOrigin,
  CalculatorRpcPayload,
  CalculatorRpcVersion,
  GetCalculatorRequest,
} from "@taxkit/api-rpc/schemas";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import {
  Array,
  Cause,
  Clock,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Layer,
  Match,
  Option,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { FetchHttpClient } from "effect/http";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";

import {
  nativeLocalModeFixture,
  nativeRateFixture,
} from "./native-rate.fixture";

const apiOrigin = "http://127.0.0.1:4199";
const websiteOrigin = "http://127.0.0.1:4200";
const Json = Schema.fromJsonString(Schema.Unknown);
// Unknown wire fields belong to this adversarial fixture only.
const NativeRequestFixture = Schema.TaggedStruct("Request", {
  headers: Schema.Unknown,
  id: Schema.Unknown,
  payload: Schema.Unknown,
  tag: Schema.Unknown,
});

it.live(
  "contains native global, procedure and fatal RPC replies in real Workers",
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
            name: "api",
            output: ".alchemy/native-pair/bundles/TaxKitApi",
          },
          {
            entry: "worker.js",
            name: "api-defect",
            output: ".alchemy/native-pair/bundles/TaxKitApiRpcDefect",
          },
          {
            entry: "worker.js",
            name: "api-invalid-reply",
            output: ".alchemy/native-pair/bundles/TaxKitApiInvalidReply",
          },
          {
            binding: "api-defect",
            entry: "server.js",
            name: "website",
            output: "apps/web/dist/server",
          },
          {
            binding: "api-invalid-reply",
            entry: "server.js",
            name: "website-invalid-reply",
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
              artifact.name === "api-defect" ||
              artifact.name === "api-invalid-reply"
            ) {
              // The builder removes this owned output before source compilation.
              // Require its marker in the real entry, then require a reached fatal
              // reply and positive safe report; stale chunks cannot satisfy this.
              expect(
                Array.some(
                  Record.toEntries(modules),
                  ([file, module]) =>
                    file === "worker.js" && module.contents.includes("PRIVATE9")
                )
              ).toBe(true);
            }
            const origins = {
              ...(artifact.entry === "worker.js"
                ? nativeRateFixture("10076")
                : nativeLocalModeFixture),
              API_PUBLIC_ORIGIN: { type: "json" as const, value: apiOrigin },
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
                          worker: artifact.binding,
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
              port: 4199,
              workers,
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => host.ready).pipe(
        Effect.timeout("10 seconds")
      );
      const origin =
        yield* Schema.decodeUnknownEffect(CalculatorRpcOrigin)(apiOrigin);
      const result = yield* TaxKitRpcClient.pipe(
        Effect.flatMap((client) => client.calculate(CalculationRequest)),
        Effect.provide(
          TaxKitRpcClientLive(origin).pipe(Layer.provide(FetchHttpClient.layer))
        )
      );
      Match.value(result.report).pipe(
        Match.tag("TakeHomePayReport", (report) =>
          expect(report.netPay.cents).toBe(130_100)
        ),
        Match.orElse(() => expect.fail("Expected retained take-home report"))
      );
      const payload = yield* Schema.encodeEffect(CalculatorRpcPayload)({
        request: CalculationRequest,
        version: CalculatorRpcVersion,
      });
      const request = NativeRequestFixture.make({
        headers: [],
        id: "1",
        payload,
        tag: "Calculate",
      });
      const sentinel = "PRIVATE9";
      const encodedCases = yield* Effect.forEach(
        [
          { name: "unknown procedure", value: { ...request, tag: sentinel } },
          { name: "invalid identity", value: { ...request, id: sentinel } },
          {
            name: "unknown envelope",
            value: Record.set(request, "_tag", sentinel),
          },
          {
            name: "extra property",
            value: { ...request, [sentinel]: sentinel },
          },
          { name: "empty batch", value: [] },
          { name: "large batch", value: Array.replicate(request, 17) },
          {
            name: "procedure decoder",
            value: { ...request, payload: sentinel },
          },
        ],
        (fixture) =>
          Schema.encodeEffect(Json)(fixture.value).pipe(
            Effect.map((body) => ({ body, name: fixture.name }))
          )
      );
      yield* Effect.forEach(
        [{ body: sentinel, name: "broken JSON" }, ...encodedCases],
        (fixture) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              host.dispatchFetch(`${apiOrigin}/rpc`, {
                body: fixture.body,
                headers: { "content-type": "application/json" },
                method: "POST",
              })
            );
            const text = yield* Effect.promise(() => response.text());
            expect(response.status, fixture.name).toBe(200);
            expect(text, fixture.name).toContain("Calculation service failed");
            expect(text, fixture.name).not.toContain(sentinel);
            expect(text, fixture.name).not.toContain("stack");
          })
      );
      const mismatchBody = yield* Schema.encodeEffect(Json)({
        ...request,
        payload: { ...payload, version: sentinel },
      });
      const mismatch = yield* Effect.promise(() =>
        host.dispatchFetch(`${apiOrigin}/rpc`, {
          body: mismatchBody,
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      );
      const mismatchText = yield* Effect.promise(() => mismatch.text());
      expect(mismatchText).toContain("CalculatorRpcVersionMismatch");
      expect(mismatchText).not.toContain(sentinel);
      const ordinaryBody = yield* Schema.encodeEffect(Json)(request);
      const ordinary = yield* Effect.promise(() =>
        host.dispatchFetch(`${apiOrigin}/rpc`, {
          body: ordinaryBody,
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      );
      const ordinaryText = yield* Effect.promise(() => ordinary.text());
      expect(ordinary.status).toBe(200);
      expect(ordinaryText).toContain("TakeHomePayReport");
      expect(ordinaryText).toContain("130100");
      expect(ordinaryText).not.toContain("Calculation service failed");
      const annualId = yield* Schema.decodeEffect(
        CalculatorRpcPayload.fields.request.fields.calculatorId
      )("au.income-tax.annual");
      // Pay facts pass the shared union, then fail the selected annual
      // calculator's own input Schema. This reaches expected service failure.
      const expectedPayload = yield* Schema.encodeEffect(CalculatorRpcPayload)({
        request: { ...CalculationRequest, calculatorId: annualId },
        version: CalculatorRpcVersion,
      });
      const expectedBody = yield* Schema.encodeEffect(Json)({
        ...request,
        payload: expectedPayload,
      });
      const expected = yield* Effect.promise(() =>
        host.dispatchFetch(`${apiOrigin}/rpc`, {
          body: expectedBody,
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      );
      const expectedText = yield* Effect.promise(() => expected.text());
      expect(expectedText).toContain("CalculatorRpcRejected");
      expect(expectedText).toContain('"reason":"input"');
      expect(expectedText).not.toContain(sentinel);
      expect(expectedText).not.toContain("165400");
      const fault = yield* Effect.promise(() => host.getWorker("api-defect"));
      const fatal = yield* Effect.promise(() =>
        fault.fetch(`${apiOrigin}/rpc`, {
          body: ordinaryBody,
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      );
      const fatalText = yield* Effect.promise(() => fatal.text());
      expect(fatalText).toContain('"_tag":"Defect"');
      expect(fatalText).toContain("Calculation service failed");
      expect(fatalText).not.toContain(sentinel);
      const website = yield* Effect.promise(() => host.getWorker("website"));
      const server = yield* Effect.promise(() =>
        website.fetch(`${websiteOrigin}/`, {
          body: "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          method: "POST",
        })
      );
      const html = yield* Effect.promise(() => server.text());
      expect(server.status).toBe(500);
      expect(html).toBe("");
      expect(html).not.toContain(sentinel);
      expect(html).not.toContain("$1,301.00");
      const invalidApi = yield* Effect.promise(() =>
        host.getWorker("api-invalid-reply")
      );
      const invalid = yield* Effect.promise(() =>
        invalidApi.fetch(`${apiOrigin}/rpc`, {
          body: ordinaryBody,
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      );
      const invalidText = yield* Effect.promise(() => invalid.text());
      // Alter only the result field after native encoding. The native frame
      // remains valid JSON, but its required report field is missing.
      yield* Schema.decodeEffect(Json)(invalidText);
      expect(invalidText).toContain("TakeHomePayReport");
      expect(invalidText).toContain(sentinel);
      const invalidWebsite = yield* Effect.promise(() =>
        host.getWorker("website-invalid-reply")
      );
      const invalidPage = yield* Effect.promise(() =>
        invalidWebsite.fetch(`${websiteOrigin}/`, {
          body: "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          method: "POST",
        })
      );
      const invalidHtml = yield* Effect.promise(() => invalidPage.text());
      expect(invalidPage.status).toBe(200);
      expect(invalidHtml).toContain("CalculatorRpcInvalidResponse");
      expect(invalidHtml).toContain("Check your details");
      expect(invalidHtml).not.toContain(sentinel);
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
              port: 4200,
              workers: [
                ...Array.filter(
                  workers,
                  (worker) => worker.config.name === "website-invalid-reply"
                ),
                ...Array.filter(
                  workers,
                  (worker) => worker.config.name !== "website-invalid-reply"
                ),
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => websiteHost.ready).pipe(
        Effect.timeout("10 seconds")
      );
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
      page.on("pageerror", (error) => {
        Queue.offerUnsafe(exceptions, error.message);
      });
      page.on("request", (browserRequest) => {
        if (new URL(browserRequest.url()).pathname === "/rpc") {
          Queue.offerUnsafe(calls, browserRequest.url());
        }
      });
      yield* Effect.promise(() =>
        page.route(`${websiteOrigin}/`, (route) =>
          route.fulfill({
            body: invalidHtml,
            contentType: "text/html",
            status: 200,
          })
        )
      );
      yield* Effect.promise(() => page.goto(websiteOrigin));
      yield* Effect.promise(() => page.waitForLoadState("networkidle"));
      yield* Effect.promise(() =>
        page.getByRole("alert").waitFor({ timeout: 5000 })
      );
      expect(
        yield* Effect.promise(() =>
          page.getByRole("alert").textContent({ timeout: 5000 })
        )
      ).toContain("Check your details");
      expect(
        yield* Effect.promise(() =>
          page.getByText("$1,301.00", { exact: true }).count()
        )
      ).toBe(0);
      const invalidPayInput = page.getByLabel("Pay before tax ($)");
      yield* Effect.promise(() => invalidPayInput.fill("2000"));
      yield* Effect.promise(() =>
        page.getByRole("alert").waitFor({ state: "hidden", timeout: 5000 })
      );
      expect(yield* Queue.clear(calls)).toEqual([]);
      const capturedLogs = yield* Queue.clear(logs);
      const logText = yield* Schema.encodeEffect(Json)(capturedLogs);
      const messageText = yield* Schema.encodeEffect(Json)(
        Array.map(capturedLogs, (log) => log.message)
      );
      expect(logText).toContain("api.runtime.event");
      expect(logText).toContain("website.runtime.event");
      expect(logText).not.toContain(sentinel);
      expect(messageText).not.toContain("1654");
      expect(messageText).not.toContain("130100");
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(
      Effect.timeout("20 seconds"),
      Effect.scoped,
      Effect.provide(NodeServices.layer)
    )
);

it.live("shares native HTTP, RPC batch and browser work limits", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.resolve("../..");
    const workApiOrigin = "http://127.0.0.1:4204";
    const workWebsiteOrigin = "http://127.0.0.1:4205";
    const logs = yield* Queue.make<WorkerdStructuredLog>();
    const workers = yield* Effect.forEach(
      [
        {
          entry: "worker.js",
          name: "api-work",
          output: ".alchemy/native-pair/bundles/TaxKitApiStalledWork",
        },
        {
          entry: "server.js",
          name: "website-work",
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
          if (artifact.name === "api-work") {
            expect(
              Array.some(
                Record.toEntries(modules),
                ([file, module]) =>
                  file === "worker.js" &&
                  module.contents.includes("PRIVATE9 work started")
              )
            ).toBe(true);
          }
          const origins = {
            ...(artifact.name === "website-work"
              ? nativeLocalModeFixture
              : nativeRateFixture("10077")),
            API_PUBLIC_ORIGIN: { type: "json" as const, value: workApiOrigin },
            WEBSITE_PUBLIC_ORIGIN: {
              type: "json" as const,
              value: workWebsiteOrigin,
            },
            WORKER_URL: { type: "json" as const, value: workApiOrigin },
          };
          return {
            config: {
              assets:
                artifact.name === "website-work"
                  ? {
                      directory: path.join(root, "apps/web/dist/client"),
                      hasUserWorker: true,
                      runWorkerFirst: false,
                    }
                  : undefined,
              compatibilityDate: "2026-10-04",
              compatibilityFlags: ["nodejs_compat"],
              env:
                artifact.name === "website-work"
                  ? {
                      ...origins,
                      TAXKIT_API: {
                        type: "worker" as const,
                        worker: "api-work",
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
            host: "127.0.0.1",
            port: 4204,
            workers,
          })
      ),
      (value) => Effect.promise(() => value.dispose())
    );
    const websiteHost = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Miniflare({
            cf: false,
            host: "127.0.0.1",
            port: 4205,
            workers: [
              ...Array.filter(
                workers,
                (worker) => worker.config.name === "website-work"
              ),
              ...Array.filter(
                workers,
                (worker) => worker.config.name !== "website-work"
              ),
            ],
          })
      ),
      (value) => Effect.promise(() => value.dispose())
    );
    yield* Effect.promise(() => host.ready);
    yield* Effect.promise(() => websiteHost.ready);
    const browser = yield* Effect.acquireRelease(
      Effect.promise(() => chromium.launch({ headless: true })),
      (value) => Effect.promise(() => value.close())
    );
    const context = yield* Effect.acquireRelease(
      Effect.promise(() => browser.newContext()),
      (value) => Effect.promise(() => value.close())
    );
    const page = yield* Effect.promise(() => context.newPage());
    const invalidPayInput = page.getByLabel("Pay before tax ($)");
    const requests = yield* Queue.make<string>();
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/rpc") {
        Queue.offerUnsafe(requests, request.url());
      }
    });
    yield* Effect.promise(() => page.goto(workWebsiteOrigin));
    yield* Effect.promise(() => invalidPayInput.fill("1654"));
    const payload = yield* Schema.encodeEffect(CalculatorRpcPayload)({
      request: CalculationRequest,
      version: CalculatorRpcVersion,
    });
    const wire = yield* Schema.encodeEffect(Json)(
      Array.map(Array.range(1, 7), (id) =>
        NativeRequestFixture.make({
          headers: [],
          id: String(id),
          payload,
          tag: "Calculate",
        })
      )
    );
    const api = yield* Effect.promise(() => host.getWorker("api-work"));
    const httpBody = yield* Schema.encodeEffect(
      Schema.fromJsonString(CalculatorRpcPayload.fields.request.fields.payload)
    )(CalculationRequest.payload);
    const started = yield* Clock.monotonicTimeNanos;
    const batch = yield* Effect.promise(() =>
      api.fetch(`${workApiOrigin}/rpc`, {
        body: wire,
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    ).pipe(Effect.forkScoped);
    const http = yield* Effect.promise(() =>
      api.fetch(
        `${workApiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
        {
          body: httpBody,
          headers: {
            "content-type": "application/json",
            origin: workWebsiteOrigin,
          },
          method: "POST",
        }
      )
    ).pipe(Effect.forkScoped);
    // Each admitted operation emits one deliberately hostile warning, sanitised
    // by the real host logger. Wait for eight reached operations, not a delay.
    yield* Effect.forEach(Array.range(1, 8), () =>
      Queue.take(logs).pipe(
        Effect.flatMap((log) => Schema.encodeEffect(Json)(log.message)),
        Effect.tap((text) =>
          Effect.sync(() => {
            expect(text).toContain("Warn");
            expect(text).not.toContain("PRIVATE9");
          })
        )
      )
    ).pipe(
      Effect.raceFirst(
        Fiber.join(http).pipe(
          Effect.flatMap((response) =>
            Effect.die(`HTTP work ended early: ${response.status}`)
          )
        )
      ),
      Effect.raceFirst(
        Fiber.join(batch).pipe(
          Effect.flatMap((response) =>
            Effect.die(`RPC work ended early: ${response.status}`)
          )
        )
      )
    );
    const busy = yield* Effect.promise(() =>
      api.fetch(
        `${workApiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
        {
          body: httpBody,
          headers: {
            "content-type": "application/json",
            origin: workWebsiteOrigin,
          },
          method: "POST",
        }
      )
    );
    expect(busy.status).toBe(503);
    expect(busy.headers.get("access-control-allow-origin")).toBe(
      workWebsiteOrigin
    );
    expect(yield* Effect.promise(() => busy.text())).toContain(
      "CalculatorCapacityExceeded"
    );
    const website = yield* Effect.promise(() => host.getWorker("website-work"));
    const savedBusy = yield* Effect.promise(() =>
      website.fetch(workWebsiteOrigin, {
        body: "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      })
    );
    const savedBusyHtml = yield* Effect.promise(() => savedBusy.text());
    expect(savedBusyHtml).toContain("CalculatorCapacityExceeded");
    expect(savedBusyHtml).toContain("The calculators are busy.");
    expect(savedBusyHtml).not.toContain("PRIVATE9");
    yield* Effect.promise(() =>
      page.getByRole("button", { exact: true, name: "Calculate" }).click()
    );
    yield* Effect.promise(() =>
      page.getByRole("alert").waitFor({ timeout: 3000 })
    );
    expect(
      yield* Effect.promise(() => page.getByRole("alert").textContent())
    ).toContain("The calculators are busy.");
    expect(yield* Queue.clear(requests)).toHaveLength(1);
    yield* Effect.promise(() => invalidPayInput.fill("2000"));
    yield* Effect.promise(() =>
      page.getByRole("alert").waitFor({ state: "hidden", timeout: 3000 })
    );
    expect(yield* Queue.clear(requests)).toEqual([]);
    const timed = yield* Fiber.join(batch);
    expect(timed.status).toBe(200);
    const timedText = yield* Effect.promise(() => timed.text());
    const elapsed =
      Number((yield* Clock.monotonicTimeNanos) - started) / 1_000_000;
    expect(elapsed).toBeGreaterThanOrEqual(4500);
    expect(elapsed).toBeLessThan(8000);
    expect(timedText.match(/CalculatorOperationTimedOut/gu)).toHaveLength(7);
    const timedHttp = yield* Fiber.join(http);
    expect(timedHttp.status).toBe(504);
    expect(timedHttp.headers.get("access-control-allow-origin")).toBe(
      workWebsiteOrigin
    );
    expect(yield* Effect.promise(() => timedHttp.text())).toContain(
      "CalculatorOperationTimedOut"
    );
    expect(timedText).not.toContain("PRIVATE9");
    expect(timedText).not.toContain("165400");
    const origin =
      yield* Schema.decodeUnknownEffect(CalculatorRpcOrigin)(workApiOrigin);
    const clientExit = yield* TaxKitRpcClient.pipe(
      Effect.flatMap((client) => client.calculate(CalculationRequest)),
      Effect.exit,
      Effect.provide(
        TaxKitRpcClientLive(origin).pipe(Layer.provide(FetchHttpClient.layer))
      )
    );
    expect(Exit.isFailure(clientExit)).toBe(true);
    if (Exit.isFailure(clientExit)) {
      expect(Cause.findErrorOption(clientExit.cause)).toEqual(
        Option.some(new CalculatorOperationTimedOut())
      );
    }
    const capturedLogs = yield* Queue.clear(logs);
    const messages = yield* Effect.forEach(capturedLogs, (log) =>
      Schema.encodeEffect(Json)(log.message)
    );
    expect(
      Array.filter(messages, (message) => message.includes("Info"))
    ).toHaveLength(9);
    const captured = yield* Schema.encodeEffect(Json)(capturedLogs);
    expect(captured).not.toContain("PRIVATE9");
    expect(captured).not.toContain("165400");
    const metadataStarted = yield* Clock.monotonicTimeNanos;
    const metadataHttp = yield* Effect.promise(() =>
      api.fetch(`${workApiOrigin}/api/v1/calculators/au.pay.take-home/schema`, {
        headers: { origin: workWebsiteOrigin },
      })
    ).pipe(Effect.forkScoped);
    const metadataRpc = yield* TaxKitRpcClient.pipe(
      Effect.flatMap((client) =>
        client.getCalculatorSchema(
          GetCalculatorRequest.make({
            calculatorId: CalculationRequest.calculatorId,
          })
        )
      ),
      Effect.exit,
      Effect.provide(
        TaxKitRpcClientLive(origin).pipe(Layer.provide(FetchHttpClient.layer))
      ),
      Effect.forkScoped
    );
    yield* Effect.forEach(Array.range(1, 2), () =>
      Queue.take(logs).pipe(
        Effect.flatMap((log) => Schema.encodeEffect(Json)(log.message)),
        Effect.tap((message) =>
          Effect.sync(() => {
            expect(message).toContain("Warn");
            expect(message).not.toContain("PRIVATE9");
          })
        )
      )
    );
    const metadataResponse = yield* Fiber.join(metadataHttp);
    expect(metadataResponse.status).toBe(504);
    expect(metadataResponse.headers.get("access-control-allow-origin")).toBe(
      workWebsiteOrigin
    );
    const metadataText = yield* Effect.promise(() => metadataResponse.text());
    expect(metadataText).toContain("CalculatorOperationTimedOut");
    expect(metadataText).not.toContain("PRIVATE9");
    const metadataExit = yield* Fiber.join(metadataRpc);
    expect(Exit.isFailure(metadataExit)).toBe(true);
    if (Exit.isFailure(metadataExit)) {
      expect(Cause.findErrorOption(metadataExit.cause)).toEqual(
        Option.some(new CalculatorOperationTimedOut())
      );
    }
    const metadataElapsed =
      Number((yield* Clock.monotonicTimeNanos) - metadataStarted) / 1_000_000;
    expect(metadataElapsed).toBeGreaterThanOrEqual(4500);
    expect(metadataElapsed).toBeLessThan(8000);
    const metadataLogs = yield* Queue.clear(logs);
    const metadataMessages = yield* Effect.forEach(metadataLogs, (log) =>
      Schema.encodeEffect(Json)(log.message)
    );
    expect(
      Array.filter(metadataMessages, (message) => message.includes("Info"))
    ).toHaveLength(2);
    expect(
      Array.every(
        metadataMessages,
        (message) =>
          !message.includes("PRIVATE9") && !message.includes("165400")
      )
    ).toBe(true);
  }).pipe(
    Effect.timeout("25 seconds"),
    Effect.scoped,
    Effect.provide(NodeServices.layer)
  )
);
