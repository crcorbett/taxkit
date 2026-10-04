import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Option,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";

const apiOrigin = "http://127.0.0.1:4197";
const websiteOrigin = "http://127.0.0.1:4196";
const form = "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on";
const Json = Schema.fromJsonString(Schema.Unknown);

describe("built native API and Website", () => {
  it.live(
    "uses the real API through the binding and browser, including an idle form and no JavaScript",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = path.resolve("../..");
        const apiRoot = path.join(
          root,
          ".alchemy/native-pair/bundles/TaxKitApi"
        );
        const websiteRoot = path.join(root, "apps/web/dist/server");
        const apiFiles = yield* fs.glob("**/*.js", { root: apiRoot });
        const websiteFiles = yield* fs.glob("**/*.js", { root: websiteRoot });
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
        expect(apiFiles).toContain("worker.js");
        expect(websiteFiles).toContain("server.js");
        const clientFiles = yield* fs.glob("**/*.js", {
          root: path.join(root, "apps/web/dist/client"),
        });
        const clientCode = (yield* Effect.forEach(clientFiles, (file) =>
          fs.readFileString(path.join(root, "apps/web/dist/client", file))
        )).join("\n");
        const apiCode = Array.map(
          Record.values(apiModules),
          (module) => module.contents
        ).join("\n");
        expect(apiCode).toContain("taxkit/core/CalculationEngine");
        yield* Effect.forEach(
          [
            "node:fs",
            "cloudflare:workers",
            "taxkit/core/CalculationEngine",
            "PublicCalculatorService.calculate",
            "CLOUDFLARE_API_TOKEN",
            "DOPPLER_TOKEN",
            "AlchemyContext",
          ],
          (marker) =>
            Effect.sync(() => expect(clientCode).not.toContain(marker))
        );
        const logs = yield* Queue.make<WorkerdStructuredLog>();
        const exceptions = yield* Queue.make<string>();
        const apiWorker = (name: string) => ({
          config: {
            compatibilityDate: "2026-10-04",
            compatibilityFlags: ["nodejs_compat"],
            env: {
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
        const publicApi = yield* Effect.acquireRelease(
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
                port: 4197,
                workers: [apiWorker("taxkit-public-api")],
              })
          ),
          (host) => Effect.promise(() => host.dispose())
        );
        const unavailableApi = apiWorker("taxkit-unavailable-api");
        const unavailableApiWorker = {
          config: {
            ...unavailableApi.config,
            env: {
              ...unavailableApi.config.env,
              API_PUBLIC_ORIGIN: {
                type: "json" as const,
                value: "invalid-local-fixture",
              },
            },
          },
        };
        const websiteWorker = (name: string, binding: string) => ({
          config: {
            assets: {
              directory: path.join(root, "apps/web/dist/client"),
              hasUserWorker: true,
              runWorkerFirst: false,
            },
            compatibilityDate: "2026-10-04",
            compatibilityFlags: ["nodejs_compat"],
            env: {
              API_PUBLIC_ORIGIN: { type: "json" as const, value: apiOrigin },
              TAXKIT_API: {
                type: "worker" as const,
                worker: binding,
              },
              WEBSITE_PUBLIC_ORIGIN: {
                type: "json" as const,
                value: websiteOrigin,
              },
            },
            manifest: {
              mainModule: "server.js",
              modules: websiteModules,
              modulesRoot: websiteRoot,
            },
            name,
          },
        });
        const website = yield* Effect.acquireRelease(
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
                port: 4196,
                workers: [
                  websiteWorker("taxkit-website", "taxkit-private-api"),
                  websiteWorker(
                    "taxkit-website-unavailable",
                    "taxkit-unavailable-api"
                  ),
                  unavailableApiWorker,
                  apiWorker("taxkit-private-api"),
                ],
              })
          ),
          (host) => Effect.promise(() => host.dispose())
        );
        yield* Effect.logInfo("native-pair: waiting for API");
        yield* Effect.promise(() => publicApi.ready).pipe(
          Effect.timeout("10 seconds")
        );
        yield* Effect.logInfo("native-pair: waiting for website");
        yield* Effect.promise(() => website.ready).pipe(
          Effect.timeout("10 seconds")
        );
        const settingsFunctionId = Array.findFirst(
          Record.values(websiteModules),
          (module) =>
            module.contents.includes(
              'functionName: "websiteSettings_createServerFn_handler"'
            )
        ).pipe(
          Option.flatMap((module) =>
            Option.fromNullishOr(
              module.contents.match(
                /"(?<functionId>[a-f0-9]{64})":\s*\{\s*functionName:\s*"websiteSettings_createServerFn_handler"/u
              )?.groups
            ).pipe(Option.flatMap(Record.get("functionId")))
          ),
          Option.getOrElse(() =>
            expect.fail("Missing native generated settings function identity")
          )
        );
        const frameworkSentinel = "PRIVATE9";
        const nativeSettings = yield* Effect.promise(() =>
          website.dispatchFetch(
            `${websiteOrigin}/_serverFn/${settingsFunctionId}`,
            {
              headers: {
                origin: websiteOrigin,
                "sec-fetch-site": "same-origin",
                "x-tsr-serverFn": "true",
              },
            }
          )
        );
        expect(nativeSettings.status).toBe(200);
        expect(yield* Effect.promise(() => nativeSettings.text())).toContain(
          apiOrigin
        );
        const malformedSettings = yield* Effect.promise(() =>
          website.dispatchFetch(
            `${websiteOrigin}/_serverFn/${settingsFunctionId}?payload=${frameworkSentinel}`,
            {
              headers: {
                origin: websiteOrigin,
                "sec-fetch-site": "same-origin",
                "x-tsr-serverFn": "true",
              },
            }
          )
        );
        const malformedSettingsBody = yield* Effect.promise(() =>
          malformedSettings.text()
        );
        expect(malformedSettings.status).toBe(400);
        expect(malformedSettingsBody).toBe("");
        expect(malformedSettingsBody.includes(frameworkSentinel)).toBe(false);
        const unexpectedMethod = yield* Effect.promise(() =>
          website.dispatchFetch(
            `${websiteOrigin}/_serverFn/${settingsFunctionId}`,
            {
              body: frameworkSentinel,
              headers: { "content-type": "application/json" },
              method: "POST",
            }
          )
        );
        expect(unexpectedMethod.status).toBe(405);
        expect(unexpectedMethod.headers.get("allow")).toBe("GET");
        expect(yield* Effect.promise(() => unexpectedMethod.text())).toBe("");
        yield* Effect.forEach(
          [
            frameworkSentinel,
            "0".repeat(64),
            `${settingsFunctionId}/${frameworkSentinel}`,
            "",
          ],
          (unknownPath) =>
            Effect.gen(function* () {
              const response = yield* Effect.promise(() =>
                website.dispatchFetch(
                  `${websiteOrigin}/_serverFn/${unknownPath}`,
                  {
                    headers: {
                      origin: websiteOrigin,
                      "sec-fetch-site": "same-origin",
                      "x-tsr-serverFn": "true",
                    },
                  }
                )
              );
              expect(response.status).toBe(404);
              expect(yield* Effect.promise(() => response.text())).toBe("");
            })
        );
        yield* Effect.logInfo("native-pair: initial page");
        const initial = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/`)
        );
        const initialHtml = yield* Effect.promise(() => initial.text());
        expect(initial.status).toBe(200);
        expect(initialHtml).toContain("Pay before tax");
        expect(initialHtml).not.toContain("Take-home pay:");
        yield* Effect.logInfo("native-pair: private binding calculation");
        const server = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/`, {
            body: form,
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          })
        );
        expect(server.status).toBe(200);
        const serverHtml = yield* Effect.promise(() => server.text());
        expect(serverHtml).toContain("$1,301.00");
        const invalid = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/`, {
            body: "grossDollars=invalid&period=weekly",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          })
        );
        expect(invalid.status).toBe(200);
        expect(yield* Effect.promise(() => invalid.text())).toContain(
          "Check your pay details"
        );
        const oversized = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/`, {
            body: "x".repeat(1_048_577),
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          })
        );
        expect(oversized.status).toBe(413);
        expect(yield* Effect.promise(() => oversized.text())).toBe("");
        const unavailableWorker = yield* Effect.promise(() =>
          website.getWorker("taxkit-website-unavailable")
        );
        const unavailable = yield* Effect.promise(() =>
          unavailableWorker.fetch(`${websiteOrigin}/`, {
            body: form,
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          })
        );
        expect(unavailable.status).toBe(200);
        const unavailableHtml = yield* Effect.promise(() => unavailable.text());
        expect(unavailableHtml).toContain("Check your pay details");
        expect(unavailableHtml).not.toContain("invalid-local-fixture");
        // A second request after the isolate has been idle catches native receive
        // loops that were incorrectly retained from an earlier request.
        yield* Effect.sleep("750 millis");
        yield* Effect.logInfo("native-pair: second private calculation");
        const repeated = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/`, {
            body: form,
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          })
        );
        expect(repeated.status).toBe(200);
        expect(yield* Effect.promise(() => repeated.text())).toContain(
          "$1,301.00"
        );
        yield* Effect.logInfo("native-pair: Chromium");
        const browser = yield* Effect.acquireRelease(
          Effect.promise(() => chromium.launch({ headless: true })),
          (value) => Effect.promise(() => value.close())
        );
        const context = yield* Effect.acquireRelease(
          Effect.promise(() => browser.newContext()),
          (value) => Effect.promise(() => value.close())
        );
        const page = yield* Effect.promise(() => context.newPage());
        const calls = yield* Queue.make<{
          readonly method: string;
          readonly url: string;
          readonly headers: Readonly<Record<string, string>>;
        }>();
        page.on("request", (request) => {
          if (new URL(request.url()).pathname.startsWith("/rpc")) {
            Queue.offerUnsafe(calls, {
              headers: request.headers(),
              method: request.method(),
              url: request.url(),
            });
          }
        });
        page.on("pageerror", (error) => {
          Queue.offerUnsafe(exceptions, error.message);
        });
        yield* Effect.promise(() => page.goto(websiteOrigin));
        yield* Effect.sleep("750 millis");
        expect(yield* Queue.clear(calls)).toEqual([]);
        yield* Effect.promise(() =>
          page.getByRole("button", { exact: true, name: "Calculate" }).click()
        );
        yield* Effect.promise(() =>
          page
            .getByText("$1,301.00", { exact: true })
            .waitFor({ timeout: 5000 })
        );
        const requests = yield* Queue.clear(calls);
        expect(requests).toHaveLength(1);
        expect(
          Array.map(requests, (request) => ({
            method: request.method,
            url: request.url,
          }))
        ).toEqual([{ method: "POST", url: `${apiOrigin}/rpc` }]);
        expect(
          Array.every(
            requests,
            (request) =>
              !Record.has(request.headers, "b3") &&
              !Record.has(request.headers, "traceparent") &&
              !Record.has(request.headers, "cookie")
          )
        ).toBe(true);
        const payInput = page.getByLabel("Pay before tax ($)");
        yield* Effect.promise(() => payInput.fill("2000"));
        expect(
          yield* Effect.promise(() =>
            page.getByText("$1,301.00", { exact: true }).count()
          )
        ).toBe(0);
        expect(page.url()).toBe(`${websiteOrigin}/`);
        const errorContext = yield* Effect.acquireRelease(
          Effect.promise(() => browser.newContext()),
          (value) => Effect.promise(() => value.close())
        );
        const errorPage = yield* Effect.promise(() => errorContext.newPage());
        errorPage.on("pageerror", (error) => {
          Queue.offerUnsafe(exceptions, error.message);
        });
        errorPage.on("request", (request) => {
          if (new URL(request.url()).pathname.startsWith("/rpc")) {
            Queue.offerUnsafe(calls, {
              headers: request.headers(),
              method: request.method(),
              url: request.url(),
            });
          }
        });
        // Feed the native Worker-generated error document to a fresh browser.
        // Its real assets and transport state still perform the hydration.
        yield* Effect.promise(() =>
          errorPage.route(`${websiteOrigin}/`, (route) =>
            route.fulfill({
              body: unavailableHtml,
              contentType: "text/html",
              status: 200,
            })
          )
        );
        yield* Effect.promise(() => errorPage.goto(websiteOrigin));
        yield* Effect.promise(() =>
          errorPage.getByRole("alert").waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            errorPage.getByRole("alert").textContent()
          )
        ).toContain("Check your pay details");
        const errorPayInput = errorPage.getByLabel("Pay before tax ($)");
        yield* Effect.promise(() => errorPayInput.fill("2000"));
        yield* Effect.promise(() =>
          errorPage
            .getByRole("alert")
            .waitFor({ state: "hidden", timeout: 5000 })
        );
        expect(yield* Queue.clear(calls)).toEqual([]);
        yield* Effect.logInfo("native-pair: no JavaScript");
        const noJavaScript = yield* Effect.acquireRelease(
          Effect.promise(() =>
            browser.newContext({ javaScriptEnabled: false })
          ),
          (value) => Effect.promise(() => value.close())
        );
        const plainPage = yield* Effect.promise(() => noJavaScript.newPage());
        yield* Effect.promise(() => plainPage.goto(websiteOrigin));
        yield* Effect.promise(() =>
          plainPage
            .getByRole("button", { exact: true, name: "Calculate" })
            .click()
        );
        yield* Effect.promise(() =>
          plainPage
            .getByText("$1,301.00", { exact: true })
            .waitFor({ timeout: 5000 })
        );
        expect(yield* Queue.clear(exceptions)).toEqual([]);
        const logText = yield* Schema.encodeEffect(Json)(
          yield* Queue.clear(logs)
        );
        expect(logText.includes(frameworkSentinel)).toBe(false);
        expect(logText).not.toContain("1654");
        expect(logText).not.toContain("130100");
      }).pipe(
        Effect.timeout("25 seconds"),
        Effect.scoped,
        Effect.provide(NodeServices.layer)
      )
  );
});
