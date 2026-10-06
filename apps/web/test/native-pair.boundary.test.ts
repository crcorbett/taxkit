import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { DocsPageUnavailable } from "@taxkit/api-http";
import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import { DocsRpcClientLive } from "@taxkit/api-rpc/content/live";
import { DocsRpcClient } from "@taxkit/api-rpc/content/service";
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
  DocsPublicCatalogue,
  DocsPublicPage,
  DocsPublicNavigation,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
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
        expect(apiCode).toContain(
          "@taxkit/calculators/PublicCalculatorService"
        );
        yield* Effect.forEach(
          [
            "node:fs",
            "cloudflare:workers",
            "taxkit/core/CalculationEngine",
            // Public prose names this operation. Check the actual backend
            // service identity, with a positive API oracle above, instead.
            "@taxkit/calculators/PublicCalculatorService",
            "CLOUDFLARE_API_TOKEN",
            "DOPPLER_TOKEN",
            "AlchemyContext",
          ],
          (marker) =>
            Effect.sync(() =>
              expect(clientCode.includes(marker), marker).toBe(false)
            )
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
        const docsFixtureWorkers = yield* Effect.forEach(
          ["Body", "Metadata", "MissingModule"] as const,
          (mode) =>
            Effect.gen(function* () {
              const modulesRoot = path.join(
                root,
                `.alchemy/native-pair/bundles/TaxKitApiDocs${mode}`
              );
              const files = yield* fs.glob("**/*.js", { root: modulesRoot });
              expect(files).toContain("worker.js");
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
              expect(
                Array.some(
                  Record.values(modules),
                  (module) =>
                    module.contents.includes("PRIVATE9") ||
                    module.contents.includes("/private9")
                )
              ).toBe(true);
              const name = `taxkit-api-docs-${mode}`;
              const ordinary = apiWorker(name);
              return [
                {
                  config: {
                    ...ordinary.config,
                    manifest: { mainModule: "worker.js", modules, modulesRoot },
                  },
                },
                websiteWorker(`taxkit-website-docs-${mode}`, name),
              ];
            })
        );
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
                  ...Array.flatten(docsFixtureWorkers),
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
        // Compare the actual built Worker with the owning checked catalogue,
        // including every body rather than accepting a count or a placeholder.
        const publicContent = yield* fs
          .readFileString(
            path.join(
              root,
              "packages/docs-content/.source/public-catalogue.json"
            )
          )
          .pipe(
            Effect.flatMap(
              Schema.decodeEffect(Schema.fromJsonString(DocsPublicCatalogue))
            )
          );
        expect(publicContent.pages).toHaveLength(61);
        // Native RPC restores the same catalogue values across separate
        // actual Worker requests. No authored source or compiler is consulted.
        yield* Effect.gen(function* () {
          const client = yield* DocsRpcClient;
          expect(yield* client.getNavigation()).toEqual(
            publicContent.navigation
          );
          yield* Effect.forEach(publicContent.pages, (page) =>
            Effect.gen(function* () {
              expect(yield* client.getPage(page.path)).toEqual(page);
              expect(yield* client.getMarkdown(page.path)).toBe(page.markdown);
            })
          );
          const term = yield* Schema.decodeEffect(DocsSearchTerm)("Quickstart");
          const results = yield* client.searchPages(term);
          expect(results.length).toBeGreaterThan(0);
          expect(results.length).toBeLessThanOrEqual(20);
          expect(
            Array.every(results, (result) => result.excerpt.length <= 240)
          ).toBe(true);
        }).pipe(
          Effect.provide(
            DocsRpcClientLive(catalogueOrigin).pipe(
              Layer.provide(FetchHttpClient.layer)
            )
          )
        );
        const docsNavigation = yield* Effect.promise(() =>
          publicApi.dispatchFetch(`${apiOrigin}/api/v1/docs/navigation`)
        );
        expect(docsNavigation.status).toBe(200);
        expect(
          yield* Schema.decodeEffect(
            Schema.fromJsonString(DocsPublicNavigation)
          )(yield* Effect.promise(() => docsNavigation.text()))
        ).toEqual(publicContent.navigation);
        yield* Effect.forEach(publicContent.pages, (expectedPage) =>
          Effect.gen(function* () {
            const query = new URLSearchParams({ path: expectedPage.path });
            const pageResponse = yield* Effect.promise(() =>
              publicApi.dispatchFetch(
                `${apiOrigin}/api/v1/docs/page?${query}`,
                { headers: { origin: websiteOrigin } }
              )
            );
            expect(pageResponse.status).toBe(200);
            expect(
              pageResponse.headers.get("access-control-allow-origin")
            ).toBe(websiteOrigin);
            const page = yield* Schema.decodeEffect(
              Schema.fromJsonString(DocsPublicPage)
            )(yield* Effect.promise(() => pageResponse.text()));
            expect(page).toEqual(expectedPage);
            const markdown = yield* Effect.promise(() =>
              publicApi.dispatchFetch(
                `${apiOrigin}/api/v1/docs/markdown?${query}`
              )
            );
            expect(markdown.status).toBe(200);
            expect(markdown.headers.get("content-type")).toContain(
              "text/markdown"
            );
            expect(yield* Effect.promise(() => markdown.text())).toBe(
              expectedPage.markdown
            );
          })
        );
        const docsSearch = yield* Effect.promise(() =>
          publicApi.dispatchFetch(
            `${apiOrigin}/api/v1/docs/search?term=Quickstart`
          )
        );
        expect(docsSearch.status).toBe(200);
        const docsResults = yield* Schema.decodeEffect(
          Schema.fromJsonString(Schema.Array(DocsSearchResult))
        )(yield* Effect.promise(() => docsSearch.text()));
        expect(
          Array.some(
            docsResults,
            (result) => result.path === "/start/quickstart"
          )
        ).toBe(true);
        expect(docsResults.length).toBeLessThanOrEqual(20);
        expect(
          Array.every(docsResults, (result) => result.excerpt.length <= 240)
        ).toBe(true);
        yield* Effect.forEach(
          [
            "/api/v1/docs/page?path=..%2Ftaxkit-secret-sentinel",
            "/api/v1/docs/search?term=%20%20",
          ],
          (address) =>
            Effect.gen(function* () {
              const invalid = yield* Effect.promise(() =>
                publicApi.dispatchFetch(`${apiOrigin}${address}`)
              );
              expect(invalid.status).toBe(400);
              expect(yield* Effect.promise(() => invalid.text())).toBe("");
            })
        );
        const missingDocs = yield* Effect.promise(() =>
          publicApi.dispatchFetch(
            `${apiOrigin}/api/v1/docs/markdown?path=%2Fprivate-taxkit-sentinel`
          )
        );
        expect(missingDocs.status).toBe(404);
        expect(
          yield* Schema.decodeEffect(
            Schema.fromJsonString(DocsPageUnavailable)
          )(yield* Effect.promise(() => missingDocs.text()))
        ).toEqual(
          new DocsPageUnavailable({
            message: "The documentation page was not found.",
          })
        );
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
        const docsFunctionId = Array.findFirst(
          Record.values(websiteModules),
          (module) =>
            module.contents.includes(
              'functionName: "websiteDocsPage_createServerFn_handler"'
            )
        ).pipe(
          Option.flatMap((module) =>
            Option.fromNullishOr(
              module.contents.match(
                /"(?<functionId>[a-f0-9]{64})":\s*\{\s*functionName:\s*"websiteDocsPage_createServerFn_handler"/u
              )?.groups
            ).pipe(Option.flatMap(Record.get("functionId")))
          ),
          Option.getOrElse(() =>
            expect.fail("Missing native generated docs function identity")
          )
        );
        const nativeDocsAddress = `${websiteOrigin}/_serverFn/${docsFunctionId}`;
        const nativeDocsHeaders = {
          origin: websiteOrigin,
          "sec-fetch-site": "same-origin",
          "x-taxkit-docs-page": "/start/quickstart",
          "x-tsr-serverFn": "true",
        };
        const nativeDocs = yield* Effect.promise(() =>
          website.dispatchFetch(nativeDocsAddress, {
            headers: nativeDocsHeaders,
          })
        );
        expect(nativeDocs.status).toBe(200);
        const nativeDocsBody = yield* Effect.promise(() => nativeDocs.text());
        expect(nativeDocsBody).toContain("Quickstart");
        expect(nativeDocsBody).toContain('"navigation"');
        yield* Effect.forEach(
          [
            { headers: nativeDocsHeaders, suffix: "?payload=PRIVATE9" },
            {
              headers: {
                ...nativeDocsHeaders,
                "content-type": "application/json",
              },
              suffix: "",
            },
            {
              headers: {
                ...nativeDocsHeaders,
                "x-taxkit-docs-page": `/${"a".repeat(256)}`,
              },
              suffix: "",
            },
            {
              headers: {
                ...nativeDocsHeaders,
                "x-taxkit-docs-page": "../PRIVATE9",
              },
              suffix: "",
            },
          ],
          (invalidDocsRequest) =>
            Effect.gen(function* () {
              const response = yield* Effect.promise(() =>
                website.dispatchFetch(
                  `${nativeDocsAddress}${invalidDocsRequest.suffix}`,
                  {
                    headers: invalidDocsRequest.headers,
                  }
                )
              );
              expect(response.status).toBe(400);
              expect(yield* Effect.promise(() => response.text())).toBe("");
            })
        );
        const docsPage = yield* Effect.promise(() => context.newPage());
        docsPage.on("pageerror", (error) =>
          Queue.offerUnsafe(exceptions, error.message)
        );
        const docsCalls = yield* Queue.make<string>();
        const docsDocuments = yield* Queue.make<string>();
        docsPage.on("request", (request) => {
          if (new URL(request.url()).pathname.startsWith("/_serverFn/")) {
            Queue.offerUnsafe(docsCalls, request.url());
          }
          if (
            request.isNavigationRequest() &&
            request.frame() === docsPage.mainFrame()
          ) {
            Queue.offerUnsafe(docsDocuments, request.url());
          }
        });
        yield* Effect.promise(() =>
          docsPage.goto(`${websiteOrigin}/start/quickstart`)
        );
        yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
        expect(
          yield* Effect.promise(() => docsPage.locator("main").count())
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            docsPage.locator(".docs-article h1").count()
          )
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            docsPage
              .locator(".docs-article h1")
              .evaluate((heading) => heading === document.activeElement)
          )
        ).toBe(false);
        // Read every actual SSR article with the browser's HTML parser. The
        // checked transport alone cannot satisfy these rendered-body oracles.
        yield* Effect.forEach(publicContent.pages, (expected) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}${expected.path}`, {
                headers: { "x-taxkit-docs-page": "/private9" },
              })
            );
            expect(response.status).toBe(200);
            const html = yield* Effect.promise(() => response.text());
            const rendered = yield* Effect.promise(() =>
              docsPage.evaluate((value) => {
                const document = new DOMParser().parseFromString(
                  value,
                  "text/html"
                );
                const article = document.querySelector(".docs-article");
                return {
                  canonical: document
                    .querySelector('link[rel="canonical"]')
                    ?.getAttribute("href"),
                  description: document
                    .querySelector('meta[name="description"]')
                    ?.getAttribute("content"),
                  heading: article?.querySelector("h1")?.textContent,
                  markdown: article
                    ?.querySelector('a[href*="/api/v1/docs/markdown?"]')
                    ?.getAttribute("href"),
                  navigation:
                    document.querySelectorAll(".docs-navigation a").length,
                  text: article?.textContent,
                  title: document.title,
                };
              }, html)
            );
            expect(rendered.heading).toBe(expected.frontmatter.title);
            expect(rendered.title).toBe(
              `${expected.frontmatter.title} | TaxKit`
            );
            expect(rendered.description).toBe(expected.frontmatter.description);
            expect(rendered.canonical).toBe(`${websiteOrigin}${expected.path}`);
            expect(rendered.navigation).toBe(61);
            expect(rendered.markdown).toBe(
              `${apiOrigin}/api/v1/docs/markdown?path=${encodeURIComponent(expected.path)}`
            );
            expect(rendered.text?.length).toBeGreaterThan(100);
            expect(rendered.text).not.toContain("Documentation could not load");
          })
        );
        const missing = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/private9`)
        );
        expect(missing.status).toBe(404);
        const missingHtml = yield* Effect.promise(() => missing.text());
        expect(missingHtml).toContain("Documentation page not found");
        expect(missingHtml).not.toContain(
          "The documentation page was not found."
        );
        yield* Effect.forEach(
          ["Body", "Metadata", "MissingModule"] as const,
          (mode) =>
            Effect.gen(function* () {
              const worker = yield* Effect.promise(() =>
                website.getWorker(`taxkit-website-docs-${mode}`)
              );
              const response = yield* Effect.promise(() =>
                worker.fetch(`${websiteOrigin}/start/quickstart`)
              );
              const html = yield* Effect.promise(() => response.text());
              expect(html).not.toContain("PRIVATE9");
              expect(html).not.toContain("content/private9.mdx");
              const native = yield* Effect.promise(() =>
                worker.fetch(nativeDocsAddress, { headers: nativeDocsHeaders })
              );
              const body = yield* Effect.promise(() => native.text());
              expect(body).toContain("DocsPresentationUnavailable");
              expect(html).toContain("Documentation could not load");
              expect(body).not.toContain("PRIVATE9");
              expect(body).not.toContain("private9.mdx");
            })
        );
        yield* Queue.clear(docsCalls);
        yield* Queue.clear(docsDocuments);
        yield* Effect.promise(() =>
          docsPage
            .locator('.docs-navigation a[href="/sdk/typescript-sdk"]')
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", { exact: true, name: "TypeScript SDK" })
            .waitFor()
        );
        expect(
          yield* Effect.promise(() =>
            docsPage
              .locator(".docs-article h1")
              .evaluate((heading) => heading === document.activeElement)
          )
        ).toBe(true);
        expect(
          yield* Effect.promise(() =>
            docsPage
              .locator('.docs-navigation [aria-current="page"]')
              .getAttribute("href")
          )
        ).toBe("/sdk/typescript-sdk");
        expect(yield* Queue.clear(docsCalls)).toContain(nativeDocsAddress);
        expect(yield* Queue.clear(docsDocuments)).toEqual([]);
        yield* Effect.promise(() =>
          docsPage
            .locator('.docs-article a[href="/sdk/plain-sdk"]')
            .first()
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", { exact: true, name: "Plain SDK" })
            .waitFor({ timeout: 5000 })
        );
        expect(yield* Queue.clear(docsCalls)).toContain(nativeDocsAddress);
        expect(yield* Queue.clear(docsDocuments)).toEqual([]);
        yield* Effect.promise(() =>
          docsPage
            .locator('.docs-navigation a[href="/start/quickstart"]')
            .click({ timeout: 5000 })
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", { exact: true, name: "Quickstart" })
            .waitFor({ timeout: 5000 })
        );
        yield* Effect.promise(() =>
          docsPage.evaluate(() => window.scrollTo(0, 0))
        );
        yield* Effect.promise(() =>
          docsPage.screenshot({
            fullPage: true,
            path: path.join(screenshotRoot, "docs-desktop.png"),
          })
        );
        yield* Effect.promise(() =>
          docsPage.setViewportSize({ height: 844, width: 390 })
        );
        expect(
          yield* Effect.promise(() =>
            docsPage.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            )
          )
        ).toBe(true);
        yield* Effect.promise(() =>
          docsPage.locator(".docs-navigation-panel summary").focus()
        );
        yield* Effect.promise(() => docsPage.keyboard.press("Enter"));
        expect(
          yield* Effect.promise(() =>
            docsPage.locator(".docs-navigation-panel").getAttribute("open")
          )
        ).toBe(null);
        yield* Effect.promise(() =>
          docsPage.evaluate(() => window.scrollTo(0, 0))
        );
        yield* Effect.promise(() =>
          docsPage.screenshot({
            fullPage: true,
            path: path.join(screenshotRoot, "docs-mobile.png"),
          })
        );
        yield* Effect.promise(() =>
          plainPage.goto(`${websiteOrigin}/start/quickstart`)
        );
        expect(
          yield* Effect.promise(() =>
            plainPage.locator(".docs-article h1").textContent()
          )
        ).toBe("Quickstart");
        yield* Effect.promise(() =>
          plainPage
            .locator('.docs-navigation a[href="/sdk/typescript-sdk"]')
            .click()
        );
        expect(
          yield* Effect.promise(() =>
            plainPage.locator(".docs-article h1").textContent()
          )
        ).toBe("TypeScript SDK");
        yield* Effect.promise(() =>
          docsPage.goto(`${websiteOrigin}/contributing/what-are-you-changing`)
        );
        yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
        yield* Effect.promise(() =>
          docsPage.locator(".docs-navigation-panel summary").click()
        );
        expect(
          yield* Effect.promise(() =>
            docsPage.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            )
          )
        ).toBe(true);
        expect(
          yield* Effect.promise(() =>
            docsPage.locator(".docs-article svg").count()
          )
        ).toBeGreaterThan(0);
        expect(
          yield* Effect.promise(() =>
            docsPage
              .getByRole("region", { name: "Documentation table" })
              .count()
          )
        ).toBeGreaterThan(0);
        yield* Effect.promise(() =>
          docsPage
            .getByRole("region", { name: "Documentation table" })
            .first()
            .focus()
        );
        expect(
          yield* Effect.promise(() =>
            docsPage
              .getByRole("region", { name: "Documentation table" })
              .first()
              .evaluate((region) => region === document.activeElement)
          )
        ).toBe(true);
        yield* Effect.promise(() => docsPage.keyboard.press("ArrowRight"));
        yield* Effect.promise(() =>
          docsPage.evaluate(() => window.scrollTo(0, 0))
        );
        yield* Effect.promise(() =>
          docsPage.screenshot({
            fullPage: true,
            path: path.join(screenshotRoot, "docs-diagram-mobile.png"),
          })
        );
        yield* Effect.promise(() =>
          docsPage.setViewportSize({ height: 900, width: 1440 })
        );
        yield* Effect.promise(() =>
          docsPage.locator(".docs-navigation-panel summary").click()
        );
        yield* Effect.promise(() =>
          docsPage.evaluate(() => window.scrollTo(0, 0))
        );
        yield* Effect.promise(() =>
          docsPage.screenshot({
            fullPage: true,
            path: path.join(screenshotRoot, "docs-diagram-desktop.png"),
          })
        );
        yield* Effect.promise(() =>
          docsPage.goto(`${websiteOrigin}/start/quickstart`)
        );
        yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
        yield* Effect.promise(() =>
          docsPage.route(
            nativeDocsAddress,
            (route) =>
              route.fulfill({
                body: nativeDocsBody.replace('"navigation"', '"PRIVATE9"'),
                headers: Record.fromEntries(nativeDocs.headers),
                status: 200,
              }),
            { times: 1 }
          )
        );
        yield* Effect.promise(() =>
          docsPage
            .locator('.docs-navigation a[href="/sdk/typescript-sdk"]')
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", {
              exact: true,
              name: "Documentation could not load",
            })
            .waitFor()
        );
        expect(
          yield* Effect.promise(() => docsPage.locator("body").textContent())
        ).not.toContain("PRIVATE9");
        yield* Effect.promise(() =>
          docsPage
            .getByRole("link", { exact: true, name: "Open the Quickstart" })
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", { exact: true, name: "Quickstart" })
            .waitFor()
        );
        const searchFunctionId = Array.findFirst(
          Record.values(websiteModules),
          (module) =>
            module.contents.includes(
              'functionName: "websiteDocsSearch_createServerFn_handler"'
            )
        ).pipe(
          Option.flatMap((module) =>
            Option.fromNullishOr(
              module.contents.match(
                /"(?<functionId>[a-f0-9]{64})":\s*\{\s*functionName:\s*"websiteDocsSearch_createServerFn_handler"/u
              )?.groups
            ).pipe(Option.flatMap(Record.get("functionId")))
          ),
          Option.getOrElse(() =>
            expect.fail("Missing native generated search function identity")
          )
        );
        const nativeSearchAddress = `${websiteOrigin}/_serverFn/${searchFunctionId}`;
        const nativeSearchHeaders = {
          origin: websiteOrigin,
          "sec-fetch-site": "same-origin",
          "x-taxkit-docs-search": "Quickstart",
          "x-tsr-serverFn": "true",
        };
        const nativeSearch = yield* Effect.promise(() =>
          website.dispatchFetch(nativeSearchAddress, {
            headers: nativeSearchHeaders,
          })
        );
        expect(nativeSearch.status).toBe(200);
        const nativeSearchBody = yield* Effect.promise(() =>
          nativeSearch.text()
        );
        expect(nativeSearchBody).toContain('"results"');
        expect(nativeSearchBody).toContain('"term"');
        yield* Effect.forEach(
          [
            { header: "%ZZ", suffix: "" },
            { header: "a".repeat(1201), suffix: "" },
            { header: "Quickstart", suffix: "?payload=PRIVATE9" },
          ],
          (invalidSearchInput) =>
            Effect.gen(function* () {
              const response = yield* Effect.promise(() =>
                website.dispatchFetch(
                  `${nativeSearchAddress}${invalidSearchInput.suffix}`,
                  {
                    headers: {
                      ...nativeSearchHeaders,
                      "x-taxkit-docs-search": invalidSearchInput.header,
                    },
                  }
                )
              );
              expect(response.status).toBe(400);
              expect(yield* Effect.promise(() => response.text())).toBe("");
            })
        );
        yield* Effect.forEach(["税 😀", "a".repeat(101), "%ED%A0%80"], (term) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              website.dispatchFetch(nativeSearchAddress, {
                headers: {
                  ...nativeSearchHeaders,
                  "x-taxkit-docs-search":
                    term === "%ED%A0%80" ? term : encodeURIComponent(term),
                },
              })
            );
            expect(response.status).toBe(200);
            const body = yield* Effect.promise(() => response.text());
            expect(body).toContain(
              term === "税 😀" ? '"s":"税 😀"' : "DocsSearchInputError"
            );
            expect(body).not.toContain("PRIVATE9");
          })
        );
        yield* Queue.clear(docsCalls);
        yield* Queue.clear(docsDocuments);
        yield* Effect.promise(() =>
          docsPage
            .getByRole("link", { exact: true, name: "Search documentation" })
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", { exact: true, name: "Search documentation" })
            .waitFor()
        );
        expect(yield* Queue.clear(docsCalls)).toContain(nativeSearchAddress);
        expect(yield* Queue.clear(docsDocuments)).toEqual([]);
        expect(
          yield* Effect.promise(() =>
            docsPage
              .getByText("Enter a few words to find a documentation page.")
              .count()
          )
        ).toBe(1);
        yield* Effect.forEach(
          ["Quickstart", "2025", "true", "null", "税 😀", "café"],
          (term) =>
            Effect.gen(function* () {
              const response = yield* Effect.promise(() =>
                publicApi.dispatchFetch(
                  `${apiOrigin}/api/v1/docs/search?${new URLSearchParams({ term })}`
                )
              );
              expect(response.status).toBe(200);
              const expected = yield* Schema.decodeEffect(
                Schema.fromJsonString(Schema.Array(DocsSearchResult))
              )(yield* Effect.promise(() => response.text()));
              // Use an actual original human address. A forged header cannot change
              // the SSR words or substitute another result list.
              const rendered = yield* Effect.promise(() =>
                website.dispatchFetch(
                  `${websiteOrigin}/search?${new URLSearchParams({ term })}`,
                  {
                    headers: { "x-taxkit-docs-search": "PRIVATE9" },
                  }
                )
              );
              expect(rendered.status).toBe(200);
              const html = yield* Effect.promise(() => rendered.text());
              expect(html).not.toContain("PRIVATE9");
              yield* Effect.promise(() =>
                docsPage.goto(
                  `${websiteOrigin}/search?${new URLSearchParams({ term })}`
                )
              );
              yield* Effect.promise(() =>
                docsPage.waitForLoadState("networkidle")
              );
              expect(
                yield* Effect.promise(() =>
                  docsPage
                    .getByRole("searchbox", { name: "Search words" })
                    .inputValue()
                )
              ).toBe(term);
              expect(
                yield* Effect.promise(() =>
                  docsPage
                    .locator(".docs-search-results h3 a")
                    .allTextContents()
                )
              ).toEqual(Array.map(expected, (item) => item.title));
              expect(
                yield* Effect.promise(() =>
                  docsPage.locator(".docs-search-results li").count()
                )
              ).toBeLessThanOrEqual(20);
              expect(
                yield* Effect.promise(() =>
                  docsPage
                    .locator('meta[name="robots"]')
                    .getAttribute("content")
                )
              ).toBe("noindex, follow");
              if (expected.length === 0) {
                expect(
                  yield* Effect.promise(() =>
                    docsPage
                      .getByRole("heading", {
                        exact: true,
                        name: "No matching pages",
                      })
                      .count()
                  )
                ).toBe(1);
              }
            })
        );
        yield* Effect.forEach(
          [
            `?term=${"a".repeat(101)}`,
            "?term=PRIVATE9&term=Quickstart",
            "?unexpected=PRIVATE9",
          ],
          (query) =>
            Effect.gen(function* () {
              const response = yield* Effect.promise(() =>
                website.dispatchFetch(`${websiteOrigin}/search${query}`)
              );
              expect(response.status).toBe(200);
              const html = yield* Effect.promise(() => response.text());
              expect(html).toContain(
                "Enter up to 100 characters to search the documentation."
              );
              // The original URL may be retained by the native router for loading;
              // neither a form value nor visible error copy reflects rejected data.
              yield* Effect.promise(() =>
                docsPage.goto(`${websiteOrigin}/search${query}`)
              );
              expect(
                yield* Effect.promise(() =>
                  docsPage.getByRole("alert").textContent()
                )
              ).not.toContain("PRIVATE9");
              expect(
                yield* Effect.promise(() =>
                  docsPage
                    .getByRole("searchbox", { name: "Search words" })
                    .inputValue()
                )
              ).toBe("");
            })
        );
        const unavailableSearchWorker = yield* Effect.promise(() =>
          website.getWorker("taxkit-website-unavailable")
        );
        const unavailableSearch = yield* Effect.promise(() =>
          unavailableSearchWorker.fetch(
            `${websiteOrigin}/search?term=Quickstart`
          )
        );
        expect(unavailableSearch.status).toBe(200);
        expect(yield* Effect.promise(() => unavailableSearch.text())).toContain(
          "Documentation search could not load. Please reload this page to try again."
        );
        yield* Effect.promise(() => docsPage.goto(`${websiteOrigin}/search`));
        yield* Effect.promise(() =>
          docsPage
            .getByRole("searchbox", { name: "Search words" })
            .pressSequentially("Quickstart")
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("button", { exact: true, name: "Search documentation" })
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("link", { exact: true, name: "Quickstart" })
            .last()
            .waitFor()
        );
        yield* Effect.promise(() =>
          docsPage.setViewportSize({ height: 900, width: 1280 })
        );
        yield* Effect.promise(() =>
          docsPage.evaluate(() => window.scrollTo(0, 0))
        );
        yield* Effect.promise(() =>
          docsPage.screenshot({
            fullPage: true,
            path: path.join(screenshotRoot, "docs-search-desktop.png"),
          })
        );
        yield* Effect.promise(() =>
          docsPage.setViewportSize({ height: 844, width: 390 })
        );
        expect(
          yield* Effect.promise(() =>
            docsPage.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            )
          )
        ).toBe(true);
        yield* Effect.promise(() =>
          docsPage.getByRole("searchbox", { name: "Search words" }).focus()
        );
        expect(
          yield* Effect.promise(() =>
            docsPage
              .getByRole("searchbox", { name: "Search words" })
              .evaluate((element) => getComputedStyle(element).outlineStyle)
          )
        ).toBe("solid");
        yield* Effect.promise(() =>
          docsPage.evaluate(() => window.scrollTo(0, 0))
        );
        yield* Effect.promise(() =>
          docsPage.screenshot({
            fullPage: true,
            path: path.join(screenshotRoot, "docs-search-mobile.png"),
          })
        );
        yield* Effect.promise(() =>
          docsPage
            .locator('.docs-search-results a[href="/start/quickstart"]')
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", { exact: true, name: "Quickstart" })
            .waitFor()
        );
        yield* Effect.promise(() =>
          expect
            .poll(() =>
              docsPage
                .locator(".docs-article h1")
                .evaluate((element) => document.activeElement === element)
            )
            .toBe(true)
        );
        yield* Effect.promise(() => plainPage.goto(`${websiteOrigin}/search`));
        yield* Effect.promise(() =>
          plainPage
            .getByRole("searchbox", { name: "Search words" })
            .pressSequentially("Quickstart")
        );
        yield* Effect.promise(() =>
          plainPage
            .getByRole("button", { exact: true, name: "Search documentation" })
            .click()
        );
        yield* Effect.promise(() =>
          plainPage
            .locator('.docs-search-results a[href="/start/quickstart"]')
            .waitFor()
        );
        yield* Effect.promise(() =>
          plainPage
            .locator('.docs-search-results a[href="/start/quickstart"]')
            .click()
        );
        expect(
          yield* Effect.promise(() =>
            plainPage.locator(".docs-article h1").textContent()
          )
        ).toContain("Quickstart");
        yield* Effect.promise(() =>
          docsPage.goto(`${websiteOrigin}/start/quickstart`)
        );
        yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
        yield* Effect.promise(() =>
          docsPage.route(
            nativeSearchAddress,
            (route) =>
              route.fulfill({
                body: nativeSearchBody.replace('"results"', '"PRIVATE9"'),
                headers: Record.fromEntries(nativeSearch.headers),
                status: 200,
              }),
            { times: 1 }
          )
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("link", { exact: true, name: "Search documentation" })
            .click()
        );
        yield* Effect.promise(() => docsPage.getByRole("alert").waitFor());
        expect(
          yield* Effect.promise(() => docsPage.getByRole("alert").textContent())
        ).toContain("Documentation search could not load.");
        expect(
          yield* Effect.promise(() => docsPage.getByRole("alert").textContent())
        ).not.toContain("PRIVATE9");
        yield* Effect.promise(() =>
          docsPage
            .getByRole("link", { exact: true, name: "Open the Quickstart" })
            .click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", { exact: true, name: "Quickstart" })
            .waitFor()
        );
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
        Effect.timeout("65 seconds"),
        Effect.scoped,
        Effect.provide(NodeServices.layer)
      ),
    { timeout: 70_000 }
  );
});
