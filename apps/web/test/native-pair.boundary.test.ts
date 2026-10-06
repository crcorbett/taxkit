import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import { CalculatorRpcRequestTooLarge } from "@taxkit/api-rpc/errors";
import { TaxKitRpcClientLive } from "@taxkit/api-rpc/live";
import {
  CalculatorRpcOrigin,
  DescriptorFilterQuery,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  MetadataQuery,
} from "@taxkit/api-rpc/schemas";
import { TaxKitRpcClient } from "@taxkit/api-rpc/service";
import {
  Array,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";

import {
  nativeLocalModeFixture,
  nativeRateFixture,
} from "./native-rate.fixture";

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
        const screenshotRoot = path.join(
          root,
          ".alchemy/native-pair/screenshots"
        );
        yield* fs.makeDirectory(screenshotRoot, { recursive: true });
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
              ...nativeLocalModeFixture,
              ...nativeRateFixture("10075"),
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
              ...nativeLocalModeFixture,
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
              ...nativeLocalModeFixture,
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
        const catalogueOrigin = CalculatorRpcOrigin.make(new URL(apiOrigin));
        yield* Effect.forEach(["first", "after idle"] as const, (attempt) =>
          Effect.gen(function* () {
            if (attempt === "after idle") {
              yield* Effect.sleep("750 millis");
            }
            const catalogue = yield* TaxKitRpcClient.pipe(
              Effect.flatMap((client) =>
                client.listCalculators(MetadataQuery.make({}))
              ),
              Effect.provide(
                TaxKitRpcClientLive(catalogueOrigin).pipe(
                  Layer.provide(FetchHttpClient.layer)
                )
              )
            );
            expect(catalogue.calculators).toHaveLength(3);
            expect(
              Array.map(catalogue.calculators, (value) => value.calculatorId)
            ).toEqual(
              expect.arrayContaining([
                "au.pay.take-home",
                "au.pay.withholdings",
                "au.income-tax.annual",
              ])
            );
          })
        );
        // Exercise the seven additional checked calls against the real built Worker.
        yield* Effect.gen(function* () {
          const client = yield* TaxKitRpcClient;
          const catalogue = yield* client.listCalculators(
            MetadataQuery.make({})
          );
          const pay = Array.findFirst(
            catalogue.calculators,
            (calculator) => calculator.calculatorId === "au.pay.take-home"
          ).pipe(
            Option.getOrElse(() => expect.fail("Missing retained calculator"))
          );
          const request = GetCalculatorRequest.make({
            calculatorId: pay.calculatorId,
          });
          expect(yield* client.getCalculator(request)).toEqual(pay);
          const schema = yield* client.getCalculatorSchema(request);
          expect(schema.calculator).toEqual(pay);
          expect(schema.inputFacts.length).toBeGreaterThan(0);
          const graph = yield* client.getCalculatorGraph(
            GetCalculatorGraphRequest.make({ calculatorId: pay.calculatorId })
          );
          expect(graph.calculator).toEqual(pay);
          expect(graph.edges.length).toBeGreaterThan(0);
          expect(graph.validationIssues).toEqual([]);
          const facts = yield* client.listFacts(
            DescriptorFilterQuery.make({
              calculator: Option.some(Option.some(pay.calculatorId)),
            })
          );
          expect(facts.facts.length).toBeGreaterThan(0);
          const rules = yield* client.listRules(
            DescriptorFilterQuery.make({
              calculator: Option.some(Option.some(pay.calculatorId)),
            })
          );
          expect(rules.rules).toEqual(
            expect.arrayContaining(Array.fromIterable(schema.rules))
          );
          expect(rules.rules).toHaveLength(schema.rules.length);
          expect(yield* client.listJurisdictions()).toEqual({
            jurisdictions: [{ code: "AU", title: "Australia" }],
          });
          expect(yield* client.listTaxYears(MetadataQuery.make({}))).toEqual({
            taxYears: [{ jurisdiction: "AU", taxYear: "2025-26" }],
          });
        }).pipe(
          Effect.provide(
            TaxKitRpcClientLive(catalogueOrigin).pipe(
              Layer.provide(FetchHttpClient.layer)
            )
          )
        );
        // Deliberately oversize only this controlled transport's encoded body;
        // preserve the actual native API and the checked catalogue operation.
        const oversizedTransport = Layer.effect(
          HttpClient.HttpClient,
          HttpClient.HttpClient.pipe(
            Effect.map(
              HttpClient.mapRequest(
                HttpClientRequest.bodyText(
                  "é".repeat(32_769),
                  "application/json"
                )
              )
            )
          )
        ).pipe(Layer.provide(FetchHttpClient.layer));
        const rejected = yield* TaxKitRpcClient.pipe(
          Effect.flatMap((client) =>
            client.listCalculators(MetadataQuery.make({}))
          ),
          Effect.flip,
          Effect.provide(
            TaxKitRpcClientLive(catalogueOrigin).pipe(
              Layer.provide(oversizedTransport)
            )
          )
        );
        expect(rejected).toEqual(new CalculatorRpcRequestTooLarge());
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
        expect(initialHtml).toContain(
          'href="/calculators/au.pay.withholdings"'
        );
        expect(initialHtml).toContain(
          'href="/calculators/au.income-tax.annual"'
        );
        expect(initialHtml).toContain('href="/agents"');
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
          "Enter a valid pay amount and pay period."
        );
        yield* Effect.forEach(
          [
            "/",
            "/calculators/au.pay.withholdings",
            "/calculators/au.income-tax.annual",
          ],
          (pathname) =>
            Effect.gen(function* () {
              const oversized = yield* Effect.promise(() =>
                website.dispatchFetch(`${websiteOrigin}${pathname}`, {
                  body: "é".repeat(32_769),
                  headers: {
                    "content-type": "application/x-www-form-urlencoded",
                  },
                  method: "POST",
                })
              );
              expect(oversized.status).toBe(413);
              expect(oversized.headers.get("content-type")).toContain(
                "text/html"
              );
              const html = yield* Effect.promise(() => oversized.text());
              expect(html).toContain(
                new CalculatorRequestBodyTooLarge().message
              );
              expect(html).toContain('href="/"');
              expect(html).not.toContain("é");
              expect(html).not.toContain("PRIVATE9");
            })
        );
        yield* Effect.forEach(
          ["/rpc", "/api/v1/calculators/au.pay.take-home/calculate"],
          (pathname) =>
            Effect.gen(function* () {
              const oversized = yield* Effect.promise(() =>
                publicApi.dispatchFetch(`${apiOrigin}${pathname}`, {
                  body: "é".repeat(32_769),
                  headers: {
                    "content-type": "application/json",
                    origin: websiteOrigin,
                  },
                  method: "POST",
                })
              );
              expect(oversized.status).toBe(413);
              expect(oversized.headers.get("access-control-allow-origin")).toBe(
                websiteOrigin
              );
              const body = yield* Effect.promise(() => oversized.text());
              expect(
                yield* Schema.decodeEffect(
                  Schema.fromJsonString(CalculatorRequestBodyErrorEnvelope)
                )(body)
              ).toEqual({ error: new CalculatorRequestBodyTooLarge() });
              expect(body).not.toContain("PRIVATE9");
              expect(body).not.toContain("stack");
            })
        );
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
        expect(unavailableHtml).toContain("Check your details");
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
        // Native details starts closed and opens with the keyboard, without work.
        expect(
          yield* Effect.promise(() =>
            page.getByRole("heading", { name: "Pay breakdown" }).isVisible()
          )
        ).toBe(false);
        yield* Effect.promise(() =>
          page
            .getByText("How this answer was worked out", { exact: true })
            .focus()
        );
        yield* Effect.promise(() => page.keyboard.press("Enter"));
        yield* Effect.promise(() =>
          page
            .getByRole("heading", { name: "Pay breakdown" })
            .waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            page
              .locator(".calculation-details")
              .getByText("$1,654.00", { exact: true })
              .count()
          )
        ).toBe(2);
        expect(
          yield* Effect.promise(() =>
            page
              .locator(".calculation-details")
              .getByText("$353.00", { exact: true })
              .count()
          )
        ).toBe(2);
        expect(
          yield* Effect.promise(() =>
            page
              .getByText("Tax-free threshold claimed.", { exact: true })
              .count()
          )
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            page
              .getByRole("link", {
                name: "ATO Schedule 1 - Statement of formulas for calculating amounts to be withheld",
              })
              .getAttribute("href")
          )
        ).toBe(
          "https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld"
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
        yield* Effect.promise(() =>
          page
            .getByText(
              "This answer is out of date. Calculate again to update it.",
              {
                exact: true,
              }
            )
            .waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            page.getByText("$1,301.00", { exact: true }).count()
          )
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            page
              .locator(".calculation-details")
              .getByText("$1,654.00", { exact: true })
              .count()
          )
        ).toBe(2);
        expect(
          yield* Effect.promise(() =>
            page
              .locator(".calculation-details")
              .getByText("$2,000.00", { exact: true })
              .count()
          )
        ).toBe(0);
        expect(yield* Queue.clear(calls)).toEqual([]);
        expect(page.url()).toBe(`${websiteOrigin}/`);
        // Restoring the original figures still needs an explicit calculation.
        yield* Effect.promise(() => payInput.fill("1654"));
        expect(
          yield* Effect.promise(() =>
            page
              .getByText(
                "This answer is out of date. Calculate again to update it.",
                {
                  exact: true,
                }
              )
              .count()
          )
        ).toBe(1);
        expect(yield* Queue.clear(calls)).toEqual([]);
        yield* Effect.promise(() =>
          page.getByRole("button", { exact: true, name: "Calculate" }).click()
        );
        yield* Effect.promise(() =>
          page
            .getByText(
              "This answer is out of date. Calculate again to update it.",
              {
                exact: true,
              }
            )
            .waitFor({ state: "hidden", timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            page.getByText("$1,301.00", { exact: true }).count()
          )
        ).toBe(1);
        expect(yield* Queue.clear(calls)).toHaveLength(1);
        yield* Effect.promise(() =>
          page.route(`${apiOrigin}/rpc`, (route) =>
            route.fulfill({ body: "", status: 503 })
          )
        );
        yield* Effect.promise(() => payInput.fill("2000"));
        yield* Effect.promise(() =>
          page.getByRole("button", { exact: true, name: "Calculate" }).click()
        );
        yield* Effect.promise(() =>
          page.getByRole("alert").waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            page
              .getByRole("status", { name: "Calculation result" })
              .textContent()
          )
        ).toContain("$1,301.00");
        expect(
          yield* Effect.promise(() =>
            page
              .getByRole("status", { name: "Calculation result" })
              .textContent()
          )
        ).toContain("This answer is out of date.");
        expect(yield* Queue.clear(calls)).toHaveLength(1);
        yield* Effect.promise(() => payInput.fill("invalid"));
        yield* Effect.promise(() =>
          page.getByRole("button", { exact: true, name: "Calculate" }).click()
        );
        yield* Effect.promise(() =>
          page
            .getByText("Enter a valid pay amount and pay period.", {
              exact: true,
            })
            .waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            page.getByText("$1,301.00", { exact: true }).count()
          )
        ).toBe(1);
        expect(yield* Queue.clear(calls)).toEqual([]);
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
        ).toContain("Check your details");
        const errorPayInput = errorPage.getByLabel("Pay before tax ($)");
        yield* Effect.promise(() => errorPayInput.fill("2000"));
        yield* Effect.promise(() =>
          errorPage
            .getByRole("alert")
            .waitFor({ state: "hidden", timeout: 5000 })
        );
        expect(yield* Queue.clear(calls)).toEqual([]);
        const savedContext = yield* Effect.acquireRelease(
          Effect.promise(() => browser.newContext()),
          (value) => Effect.promise(() => value.close())
        );
        const savedPage = yield* Effect.promise(() => savedContext.newPage());
        savedPage.on("pageerror", (error) => {
          Queue.offerUnsafe(exceptions, error.message);
        });
        savedPage.on("request", (request) => {
          if (new URL(request.url()).pathname.startsWith("/rpc")) {
            Queue.offerUnsafe(calls, {
              headers: request.headers(),
              method: request.method(),
              url: request.url(),
            });
          }
        });
        // Obtain actual private POST HTML over the document's real local connection.
        // Synthetic navigation fulfillment misclassifies its address space in Chromium.
        yield* Effect.promise(() =>
          savedPage.route(
            `${websiteOrigin}/`,
            (route) =>
              route.continue({
                headers: {
                  ...route.request().headers(),
                  "content-type": "application/x-www-form-urlencoded",
                  origin: websiteOrigin,
                },
                method: "POST",
                postData: form,
              }),
            { times: 1 }
          )
        );
        yield* Effect.promise(() => savedPage.goto(websiteOrigin));
        yield* Effect.promise(() => savedPage.waitForLoadState("networkidle"));
        expect(yield* Queue.clear(calls)).toEqual([]);
        const savedPayInput = savedPage.getByLabel("Pay before tax ($)");
        yield* Effect.promise(() => savedPayInput.fill("2000"));
        yield* Effect.promise(() =>
          savedPage.getByLabel("Claim the tax-free threshold").uncheck()
        );
        yield* Effect.promise(() =>
          savedPage
            .getByText("How this answer was worked out", { exact: true })
            .click()
        );
        expect(
          yield* Effect.promise(() =>
            savedPage
              .getByText("Tax-free threshold claimed.", { exact: true })
              .count()
          )
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            savedPage
              .locator(".calculation-details")
              .getByText("$1,654.00", { exact: true })
              .count()
          )
        ).toBe(2);
        yield* Effect.promise(() =>
          savedPage
            .getByText(
              "This answer is out of date. Calculate again to update it.",
              {
                exact: true,
              }
            )
            .waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            savedPage.getByText("$1,301.00", { exact: true }).count()
          )
        ).toBe(1);
        expect(yield* Queue.clear(calls)).toEqual([]);
        yield* Effect.promise(() =>
          savedPage.route(
            `${apiOrigin}/rpc`,
            (route) => route.fulfill({ body: "", status: 503 }),
            { times: 1 }
          )
        );
        yield* Effect.promise(() =>
          savedPage
            .getByRole("button", { exact: true, name: "Calculate" })
            .click()
        );
        yield* Effect.promise(() =>
          savedPage.getByRole("alert").waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            savedPage
              .getByRole("status", { name: "Calculation result" })
              .textContent()
          )
        ).toContain("$1,301.00");
        expect(yield* Queue.clear(calls)).toHaveLength(1);
        expect(savedPage.url()).toBe(`${websiteOrigin}/`);
        // A distinct real result must replace both the answer and its explanation.
        yield* Effect.promise(() =>
          savedPage
            .getByRole("button", { exact: true, name: "Calculate" })
            .click()
        );
        yield* Effect.promise(() =>
          savedPage
            .getByText("$1,425.00", { exact: true })
            .waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            savedPage
              .locator(".calculation-details")
              .getByText("$2,000.00", { exact: true })
              .count()
          )
        ).toBe(2);
        expect(
          yield* Effect.promise(() =>
            savedPage
              .locator(".calculation-details")
              .getByText("$575.00", { exact: true })
              .count()
          )
        ).toBe(2);
        expect(
          yield* Effect.promise(() =>
            savedPage
              .getByText("Tax-free threshold not claimed.", { exact: true })
              .count()
          )
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            savedPage
              .getByText("Tax-free threshold claimed.", { exact: true })
              .count()
          )
        ).toBe(0);
        expect(
          yield* Effect.promise(() =>
            savedPage
              .getByText(
                "This answer is out of date. Calculate again to update it.",
                { exact: true }
              )
              .count()
          )
        ).toBe(0);
        expect(yield* Queue.clear(calls)).toHaveLength(1);
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
        // Both remaining pages consume the same real backend catalogue and
        // calculators. No browser fixture can supply these known answers.
        yield* Effect.forEach(
          [
            {
              amount: "9500",
              answer: "$2,756.00",
              breakdown: "Withholding breakdown",
              error: "Enter a valid pay amount and pay period.",
              id: "au.pay.withholdings",
              label: "Pay before tax ($)",
              savedAmount: "1654",
              savedAnswer: "$353.00",
              savedForm: form,
              title: "AU pay withholdings",
            },
            {
              amount: "67000",
              answer: "$12,228.00",
              breakdown: "Annual tax breakdown",
              error: "Enter a valid annual taxable income.",
              id: "au.income-tax.annual",
              label: "Annual taxable income ($)",
              savedAmount: "30000",
              savedAnswer: "$1,465.80",
              savedForm: "taxableDollars=30000",
              title: "AU annual income tax",
            },
          ] as const,
          (calculator) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => page.unroute(`${apiOrigin}/rpc`));
              yield* Effect.promise(() =>
                page
                  .locator(`nav a[href="/calculators/${calculator.id}"]`)
                  .click()
              );
              yield* Effect.promise(() =>
                page
                  .getByRole("heading", { exact: true, name: calculator.title })
                  .waitFor({ timeout: 5000 })
              );
              expect(
                yield* Effect.promise(() =>
                  page
                    .getByRole("status", { name: "Calculation result" })
                    .textContent()
                )
              ).toBe("");
              const calculatorInput = page.getByLabel(calculator.label);
              yield* Effect.promise(() =>
                calculatorInput.fill(calculator.amount)
              );
              expect(yield* Queue.clear(calls)).toEqual([]);
              yield* Effect.promise(() =>
                page
                  .getByRole("button", { exact: true, name: "Calculate" })
                  .click()
              );
              yield* Effect.promise(() =>
                page
                  .getByRole("status", { name: "Calculation result" })
                  .getByText(calculator.answer, { exact: true })
                  .waitFor({ timeout: 5000 })
              );
              expect(yield* Queue.clear(calls)).toHaveLength(1);
              yield* Effect.promise(() =>
                page
                  .getByText("How this answer was worked out", { exact: true })
                  .focus()
              );
              yield* Effect.promise(() => page.keyboard.press("Enter"));
              yield* Effect.promise(() =>
                page
                  .getByRole("heading", {
                    exact: true,
                    name: calculator.breakdown,
                  })
                  .waitFor({ timeout: 5000 })
              );
              expect(
                yield* Effect.promise(() =>
                  page
                    .locator(".calculation-details a[href^='https://']")
                    .count()
                )
              ).toBeGreaterThan(0);
              yield* Effect.promise(() =>
                page.screenshot({
                  fullPage: true,
                  path: path.join(screenshotRoot, `${calculator.id}.png`),
                })
              );
              yield* Effect.promise(() => calculatorInput.fill("30000"));
              expect(
                yield* Effect.promise(() =>
                  page
                    .getByRole("status", { name: "Calculation result" })
                    .textContent()
                )
              ).toContain(calculator.answer);
              expect(
                yield* Effect.promise(() =>
                  page
                    .getByRole("status", { name: "Calculation result" })
                    .textContent()
                )
              ).toContain("This answer is out of date.");
              expect(yield* Queue.clear(calls)).toEqual([]);
              yield* Effect.promise(() =>
                page.route(
                  `${apiOrigin}/rpc`,
                  (route) => route.fulfill({ body: "", status: 503 }),
                  { times: 1 }
                )
              );
              yield* Effect.promise(() =>
                page
                  .getByRole("button", { exact: true, name: "Calculate" })
                  .click()
              );
              yield* Effect.promise(() =>
                page.getByRole("alert").waitFor({ timeout: 5000 })
              );
              expect(
                yield* Effect.promise(() =>
                  page
                    .getByRole("status", { name: "Calculation result" })
                    .textContent()
                )
              ).toContain(calculator.answer);
              expect(yield* Queue.clear(calls)).toHaveLength(1);
              yield* Effect.promise(() => calculatorInput.fill("invalid"));
              yield* Effect.promise(() =>
                page
                  .getByRole("button", { exact: true, name: "Calculate" })
                  .focus()
              );
              yield* Effect.promise(() => page.keyboard.press("Enter"));
              yield* Effect.promise(() =>
                page
                  .getByText(calculator.error, { exact: true })
                  .waitFor({ timeout: 5000 })
              );
              expect(
                yield* Effect.promise(() =>
                  page
                    .getByRole("status", { name: "Calculation result" })
                    .textContent()
                )
              ).toContain(calculator.answer);
              expect(yield* Queue.clear(calls)).toEqual([]);
              yield* Effect.promise(() =>
                plainPage.goto(`${websiteOrigin}/calculators/${calculator.id}`)
              );
              const plainCalculatorInput = plainPage.getByLabel(
                calculator.label
              );
              yield* Effect.promise(() =>
                plainCalculatorInput.fill(calculator.amount)
              );
              yield* Effect.promise(() =>
                plainPage
                  .getByRole("button", { exact: true, name: "Calculate" })
                  .click()
              );
              yield* Effect.promise(() =>
                plainPage
                  .getByRole("status", { name: "Calculation result" })
                  .getByText(calculator.answer, { exact: true })
                  .waitFor({ timeout: 5000 })
              );
              expect(
                yield* Effect.promise(() =>
                  plainPage.getByLabel(calculator.label).inputValue()
                )
              ).toBe(calculator.amount);
              expect(plainPage.url()).toBe(
                `${websiteOrigin}/calculators/${calculator.id}`
              );
              // A different actual private submission proves restoration cannot
              // be imitated by each page's initial example.
              yield* Effect.promise(() =>
                savedPage.route(
                  `${websiteOrigin}/calculators/${calculator.id}`,
                  (route) =>
                    route.continue({
                      headers: {
                        ...route.request().headers(),
                        "content-type": "application/x-www-form-urlencoded",
                        origin: websiteOrigin,
                      },
                      method: "POST",
                      postData: calculator.savedForm,
                    }),
                  { times: 1 }
                )
              );
              const restoredResponse = yield* Effect.promise(() =>
                savedPage.goto(`${websiteOrigin}/calculators/${calculator.id}`)
              );
              yield* Effect.promise(() =>
                savedPage.waitForLoadState("networkidle")
              );
              if (restoredResponse === null) {
                return yield* Effect.die("Missing native form document reply");
              }
              const restoredHtml = yield* Effect.promise(() =>
                restoredResponse.text()
              );
              expect(
                restoredHtml.includes(`value="${calculator.savedAmount}"`)
              ).toBe(true);
              expect(restoredHtml.includes(calculator.savedAnswer)).toBe(true);
              yield* Effect.promise(() =>
                savedPage.screenshot({
                  fullPage: true,
                  path: path.join(
                    screenshotRoot,
                    `restored-${calculator.id}.png`
                  ),
                })
              );
              expect(
                yield* Effect.promise(() =>
                  savedPage.getByLabel(calculator.label).inputValue()
                )
              ).toBe(calculator.savedAmount);
              expect(
                yield* Effect.promise(() =>
                  savedPage
                    .getByRole("status", { name: "Calculation result" })
                    .textContent()
                )
              ).toContain(calculator.savedAnswer);
              expect(yield* Queue.clear(calls)).toEqual([]);
            })
        );
        yield* Effect.promise(() =>
          page
            .getByRole("link", { exact: true, name: "For agents: API access" })
            .click()
        );
        yield* Effect.promise(() =>
          page
            .getByRole("heading", { exact: true, name: "TaxKit for agents" })
            .waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            page
              .getByRole("link", {
                name: "API description for software (OpenAPI)",
              })
              .getAttribute("href")
          )
        ).toBe(`${apiOrigin}/api/docs/openapi.json`);
        expect(yield* Queue.clear(exceptions)).toEqual([]);
        const capturedLogs = yield* Queue.clear(logs);
        const logText = yield* Schema.encodeEffect(Json)(capturedLogs);
        const messageText = yield* Schema.encodeEffect(Json)(
          Array.map(capturedLogs, (log) => log.message)
        );
        expect(logText.includes(frameworkSentinel)).toBe(false);
        expect(messageText).not.toContain("1654");
        expect(messageText).not.toContain("130100");
      }).pipe(
        Effect.timeout("25 seconds"),
        Effect.scoped,
        Effect.provide(NodeServices.layer)
      )
  );
});
