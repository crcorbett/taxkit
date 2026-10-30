import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { DocsPageUnavailable } from "@taxkit/api-http";
import { TaxKitApi } from "@taxkit/api-http/api";
import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import { DiscoveryPath } from "@taxkit/api-http/routes";
import {
  DescriptorFilterQuery,
  HelpQuery,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { docsImagePath } from "@taxkit/content/publication";
import {
  DocsPngBytes,
  DocsPublicCatalogue,
  DocsPublicPage,
  DocsPublicNavigation,
  DocsSearchResult,
  DocsSearchTerm,
  docsOgImageSize,
} from "@taxkit/content/schemas";
import {
  Schedule,
  Match,
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  Queue,
  Record,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { FetchHttpClient, Headers, HttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";
import type { Page, Request as BrowserRequest } from "playwright";

import { readWorkerModules } from "./native-modules.fixture";
import {
  nativeLocalModeFixture,
  nativeRateFixture,
} from "./native-rate.fixture";
// The page's checked structured data, as a search engine reads it.
const TechArticleJson = Schema.fromJsonString(
  Schema.Struct({
    description: Schema.String,
    headline: Schema.String,
    image: Schema.URLFromString,
    inLanguage: Schema.Literal("en-AU"),
    url: Schema.URLFromString,
  })
);
const apiOrigin = "http://127.0.0.1:4197";
const websiteOrigin = "http://127.0.0.1:4196";
const form = "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on";
// The one cache policy: shared public reads and unshared everything else.
const publicCache = {
  browser: "public, max-age=0",
  cdn: "public, max-age=604800, stale-if-error=0",
};
const frameworkSentinel = "PRIVATE9";
// The browser calls the public API directly. Calculation is its only POST.
const calculationPath = /^\/api\/v1\/calculators\/[^/]+\/calculate$/u;
const isCalculation = (url: URL) =>
  url.origin === apiOrigin && calculationPath.test(url.pathname);
const takeHomeCalculation = `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`;
const docsNavigationAddress = `${apiOrigin}/api/v1/docs/navigation`;
const docsPageAddress = (path: string) =>
  `${apiOrigin}/api/v1/docs/page?${new URLSearchParams({ path })}`;
const Json = Schema.fromJsonString(Schema.Unknown);
const ColourChannel = Schema.NumberFromString.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(255)
);
const ColourChannels = Schema.Tuple([
  ColourChannel,
  ColourChannel,
  ColourChannel,
]);
const expectReadableText = Effect.fnUntraced(function* ({
  page,
  selector,
}: {
  readonly page: Page;
  readonly selector: string;
}) {
  const foreground = yield* Effect.promise(() =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).color)
  );
  const background = yield* Effect.promise(() =>
    page
      .locator(":root")
      .evaluate((element) => getComputedStyle(element).backgroundColor)
  );
  const luminance = yield* Effect.forEach([foreground, background], (colour) =>
    Option.fromNullishOr(
      /^rgb\((?<red>\d+), (?<green>\d+), (?<blue>\d+)\)$/u.exec(colour)
    ).pipe(
      Effect.fromOption,
      Effect.map((matches) => Array.drop(matches, 1)),
      Effect.flatMap(Schema.decodeUnknownEffect(ColourChannels)),
      Effect.map((channels) =>
        EffectFunction.pipe(
          Array.zipWith(
            channels,
            [0.2126, 0.7152, 0.0722],
            (channel, weight) => {
              const normalised = channel / 255;
              return (
                EffectBoolean.match(normalised <= 0.04045, {
                  onFalse: () => ((normalised + 0.055) / 1.055) ** 2.4,
                  onTrue: () => normalised / 12.92,
                }) * weight
              );
            }
          ),
          Array.reduce(0, (sum, value) => sum + value)
        )
      ),
      Effect.orDie
    )
  );
  const text = Array.get(luminance, 0).pipe(
    Option.getOrElse(() => expect.fail("Missing native text colour"))
  );
  const surface = Array.get(luminance, 1).pipe(
    Option.getOrElse(() => expect.fail("Missing native surface colour"))
  );
  expect(
    (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05)
  ).toBeGreaterThanOrEqual(4.5);
});
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
        yield* Effect.gen(function* verifyBundles() {
          expect(apiFiles).toContain("worker.js");
          expect(websiteFiles).toContain("entry.server.js");
          const clientFiles = yield* fs.glob("**/*.js", {
            root: path.join(root, "apps/web/dist/client"),
          });
          const clientCode = (yield* EffectFunction.pipe(
            clientFiles,
            Effect.forEach((file) =>
              fs.readFileString(path.join(root, "apps/web/dist/client", file))
            )
          )).join("\n");
          const apiCode = EffectFunction.pipe(
            Record.values(apiModules),
            Array.map((module) => module.contents)
          ).join("\n");
          Array.forEach((marker: string) => {
            expect(apiCode).toContain(marker);
          })([
            "taxkit/core/CalculationEngine",
            "@taxkit/calculators/PublicCalculatorService",
          ]);
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
              Effect.sync(() => {
                expect(clientCode).not.toContain(marker);
              })
          );
          // Share images are rendered by the API build. No Worker or browser
          // carries the renderer, its font or its WebAssembly.
          expect(apiCode).toContain("DocsOgImages.getImage");
          EffectFunction.pipe(Record.keys(apiWasm), (actual) => {
            expect(actual).toStrictEqual([]);
          });
          yield* Effect.forEach(
            ["@takumi-rs", "takumi_wasm", "DocsPageRenderer.renderPage"],
            (marker) =>
              Effect.sync(() => {
                expect(clientCode).not.toContain(marker);
                expect(apiCode).not.toContain(marker);
                const actual = EffectFunction.pipe(
                  Record.values(websiteModules),
                  Array.some((module) => module.contents.includes(marker))
                );
                expect(actual, marker).toBeFalsy();
              })
          );
          expect(
            yield* fs.glob("**/*.wasm", {
              root: path.join(root, "apps/web/dist"),
            })
          ).toStrictEqual([]);
        }).pipe(Effect.withSpan("NativePair.verifyBundles"));
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
        // Miniflare serialises each instance's config synchronously on this
        // event loop. Start the ten-Worker Website only after the API is ready,
        // so its serialisation cannot run inside the API's startup bound.
        yield* Effect.logInfo("native-pair: waiting for API");
        yield* Effect.promise(() => publicApi.ready).pipe(
          Effect.timeout("10 seconds")
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
              TAXKIT_PUBLICATION_ORIGIN: {
                type: "json" as const,
                value: websiteOrigin,
              },
              WEBSITE_PUBLIC_ORIGIN: {
                type: "json" as const,
                value: websiteOrigin,
              },
            },
            manifest: {
              mainModule: "entry.server.js",
              modules: websiteModules,
              modulesRoot: websiteRoot,
            },
            name,
          },
        });
        const docsFixtureWorkers = yield* EffectFunction.pipe(
          ["Address"] as const,
          Effect.forEach((mode) =>
            Effect.gen(function* () {
              const modulesRoot = path.join(
                root,
                `.alchemy/native-pair/bundles/TaxKitApiDocs${mode}`
              );
              const { files, modules, wasm } = yield* readWorkerModules({
                modulesRoot,
              });
              expect(files).toContain("worker.js");
              EffectFunction.pipe(
                Record.values(modules),
                Array.some(
                  (module) =>
                    module.contents.includes("PRIVATE9") ||
                    module.contents.includes("/private9")
                ),
                (actual) => {
                  expect(actual).toBeTruthy();
                }
              );
              const name = `taxkit-api-docs-${mode}`;
              const ordinary = apiWorker(name);
              return {
                mode,
                workers: [
                  {
                    config: {
                      ...ordinary.config,
                      manifest: {
                        mainModule: "worker.js",
                        modules: { ...modules, ...wasm },
                        modulesRoot,
                      },
                    },
                  },
                  websiteWorker(`taxkit-website-docs-${mode}`, name),
                ],
              };
            })
          )
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
                ],
              })
          ),
          (host) => Effect.promise(() => host.dispose())
        );
        yield* Effect.logInfo("native-pair: waiting for website");
        yield* Effect.promise(() => website.ready).pipe(
          Effect.timeout("10 seconds")
        );
        const { publicContent } = yield* Effect.gen(
          function* verifyContentCatalogue() {
            // Compare the actual built Worker with the owning checked catalogue,
            // including every body rather than accepting a count or a placeholder.
            const catalogue = yield* fs
              .readFileString(
                path.join(root, "apps/api/src/generated/docs-catalogue.json")
              )
              .pipe(
                Effect.flatMap(
                  Schema.decodeEffect(
                    Schema.fromJsonString(DocsPublicCatalogue)
                  )
                )
              );
            expect(catalogue.pages).toHaveLength(62);
            // The API serves each share image drawn at build time; the Website forwards
            // its own /og address once and checks the PNG.
            yield* Effect.forEach(Array.take(catalogue.pages, 3), (page) =>
              Effect.gen(function* () {
                const address = `${websiteOrigin}${docsImagePath(page.path)}`;
                const served = yield* Effect.promise(() =>
                  website.dispatchFetch(address)
                );
                expect(served.status, page.path).toBe(200);
                expect({
                  contentType: served.headers.get("content-type"),
                  cacheControl: served.headers.get("cache-control"),
                  cloudflareCdnCacheControl: served.headers.get(
                    "cloudflare-cdn-cache-control"
                  ),
                }).toStrictEqual({
                  contentType: "image/png",
                  cacheControl: publicCache.browser,
                  cloudflareCdnCacheControl: publicCache.cdn,
                });
                const bytes = yield* Schema.decodeEffect(DocsPngBytes)(
                  new Uint8Array(
                    yield* Effect.promise(() => served.arrayBuffer())
                  )
                );
                const owned = yield* Effect.promise(() =>
                  publicApi.dispatchFetch(
                    `${apiOrigin}/api/v1/docs/og${page.path}.png`
                  )
                );
                expect({
                  ownedStatus: owned.status,
                  apiImageBytes: Array.fromIterable(
                    new Uint8Array(
                      yield* Effect.promise(() => owned.arrayBuffer())
                    )
                  ),
                }).toStrictEqual({
                  ownedStatus: 200,
                  apiImageBytes: Array.fromIterable(bytes),
                });
                const head = yield* Effect.promise(() =>
                  website.dispatchFetch(address, { method: "HEAD" })
                );
                expect({
                  status: head.status,
                  contentType: head.headers.get("content-type"),
                  cacheControl: head.headers.get("cache-control"),
                }).toStrictEqual({
                  status: 200,
                  contentType: served.headers.get("content-type"),
                  cacheControl: served.headers.get("cache-control"),
                });
                expect(yield* Effect.promise(() => head.text())).toBe("");
              })
            );
            yield* Effect.forEach(
              [
                { address: "/og/private9.png", status: 404 },
                { address: "/og/invalid.path.png", status: 404 },
              ],
              (missing) =>
                Effect.gen(function* () {
                  const response = yield* Effect.promise(() =>
                    website.dispatchFetch(`${websiteOrigin}${missing.address}`)
                  );
                  expect(response.status, missing.address).toBe(missing.status);
                  EffectFunction.pipe(
                    response.headers.get("cache-control"),
                    (actual) => {
                      expect(actual).toBe("no-store");
                    }
                  );
                })
            );
            // The generated HTTP client restores the same catalogue values across
            // separate actual Worker requests. No authored source or compiler is consulted.
            yield* Effect.gen(function* () {
              const client = yield* HttpApiClient.make(TaxKitApi, {
                baseUrl: apiOrigin,
              });
              expect(yield* client.content.getNavigation()).toStrictEqual(
                catalogue.navigation
              );
              yield* EffectFunction.pipe(
                catalogue.pages,
                Effect.forEach((page) =>
                  Effect.gen(function* () {
                    expect(
                      yield* client.content.getPage({
                        query: { path: page.path },
                      })
                    ).toStrictEqual(page);
                    expect(
                      yield* client.content.getMarkdown({
                        query: { path: page.path },
                      })
                    ).toBe(page.markdown);
                  })
                )
              );
              const term =
                yield* Schema.decodeEffect(DocsSearchTerm)("Quickstart");
              const results = yield* client.content.searchPages({
                query: { term },
              });
              expect(results.length).toBeGreaterThan(0);
              expect(results.length).toBeLessThanOrEqual(20);
              EffectFunction.pipe(
                results,
                Array.every((result) => result.excerpt.length <= 240),
                (actual) => {
                  expect(actual).toBeTruthy();
                }
              );
            }).pipe(Effect.provide(FetchHttpClient.layer));
            return { publicContent: catalogue };
          }
        ).pipe(Effect.withSpan("NativePair.verifyContentCatalogue"));
        const { unavailableDiscoveryWorker, discoverySitemap } =
          yield* Effect.gen(function* verifyDiscoveryDocuments() {
            // The API's own discovery routes are the reference documents.
            const discoveryDocuments = yield* EffectFunction.pipe(
              DiscoveryPath.literals,
              Effect.forEach((documentPath) =>
                Effect.gen(function* () {
                  const owned = yield* Effect.promise(() =>
                    publicApi.dispatchFetch(
                      `${apiOrigin}/api/v1/docs/discovery${documentPath}`
                    )
                  );
                  expect(owned.status).toBe(200);
                  return {
                    body: yield* Effect.promise(() => owned.text()),
                    contentType: (
                      owned.headers.get("content-type") ?? ""
                    ).replace("; charset=utf-8", ""),
                    path: documentPath,
                  };
                })
              )
            );
            const unavailableWorker = yield* Effect.promise(() =>
              website.getWorker("taxkit-website-unavailable")
            );
            yield* EffectFunction.pipe(
              discoveryDocuments,
              Effect.forEach((document) =>
                Effect.gen(function* () {
                  const served = yield* Effect.promise(() =>
                    website.dispatchFetch(`${websiteOrigin}${document.path}`)
                  );
                  expect({
                    status: served.status,
                    contentType: served.headers.get("content-type"),
                    cacheControl: served.headers.get("cache-control"),
                    cloudflareCdnCacheControl: served.headers.get(
                      "cloudflare-cdn-cache-control"
                    ),
                    xContentTypeOptions: served.headers.get(
                      "x-content-type-options"
                    ),
                    body: yield* Effect.promise(() => served.text()),
                  }).toStrictEqual({
                    status: 200,
                    contentType: `${document.contentType}; charset=utf-8`,
                    cacheControl: publicCache.browser,
                    cloudflareCdnCacheControl: publicCache.cdn,
                    xContentTypeOptions: "nosniff",
                    body: document.body,
                  });
                  // The Website forwards the API's own discovery route unchanged.
                  const owned = yield* Effect.promise(() =>
                    publicApi.dispatchFetch(
                      `${apiOrigin}/api/v1/docs/discovery${document.path}`
                    )
                  );
                  expect({
                    status: owned.status,
                    contentType: owned.headers.get("content-type"),
                    cacheControl: owned.headers.get("cache-control"),
                    body: yield* Effect.promise(() => owned.text()),
                  }).toStrictEqual({
                    status: 200,
                    contentType: served.headers.get("content-type"),
                    cacheControl: publicCache.browser,
                    body: document.body,
                  });
                  const head = yield* Effect.promise(() =>
                    website.dispatchFetch(`${websiteOrigin}${document.path}`, {
                      method: "HEAD",
                    })
                  );
                  expect({
                    status: head.status,
                    contentType: head.headers.get("content-type"),
                    cacheControl: head.headers.get("cache-control"),
                    cloudflareCdnCacheControl: head.headers.get(
                      "cloudflare-cdn-cache-control"
                    ),
                    xContentTypeOptions: head.headers.get(
                      "x-content-type-options"
                    ),
                    body: yield* Effect.promise(() => head.text()),
                  }).toStrictEqual({
                    status: 200,
                    contentType: served.headers.get("content-type"),
                    cacheControl: served.headers.get("cache-control"),
                    cloudflareCdnCacheControl: served.headers.get(
                      "cloudflare-cdn-cache-control"
                    ),
                    xContentTypeOptions: served.headers.get(
                      "x-content-type-options"
                    ),
                    body: "",
                  });
                  const wrongMethod = yield* Effect.promise(() =>
                    website.dispatchFetch(`${websiteOrigin}${document.path}`, {
                      body: "PRIVATE9",
                      method: "POST",
                    })
                  );
                  const rejectedMethod = {
                    wrongMethodStatus: wrongMethod.status,
                    wrongMethodHeadersGetAllow:
                      wrongMethod.headers.get("allow"),
                    wrongMethodHeadersGetCacheControl:
                      wrongMethod.headers.get("cache-control"),
                    EffectPromiseWrongMethodText: yield* Effect.promise(() =>
                      wrongMethod.text()
                    ),
                  };
                  const query = yield* Effect.promise(() =>
                    website.dispatchFetch(
                      `${websiteOrigin}${document.path}?PRIVATE9=1`
                    )
                  );
                  expect({
                    method: rejectedMethod,
                    query: {
                      queryStatus: query.status,
                      EffectPromiseQueryText: yield* Effect.promise(() =>
                        query.text()
                      ),
                    },
                  }).toStrictEqual({
                    method: {
                      wrongMethodStatus: 405,
                      wrongMethodHeadersGetAllow: "GET, HEAD",
                      wrongMethodHeadersGetCacheControl: "no-store",
                      EffectPromiseWrongMethodText: "",
                    },
                    query: {
                      queryStatus: 400,
                      EffectPromiseQueryText: "",
                    },
                  });
                  const unavailable = yield* Effect.promise(() =>
                    unavailableWorker.fetch(`${websiteOrigin}${document.path}`)
                  );
                  expect({
                    unavailableStatus: unavailable.status,
                    unavailableHeadersGetCacheControl:
                      unavailable.headers.get("cache-control"),
                    unavailableCdnCache: unavailable.headers.get(
                      "cloudflare-cdn-cache-control"
                    ),
                    EffectPromiseUnavailableText: yield* Effect.promise(() =>
                      unavailable.text()
                    ),
                  }).toStrictEqual({
                    unavailableStatus: 503,
                    unavailableHeadersGetCacheControl: "no-store",
                    unavailableCdnCache: "no-store",
                    EffectPromiseUnavailableText: "",
                  });
                })
              )
            );
            const discoveryRobots = yield* EffectFunction.pipe(
              discoveryDocuments,
              Array.findFirst((document) => document.path === "/robots.txt")
            ).pipe(Effect.fromOption);
            // Nothing remains behind a retired server-function path.
            Array.forEach((marker: string) => {
              expect(discoveryRobots.body).toContain(marker);
            })([
              "User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: /\n",
              "User-agent: ClaudeBot\n",
            ]);
            EffectFunction.pipe(
              discoveryRobots.body.endsWith(
                `\nSitemap: ${websiteOrigin}/sitemap.xml\n`
              ),
              (actual) => {
                expect(actual).toBeTruthy();
              }
            );
            const sitemap = yield* EffectFunction.pipe(
              discoveryDocuments,
              Array.findFirst((document) => document.path === "/sitemap.xml")
            ).pipe(Effect.fromOption);
            const discoveryIndex = yield* EffectFunction.pipe(
              discoveryDocuments,
              Array.findFirst((document) => document.path === "/llms.txt")
            ).pipe(Effect.fromOption);
            const discoveryFull = yield* EffectFunction.pipe(
              discoveryDocuments,
              Array.findFirst((document) => document.path === "/llms-full.txt")
            ).pipe(Effect.fromOption);
            Array.forEach((marker: string) => {
              expect(sitemap.body).not.toContain(marker);
            })(["lastmod", "/search"]);
            expect(discoveryIndex.body).not.toContain(".mdx");
            // Exact processed-body comparison preserves useful fenced import/code
            // examples. It must not reject every line beginning with "import".
            yield* EffectFunction.pipe(
              publicContent.pages,
              Effect.forEach((page) =>
                Effect.sync(() => {
                  expect(sitemap.body).toContain(
                    `<loc>${websiteOrigin}${page.path}</loc>`
                  );
                  expect(discoveryIndex.body).toContain(
                    `(${apiOrigin}/api/v1/docs/markdown?${new URLSearchParams({ path: page.path }).toString()})`
                  );
                  expect(discoveryFull.body).toContain(
                    `Canonical page: ${websiteOrigin}${page.path}\n\n${page.markdown}`
                  );
                })
              )
            );
            return {
              unavailableDiscoveryWorker: unavailableWorker,
              discoverySitemap: sitemap,
            };
          }).pipe(Effect.withSpan("NativePair.verifyDiscoveryDocuments"));
        yield* Effect.gen(function* verifyPublicDocumentation() {
          const docsNavigation = yield* Effect.promise(() =>
            publicApi.dispatchFetch(`${apiOrigin}/api/v1/docs/navigation`)
          );
          expect({
            docsNavigationStatus: docsNavigation.status,
            navigation: yield* Schema.decodeEffect(
              Schema.fromJsonString(DocsPublicNavigation)
            )(yield* Effect.promise(() => docsNavigation.text())),
          }).toStrictEqual({
            docsNavigationStatus: 200,
            navigation: publicContent.navigation,
          });
          yield* EffectFunction.pipe(
            publicContent.pages,
            Effect.forEach((expectedPage) =>
              Effect.gen(function* () {
                const query = new URLSearchParams({ path: expectedPage.path });
                const pageResponse = yield* Effect.promise(() =>
                  publicApi.dispatchFetch(
                    `${apiOrigin}/api/v1/docs/page?${query}`,
                    { headers: { origin: websiteOrigin } }
                  )
                );
                expect({
                  status: pageResponse.status,
                  accessControlAllowOrigin: pageResponse.headers.get(
                    "access-control-allow-origin"
                  ),
                }).toStrictEqual({
                  status: 200,
                  accessControlAllowOrigin: websiteOrigin,
                });
                const page = yield* Schema.decodeEffect(
                  Schema.fromJsonString(DocsPublicPage)
                )(yield* Effect.promise(() => pageResponse.text()));
                expect(page).toStrictEqual(expectedPage);
                const markdown = yield* Effect.promise(() =>
                  publicApi.dispatchFetch(
                    `${apiOrigin}/api/v1/docs/markdown?${query}`
                  )
                );
                expect(markdown.status).toBe(200);
                EffectFunction.pipe(
                  markdown.headers.get("content-type"),
                  (actual) => {
                    expect(actual).toContain("text/markdown");
                  }
                );
                expect(yield* Effect.promise(() => markdown.text())).toBe(
                  expectedPage.markdown
                );
              })
            )
          );
          // Retirement must preserve every authored page address as real HTML,
          // not only a successful Markdown or catalogue lookup.
          yield* EffectFunction.pipe(
            publicContent.pages,
            Effect.forEach((page) =>
              Effect.gen(function* () {
                const response = yield* Effect.promise(() =>
                  website.dispatchFetch(`${websiteOrigin}${page.path}`, {
                    headers: { accept: "text/html" },
                  })
                );
                expect(response.status, page.path).toBe(200);
                EffectFunction.pipe(
                  response.headers.get("content-type"),
                  (actual) => {
                    expect(actual).toContain("text/html");
                  }
                );
                const html = yield* Effect.promise(() => response.text());
                expect({
                  cacheControl: response.headers.get("cache-control"),
                  cloudflareCdnCacheControl: response.headers.get(
                    "cloudflare-cdn-cache-control"
                  ),
                }).toStrictEqual({
                  cacheControl: publicCache.browser,
                  cloudflareCdnCacheControl: publicCache.cdn,
                });
                Array.forEach((marker: string) => {
                  expect(html).toContain(marker);
                })([
                  `href="${websiteOrigin}${page.path}"`,
                  `content="${websiteOrigin}/og${page.path}.png"`,
                  'class="docs-article"',
                ]);
              })
            )
          );
          // A Markdown preference at a page moves to its Markdown file, and
          // every file reads the owning processed body. A count, copied source or
          // forged native header cannot satisfy these actual built-Worker responses.
          yield* EffectFunction.pipe(
            publicContent.pages,
            Effect.forEach((page) =>
              Effect.gen(function* () {
                const moved = yield* Effect.promise(() =>
                  website.dispatchFetch(`${websiteOrigin}${page.path}`, {
                    headers: { accept: "text/markdown" },
                    redirect: "manual",
                  })
                );
                expect(moved.status, page.path).toBe(307);
                expect({
                  location: moved.headers.get("location"),
                  vary: moved.headers.get("vary"),
                  cacheControl: moved.headers.get("cache-control"),
                }).toStrictEqual({
                  location: `${page.path}.md`,
                  vary: "Accept",
                  cacheControl: publicCache.browser,
                });
                yield* EffectFunction.pipe(
                  [".md"] as const,
                  Effect.forEach((suffix) =>
                    Effect.gen(function* () {
                      const address = `${websiteOrigin}${page.path}${suffix}`;
                      const headers = {
                        accept: "text/markdown",
                        "x-taxkit-docs-page": "/private9",
                      };
                      const served = yield* Effect.promise(() =>
                        website.dispatchFetch(address, { headers })
                      );
                      expect({
                        servedStatus: served.status,
                        servedHeadersGetContentType:
                          served.headers.get("content-type"),
                        cacheControl: served.headers.get("cache-control"),
                        cloudflareCdnCacheControl: served.headers.get(
                          "cloudflare-cdn-cache-control"
                        ),
                        servedHeadersGetVary: served.headers.get("vary"),
                        servedHeadersGetXContentTypeOptions: served.headers.get(
                          "x-content-type-options"
                        ),
                      }).toStrictEqual({
                        servedStatus: 200,
                        servedHeadersGetContentType:
                          "text/markdown; charset=utf-8",
                        cacheControl: publicCache.browser,
                        cloudflareCdnCacheControl: publicCache.cdn,
                        servedHeadersGetVary: "Accept",
                        servedHeadersGetXContentTypeOptions: "nosniff",
                      });
                      EffectFunction.pipe(
                        served.headers.get("link"),
                        (actual) => {
                          expect(actual).toBe(
                            `<${websiteOrigin}${page.path}>; rel="canonical"; type="text/html"`
                          );
                        }
                      );
                      expect(yield* Effect.promise(() => served.text())).toBe(
                        page.markdown
                      );
                      const head = yield* Effect.promise(() =>
                        website.dispatchFetch(address, {
                          headers,
                          method: "HEAD",
                        })
                      );
                      expect(head.status).toBe(200);
                      yield* Effect.forEach(
                        [
                          "content-type",
                          "cache-control",
                          "cloudflare-cdn-cache-control",
                          "vary",
                          "x-content-type-options",
                          "link",
                        ],
                        (header) =>
                          Effect.sync(() => {
                            const actualHeader = head.headers.get(header);
                            expect(actualHeader).toBe(
                              served.headers.get(header)
                            );
                          })
                      );
                      expect(yield* Effect.promise(() => head.text())).toBe("");
                    })
                  )
                );
              })
            )
          );
        }).pipe(Effect.withSpan("NativePair.verifyPublicDocumentation"));
        const { quickstart } = yield* Effect.gen(
          function* verifyMarkdownNegotiation() {
            const quickstartPage = yield* EffectFunction.pipe(
              publicContent.pages,
              Array.findFirst((page) => page.path === "/start/quickstart")
            ).pipe(Effect.fromOption);
            yield* Effect.forEach(
              [
                {
                  accept: "text/markdown;q=0.9, text/html;q=0.7",
                  markdown: true,
                  status: 307,
                },
                {
                  accept: 'application/json;note="a,b;c", text/markdown',
                  markdown: true,
                  status: 307,
                },
                {
                  accept: "text/markdown;q=0, */*",
                  markdown: false,
                  status: 200,
                },
                {
                  accept: "text/markdown, text/html",
                  markdown: false,
                  status: 200,
                },
                {
                  accept: "text/markdown;q=0.6, text/*;q=0.8",
                  markdown: false,
                  status: 200,
                },
                {
                  accept: 'application/json;note="text/markdown"',
                  markdown: false,
                  status: 406,
                },
                {
                  accept: "text/markdown;q=0, text/html;q=0",
                  markdown: false,
                  status: 406,
                },
                {
                  accept: "invalid text/markdown",
                  markdown: false,
                  status: 400,
                },
                {
                  accept: "text/markdown;q=1.001",
                  markdown: false,
                  status: 400,
                },
                { accept: "x".repeat(4097), markdown: false, status: 400 },
              ],
              (choice) =>
                Effect.gen(function* () {
                  const response = yield* Effect.promise(() =>
                    website.dispatchFetch(`${websiteOrigin}/start/quickstart`, {
                      headers: { accept: choice.accept },
                      redirect: "manual",
                    })
                  );
                  expect(response.status, choice.accept).toBe(choice.status);
                  // Every reply at a docs address carries the same Vary set, so Workers
                  // Cache keeps the HTML and Markdown variants side by side.
                  EffectFunction.pipe(
                    response.headers.get("vary"),
                    (actual) => {
                      // Every reply at a docs address carries the same Vary set, so Workers
                      // Cache keeps the HTML and Markdown variants side by side.
                      expect(actual).toBe("Accept");
                    }
                  );
                  const body = yield* Effect.promise(() => response.text());
                  if (choice.markdown) {
                    EffectFunction.pipe(
                      response.headers.get("location"),
                      (actual) => {
                        expect(actual).toBe("/start/quickstart.md");
                      }
                    );
                  }
                  if (choice.status === 200) {
                    EffectFunction.pipe(
                      response.headers.get("content-type"),
                      (actual) => {
                        expect(actual).toContain("text/html");
                      }
                    );
                    expect(body).toContain("docs-article");
                  } else {
                    expect({
                      responseHeadersGetCacheControl:
                        response.headers.get("cache-control"),
                      cdnCacheControl: response.headers.get(
                        "cloudflare-cdn-cache-control"
                      ),
                      body,
                    }).toStrictEqual({
                      responseHeadersGetCacheControl: "public, max-age=0",
                      cdnCacheControl:
                        "public, max-age=604800, stale-if-error=0",
                      body: "",
                    });
                  }
                })
            );
            // An explicit representation file does not depend on browser Accept.
            const explicitMarkdown = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}/start/quickstart.md`, {
                headers: { accept: "text/html" },
              })
            );
            expect(explicitMarkdown.status).toBe(200);
            expect(yield* Effect.promise(() => explicitMarkdown.text())).toBe(
              quickstartPage.markdown
            );
            yield* Effect.forEach(
              [
                {
                  address: "/start/quickstart.md?PRIVATE9=1",
                  method: "GET",
                  status: 400,
                },
                {
                  address: "/start/quickstart?PRIVATE9=1",
                  method: "GET",
                  status: 400,
                },
                { address: "/invalid.path.md", method: "GET", status: 400 },
                { address: "/private9.md", method: "GET", status: 404 },
                { address: "/private9", method: "GET", status: 307 },
                { address: "/search.md", method: "GET", status: 404 },
                { address: "/agents.md", method: "GET", status: 404 },
                {
                  address: "/start/quickstart.md",
                  method: "POST",
                  status: 405,
                },
                { address: "/start/quickstart.md", method: "PUT", status: 405 },
                { address: "/start/quickstart", method: "POST", status: 404 },
              ],
              (invalid) =>
                Effect.gen(function* () {
                  const response = yield* Effect.promise(() =>
                    website.dispatchFetch(
                      `${websiteOrigin}${invalid.address}`,
                      {
                        headers: { accept: "text/markdown" },
                        method: invalid.method,
                        redirect: "manual",
                      }
                    )
                  );
                  expect(response.status).toBe(invalid.status);
                  if (invalid.status === 405) {
                    EffectFunction.pipe(
                      response.headers.get("allow"),
                      (actual) => {
                        expect(actual).toBe("GET, HEAD");
                      }
                    );
                  }
                  expect(yield* Effect.promise(() => response.text())).toBe("");
                })
            );
            yield* EffectFunction.pipe(
              [".md"] as const,
              Effect.forEach((suffix) =>
                Effect.gen(function* () {
                  const unavailable = yield* Effect.promise(() =>
                    unavailableDiscoveryWorker.fetch(
                      `${websiteOrigin}/start/quickstart${suffix}`,
                      {
                        headers: { accept: "text/markdown" },
                      }
                    )
                  );
                  expect({
                    unavailableStatus: unavailable.status,
                    unavailableHeadersGetCacheControl:
                      unavailable.headers.get("cache-control"),
                    EffectPromiseUnavailableText: yield* Effect.promise(() =>
                      unavailable.text()
                    ),
                  }).toStrictEqual({
                    unavailableStatus: 503,
                    unavailableHeadersGetCacheControl: "no-store",
                    EffectPromiseUnavailableText: "",
                  });
                })
              )
            );
            return { quickstart: quickstartPage };
          }
        ).pipe(Effect.withSpan("NativePair.verifyMarkdownNegotiation"));
        yield* Effect.gen(function* verifySearchResponses() {
          const docsSearch = yield* Effect.promise(() =>
            publicApi.dispatchFetch(
              `${apiOrigin}/api/v1/docs/search?term=Quickstart`
            )
          );
          expect(docsSearch.status).toBe(200);
          const docsResults = yield* Schema.decodeEffect(
            Schema.fromJsonString(Schema.Array(DocsSearchResult))
          )(yield* Effect.promise(() => docsSearch.text()));
          EffectFunction.pipe(
            docsResults,
            Array.some((result) => result.path === "/start/quickstart"),
            (actual) => {
              expect(actual).toBeTruthy();
            }
          );
          expect(docsResults.length).toBeLessThanOrEqual(20);
          EffectFunction.pipe(
            docsResults,
            Array.every((result) => result.excerpt.length <= 240),
            (actual) => {
              expect(actual).toBeTruthy();
            }
          );
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
                expect({
                  invalidStatus: invalid.status,
                  EffectPromiseInvalidText: yield* Effect.promise(() =>
                    invalid.text()
                  ),
                }).toStrictEqual({
                  invalidStatus: 400,
                  EffectPromiseInvalidText: "",
                });
              })
          );
          const missingDocs = yield* Effect.promise(() =>
            publicApi.dispatchFetch(
              `${apiOrigin}/api/v1/docs/markdown?path=%2Fprivate-taxkit-sentinel`
            )
          );
          expect({
            missingDocsStatus: missingDocs.status,
            unavailablePage: yield* Schema.decodeEffect(
              Schema.fromJsonString(DocsPageUnavailable)
            )(yield* Effect.promise(() => missingDocs.text())),
          }).toStrictEqual({
            missingDocsStatus: 404,
            unavailablePage: new DocsPageUnavailable({
              message: "The documentation page was not found.",
            }),
          });
        }).pipe(Effect.withSpan("NativePair.verifySearchResponses"));
        yield* Effect.gen(function* verifyCalculatorMetadata() {
          yield* EffectFunction.pipe(
            ["first", "after idle"] as const,
            Effect.forEach((attempt) =>
              Effect.gen(function* () {
                if (attempt === "after idle") {
                  yield* Effect.sleep("750 millis");
                }
                const catalogue = yield* HttpApiClient.make(TaxKitApi, {
                  baseUrl: apiOrigin,
                }).pipe(
                  Effect.flatMap((client) =>
                    client.calculatorApi.listCalculators({
                      query: MetadataQuery.make({}),
                    })
                  ),
                  Effect.provide(FetchHttpClient.layer)
                );
                expect({
                  calculatorCount: catalogue.calculators.length,
                  calculatorIds: EffectFunction.pipe(
                    catalogue.calculators,
                    Array.map((value) => value.calculatorId),
                    Array.sort(Order.String)
                  ),
                }).toStrictEqual({
                  calculatorCount: 3,
                  calculatorIds: [
                    "au.income-tax.annual",
                    "au.pay.take-home",
                    "au.pay.withholdings",
                  ],
                });
              })
            )
          );
          // Exercise the seven additional checked calls against the real built Worker.
          yield* Effect.gen(function* () {
            const { calculatorApi } = yield* HttpApiClient.make(TaxKitApi, {
              baseUrl: apiOrigin,
            });
            const catalogue = yield* calculatorApi.listCalculators({
              query: MetadataQuery.make({}),
            });
            const pay = EffectFunction.pipe(
              catalogue.calculators,
              Array.findFirst(
                (calculator) => calculator.calculatorId === "au.pay.take-home"
              )
            ).pipe(
              Option.getOrElse(() => expect.fail("Missing retained calculator"))
            );
            const params = { calculatorId: pay.calculatorId };
            const calculator = yield* calculatorApi.getCalculator({
              params,
              query: HelpQuery.make({}),
            });
            const schema = yield* calculatorApi.getCalculatorSchema({
              params,
              query: HelpQuery.make({}),
            });
            const graph = yield* calculatorApi.getCalculatorGraph({
              params,
              query: MetadataQuery.make({}),
            });
            const filter = DescriptorFilterQuery.make({
              calculator: Option.some(Option.some(pay.calculatorId)),
            });
            const facts = yield* calculatorApi.listFacts({ query: filter });
            const rules = yield* calculatorApi.listRules({ query: filter });
            expect({
              calculator,
              schemaCalculator: schema.calculator,
              graphCalculator: graph.calculator,
              graphIssues: graph.validationIssues,
              hasInputFacts: schema.inputFacts.length > 0,
              hasEdges: graph.edges.length > 0,
              hasFacts: facts.facts.length > 0,
            }).toStrictEqual({
              calculator: pay,
              schemaCalculator: pay,
              graphCalculator: pay,
              graphIssues: [],
              hasInputFacts: true,
              hasEdges: true,
              hasFacts: true,
            });
            expect(rules.rules).toStrictEqual(
              expect.arrayContaining(Array.fromIterable(schema.rules))
            );
            expect({
              ruleCount: rules.rules.length,
              jurisdictions: yield* calculatorApi.getJurisdictions(),
              taxYears: yield* calculatorApi.getTaxYears({
                query: MetadataQuery.make({}),
              }),
            }).toStrictEqual({
              ruleCount: schema.rules.length,
              jurisdictions: {
                jurisdictions: [{ code: "AU", title: "Australia" }],
              },
              taxYears: {
                taxYears: [{ jurisdiction: "AU", taxYear: "2025-26" }],
              },
            });
          }).pipe(Effect.provide(FetchHttpClient.layer));
          expect({
            serverFunctionsAbsent: !EffectFunction.pipe(
              Record.values(websiteModules),
              Array.some((module) =>
                /"[a-f0-9]{64}":\s*\{\s*functionName:/u.test(module.contents)
              )
            ),
            serverFunctionHandlerAbsent: !EffectFunction.pipe(
              Record.values(websiteModules),
              Array.some((module) =>
                module.contents.includes("_createServerFn_handler")
              )
            ),
          }).toStrictEqual({
            serverFunctionsAbsent: true,
            serverFunctionHandlerAbsent: true,
          });
          yield* Effect.forEach(
            [
              { address: frameworkSentinel, method: "GET" },
              { address: "0".repeat(64), method: "GET" },
              {
                address: `${"0".repeat(64)}/${frameworkSentinel}`,
                method: "GET",
              },
              { address: "", method: "GET" },
              { address: "0".repeat(64), method: "POST" },
              { address: `0?payload=${frameworkSentinel}`, method: "GET" },
            ],
            (retired) =>
              Effect.gen(function* () {
                const response = yield* Effect.promise(() =>
                  website.dispatchFetch(
                    `${websiteOrigin}/_serverFn/${retired.address}`,
                    {
                      body: Match.value(retired).pipe(
                        Match.when({ method: "POST" }, () => frameworkSentinel),
                        Match.orElse(() => null)
                      ),
                      headers: {
                        "content-type": "application/json",
                        origin: websiteOrigin,
                        "sec-fetch-site": "same-origin",
                        "x-tsr-serverFn": "true",
                      },
                      method: retired.method,
                    }
                  )
                );
                expect(response.status, retired.address).toBe(404);
                expect({
                  responseHeadersGetCacheControl:
                    response.headers.get("cache-control"),
                  EffectPromiseResponseText: yield* Effect.promise(() =>
                    response.text()
                  ),
                }).toStrictEqual({
                  responseHeadersGetCacheControl: "no-store",
                  EffectPromiseResponseText: "",
                });
              })
          );
        }).pipe(Effect.withSpan("NativePair.verifyCalculatorMetadata"));
        yield* Effect.gen(function* verifyServerRenderedCalculator() {
          yield* Effect.logInfo("native-pair: initial page");
          const initial = yield* Effect.promise(() =>
            website.dispatchFetch(`${websiteOrigin}/`)
          );
          const initialHtml = yield* Effect.promise(() => initial.text());
          expect({
            status: initial.status,
            cacheControl: initial.headers.get("cache-control"),
            cloudflareCdnCacheControl: initial.headers.get(
              "cloudflare-cdn-cache-control"
            ),
          }).toStrictEqual({
            status: 200,
            cacheControl: publicCache.browser,
            cloudflareCdnCacheControl: publicCache.cdn,
          });
          // The first HTML seeds the browser's checked public settings; there is
          // no separate settings request.
          Array.forEach((marker: string) => {
            expect(initialHtml).toContain(marker);
          })([
            `apiOrigin:"${apiOrigin}/",publicationOrigin:"${websiteOrigin}/",websiteOrigin:"${websiteOrigin}/"`,
            "Pay before tax",
            'href="/calculators/au.pay.withholdings"',
            'href="/calculators/au.income-tax.annual"',
            'href="/agents"',
          ]);
          expect(initialHtml).not.toContain("Take-home pay:");
          // Calculators need JavaScript; the Website accepts no form POST.
          yield* Effect.forEach(
            [
              "/",
              "/calculators/au.pay.withholdings",
              "/calculators/au.income-tax.annual",
            ],
            (pathname) =>
              Effect.gen(function* () {
                const posted = yield* Effect.promise(() =>
                  website.dispatchFetch(`${websiteOrigin}${pathname}`, {
                    body: form,
                    headers: {
                      "content-type": "application/x-www-form-urlencoded",
                    },
                    method: "POST",
                  })
                );
                expect(posted.status, pathname).toBe(404);
                expect({
                  postedHeadersGetCacheControl:
                    posted.headers.get("cache-control"),
                  EffectPromisePostedText: yield* Effect.promise(() =>
                    posted.text()
                  ),
                }).toStrictEqual({
                  postedHeadersGetCacheControl: "no-store",
                  EffectPromisePostedText: "",
                });
              })
          );
          yield* Effect.forEach(
            ["/api/v1/calculators/au.pay.take-home/calculate"],
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
                expect({
                  status: oversized.status,
                  accessControlAllowOrigin: oversized.headers.get(
                    "access-control-allow-origin"
                  ),
                }).toStrictEqual({
                  status: 413,
                  accessControlAllowOrigin: websiteOrigin,
                });
                const body = yield* Effect.promise(() => oversized.text());
                expect(
                  yield* Schema.decodeEffect(
                    Schema.fromJsonString(CalculatorRequestBodyErrorEnvelope)
                  )(body)
                ).toStrictEqual({ error: new CalculatorRequestBodyTooLarge() });
                Array.forEach((marker: string) => {
                  expect(body).not.toContain(marker);
                })(["PRIVATE9", "stack"]);
              })
          );
        }).pipe(Effect.withSpan("NativePair.verifyServerRenderedCalculator"));
        const { browser, context, page, calls } = yield* Effect.gen(
          function* verifyBrowserCalculation() {
            yield* Effect.logInfo("native-pair: Chromium");
            const chromiumBrowser = yield* Effect.acquireRelease(
              Effect.promise(() => chromium.launch({ headless: true })),
              (value) => Effect.promise(() => value.close())
            );
            const browserContext = yield* Effect.acquireRelease(
              Effect.promise(() => chromiumBrowser.newContext()),
              (value) => Effect.promise(() => value.close())
            );
            // A visitor cookie for the shared host: credentialed API calls would
            // carry it to the API's port as well.
            yield* Effect.promise(() =>
              browserContext.addCookies([
                {
                  domain: "127.0.0.1",
                  name: "taxkit_visitor",
                  path: "/",
                  value: "visitor",
                },
              ])
            );
            const calculatorPage = yield* Effect.promise(() =>
              browserContext.newPage()
            );
            const calculationCalls = yield* Queue.make<{
              readonly method: string;
              readonly url: string;
              readonly request: BrowserRequest;
            }>();
            // Record calculations and any retired server-function call.
            const recordCalls = (request: BrowserRequest) => {
              const url = new URL(request.url());
              if (isCalculation(url) || url.pathname.startsWith("/_serverFn")) {
                Queue.offerUnsafe(calculationCalls, {
                  method: request.method(),
                  request,
                  url: request.url(),
                });
              }
            };
            calculatorPage.on("request", recordCalls);
            calculatorPage.on("pageerror", (error) => {
              Queue.offerUnsafe(exceptions, error.message);
            });
            yield* Effect.promise(() => calculatorPage.goto(websiteOrigin));
            yield* Effect.sleep("750 millis");
            expect(yield* Queue.clear(calculationCalls)).toStrictEqual([]);
            yield* Effect.promise(() =>
              calculatorPage
                .getByRole("button", { exact: true, name: "Calculate" })
                .click()
            );
            yield* Effect.promise(() =>
              calculatorPage
                .getByText("$1,301.00", { exact: true })
                .waitFor({ timeout: 5000 })
            );
            // Native details starts closed and opens with the keyboard, without work.
            expect(
              !(yield* Effect.promise(() =>
                calculatorPage
                  .getByRole("heading", { name: "Pay breakdown" })
                  .isVisible()
              ))
            ).toBeTruthy();
            yield* Effect.promise(() =>
              calculatorPage
                .getByText("How this answer was worked out", { exact: true })
                .focus()
            );
            yield* Effect.promise(() => calculatorPage.keyboard.press("Enter"));
            yield* Effect.promise(() =>
              calculatorPage
                .getByRole("heading", { name: "Pay breakdown" })
                .waitFor({ timeout: 5000 })
            );
            expect({
              originalGrossPayCount: yield* Effect.promise(() =>
                calculatorPage
                  .locator(".calculation-details")
                  .getByText("$1,654.00", { exact: true })
                  .count()
              ),
              withholdingAmountCount: yield* Effect.promise(() =>
                calculatorPage
                  .locator(".calculation-details")
                  .getByText("$353.00", { exact: true })
                  .count()
              ),
              claimedThresholdCount: yield* Effect.promise(() =>
                calculatorPage
                  .getByText("Tax-free threshold claimed.", { exact: true })
                  .count()
              ),
              scheduleSourceHref: yield* Effect.promise(() =>
                calculatorPage
                  .getByRole("link", {
                    name: "ATO Schedule 1 - Statement of formulas for calculating amounts to be withheld",
                  })
                  .getAttribute("href")
              ),
            }).toStrictEqual({
              originalGrossPayCount: 2,
              withholdingAmountCount: 2,
              claimedThresholdCount: 1,
              scheduleSourceHref:
                "https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld",
            });
            const requests = yield* Queue.clear(calculationCalls);
            expect({
              requestCount: requests.length,
              calculationRequests: EffectFunction.pipe(
                requests,
                Array.map((request) => ({
                  method: request.method,
                  url: request.url,
                }))
              ),
            }).toStrictEqual({
              requestCount: 1,
              calculationRequests: [
                { method: "POST", url: takeHomeCalculation },
              ],
            });
            // Credentials are omitted and no trace correlation or collection
            // header is sent.
            const sentHeaders = yield* EffectFunction.pipe(
              requests,
              Effect.forEach((call) =>
                Effect.promise(() => call.request.allHeaders())
              )
            );
            EffectFunction.pipe(
              sentHeaders,
              Array.every(
                (headers) =>
                  !Record.has(headers, "b3") &&
                  !Record.has(headers, "traceparent") &&
                  !Record.has(headers, "cookie") &&
                  !Record.has(headers, "x-taxkit-collection-policy")
              ),
              (actual) => {
                expect(actual).toBeTruthy();
              }
            );
            return {
              browser: chromiumBrowser,
              context: browserContext,
              page: calculatorPage,
              calls: calculationCalls,
            };
          }
        ).pipe(Effect.withSpan("NativePair.verifyBrowserCalculation"));
        const { payInput } = yield* Effect.gen(function* verifyRecalculation() {
          const savedPayInput = page.getByLabel("Pay before tax ($)");
          yield* Effect.promise(() => savedPayInput.fill("2000"));
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
          expect({
            retainedNetPayCount: yield* Effect.promise(() =>
              page.getByText("$1,301.00", { exact: true }).count()
            ),
            originalGrossPayCount: yield* Effect.promise(() =>
              page
                .locator(".calculation-details")
                .getByText("$1,654.00", { exact: true })
                .count()
            ),
            unsubmittedGrossPayCount: yield* Effect.promise(() =>
              page
                .locator(".calculation-details")
                .getByText("$2,000.00", { exact: true })
                .count()
            ),
            QueueClearCalls: yield* Queue.clear(calls),
          }).toStrictEqual({
            retainedNetPayCount: 1,
            originalGrossPayCount: 2,
            unsubmittedGrossPayCount: 0,
            QueueClearCalls: [],
          });
          EffectFunction.pipe(page.url(), (actual) => {
            expect(actual).toBe(`${websiteOrigin}/`);
          });
          // Restoring the original figures still needs an explicit calculation.
          yield* Effect.promise(() => savedPayInput.fill("1654"));
          expect({
            staleNoticeCount: yield* Effect.promise(() =>
              page
                .getByText(
                  "This answer is out of date. Calculate again to update it.",
                  {
                    exact: true,
                  }
                )
                .count()
            ),
            QueueClearCalls: yield* Queue.clear(calls),
          }).toStrictEqual({
            staleNoticeCount: 1,
            QueueClearCalls: [],
          });
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
          expect({
            retainedNetPayCount: yield* Effect.promise(() =>
              page.getByText("$1,301.00", { exact: true }).count()
            ),
            calculationCount: (yield* Queue.clear(calls)).length,
          }).toStrictEqual({
            retainedNetPayCount: 1,
            calculationCount: 1,
          });
          return { payInput: savedPayInput };
        }).pipe(Effect.withSpan("NativePair.verifyRecalculation"));
        yield* Effect.gen(function* verifyCalculationFailure() {
          yield* Effect.promise(() =>
            page.route(isCalculation, (route) =>
              route.fulfill({
                body: "",
                headers: { "access-control-allow-origin": websiteOrigin },
                status: 503,
              })
            )
          );
          yield* Effect.promise(() => payInput.fill("2000"));
          yield* Effect.promise(() =>
            page.getByRole("button", { exact: true, name: "Calculate" }).click()
          );
          yield* Effect.promise(() =>
            page.getByRole("alert").waitFor({ timeout: 5000 })
          );
          const retainedResultText = yield* Effect.promise(() =>
            page
              .getByRole("status", { name: "Calculation result" })
              .textContent()
          );
          Array.forEach((marker: string) => {
            expect(retainedResultText).toContain(marker);
          })(["$1,301.00", "This answer is out of date."]);
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
          expect({
            retainedNetPayCount: yield* Effect.promise(() =>
              page.getByText("$1,301.00", { exact: true }).count()
            ),
            QueueClearCalls: yield* Queue.clear(calls),
          }).toStrictEqual({
            retainedNetPayCount: 1,
            QueueClearCalls: [],
          });
        }).pipe(Effect.withSpan("NativePair.verifyCalculationFailure"));
        const { plainPage } = yield* Effect.gen(
          function* verifyCalculatorVariants() {
            yield* Effect.logInfo("native-pair: no JavaScript");
            const noJavaScript = yield* Effect.acquireRelease(
              Effect.promise(() =>
                browser.newContext({ javaScriptEnabled: false })
              ),
              (value) => Effect.promise(() => value.close())
            );
            const pageWithoutJavaScript = yield* Effect.promise(() =>
              noJavaScript.newPage()
            );
            yield* Effect.promise(() =>
              pageWithoutJavaScript.goto(websiteOrigin)
            );
            // The complete calculator navigation must already exist in SSR. No
            // JavaScript catalogue refresh can supply these links after hydration.
            yield* Effect.forEach(
              [
                { href: "/", title: "AU take-home pay" },
                {
                  href: "/calculators/au.pay.withholdings",
                  title: "AU pay withholdings",
                },
                {
                  href: "/calculators/au.income-tax.annual",
                  title: "AU annual income tax",
                },
              ],
              ({ href, title }) =>
                Effect.gen(function* () {
                  const link = pageWithoutJavaScript
                    .getByRole("navigation", {
                      exact: true,
                      name: "Calculators",
                    })
                    .getByRole("link", { exact: true, name: title });
                  expect(yield* Effect.promise(() => link.count())).toBe(1);
                  expect(
                    yield* Effect.promise(() => link.getAttribute("href"))
                  ).toBe(href);
                })
            );
            // Without JavaScript the page explains that calculators need it.
            yield* Effect.promise(() =>
              pageWithoutJavaScript
                .getByText("Turn on JavaScript to use this calculator.", {
                  exact: true,
                })
                .waitFor({ timeout: 5000 })
            );
            // Both remaining pages use the deployed calculator summaries and
            // submit to the real API. No browser fixture supplies these answers.
            yield* EffectFunction.pipe(
              [
                {
                  amount: "9500",
                  answer: "$2,756.00",
                  breakdown: "Withholding breakdown",
                  error: "Enter a valid pay amount and pay period.",
                  id: "au.pay.withholdings",
                  label: "Pay before tax ($)",
                  title: "AU pay withholdings",
                },
                {
                  amount: "67000",
                  answer: "$12,228.00",
                  breakdown: "Annual tax breakdown",
                  error: "Enter a valid annual taxable income.",
                  id: "au.income-tax.annual",
                  label: "Annual taxable income ($)",
                  title: "AU annual income tax",
                },
              ] as const,
              Effect.forEach((calculator) =>
                Effect.gen(function* () {
                  yield* Effect.promise(() => page.unroute(isCalculation));
                  yield* Effect.promise(() =>
                    page
                      .locator(`nav a[href="/calculators/${calculator.id}"]`)
                      .click()
                  );
                  yield* Effect.promise(() =>
                    page
                      .getByRole("heading", {
                        exact: true,
                        name: calculator.title,
                      })
                      .waitFor({ timeout: 5000 })
                  );
                  const idleResult = yield* Effect.promise(() =>
                    page
                      .getByRole("status", { name: "Calculation result" })
                      .textContent()
                  );
                  const calculatorInput = page.getByLabel(calculator.label);
                  yield* Effect.promise(() =>
                    calculatorInput.fill(calculator.amount)
                  );
                  expect({
                    result: idleResult,
                    requests: yield* Queue.clear(calls),
                  }).toStrictEqual({ result: "", requests: [] });
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

                  yield* Effect.promise(() =>
                    page
                      .getByText("How this answer was worked out", {
                        exact: true,
                      })
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
                  expect({
                    hasSources:
                      (yield* Effect.promise(() =>
                        page
                          .locator(".calculation-details a[href^='https://']")
                          .count()
                      )) > 0,
                    requestCount: (yield* Queue.clear(calls)).length,
                  }).toStrictEqual({ hasSources: true, requestCount: 1 });
                  yield* Effect.promise(() =>
                    page.screenshot({
                      fullPage: true,
                      path: path.join(screenshotRoot, `${calculator.id}.png`),
                    })
                  );
                  yield* Effect.promise(() => calculatorInput.fill("30000"));
                  const retainedResultText = yield* Effect.promise(() =>
                    page
                      .getByRole("status", { name: "Calculation result" })
                      .textContent()
                  );
                  Array.forEach((marker: string) => {
                    expect(retainedResultText).toContain(marker);
                  })([calculator.answer, "This answer is out of date."]);
                  expect(yield* Queue.clear(calls)).toStrictEqual([]);
                  yield* Effect.promise(() =>
                    page.route(
                      isCalculation,
                      (route) =>
                        route.fulfill({
                          body: "",
                          headers: {
                            "access-control-allow-origin": websiteOrigin,
                          },
                          status: 503,
                        }),
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
                  expect({
                    retainsAnswer: (yield* Effect.promise(() =>
                      page
                        .getByRole("status", { name: "Calculation result" })
                        .textContent()
                    ))?.includes(calculator.answer),
                    requestCount: (yield* Queue.clear(calls)).length,
                  }).toStrictEqual({ retainsAnswer: true, requestCount: 1 });

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
                  expect({
                    retainsAnswer: (yield* Effect.promise(() =>
                      page
                        .getByRole("status", { name: "Calculation result" })
                        .textContent()
                    ))?.includes(calculator.answer),
                    requestCount: (yield* Queue.clear(calls)).length,
                  }).toStrictEqual({ retainsAnswer: true, requestCount: 0 });

                  return yield* Effect.void;
                })
              )
            );
            return { plainPage: pageWithoutJavaScript };
          }
        ).pipe(Effect.withSpan("NativePair.verifyCalculatorVariants"));
        yield* Effect.gen(function* verifyAgentGuide() {
          yield* Effect.promise(() =>
            page
              .getByRole("link", {
                exact: true,
                name: "For agents: API access",
              })
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
          expect(
            yield* Effect.promise(() =>
              page
                .getByRole("link", { exact: true, name: `${apiOrigin}/mcp` })
                .getAttribute("href")
            )
          ).toBe(`${apiOrigin}/mcp`);
          yield* Effect.promise(() =>
            page
              .getByRole("link", {
                exact: true,
                name: "Agent connection guide and tool list",
              })
              .click()
          );
          yield* Effect.promise(() =>
            page
              .getByRole("heading", {
                exact: true,
                name: "Agent connection guide",
              })
              .waitFor({ timeout: 5000 })
          );
          const guideText = yield* Effect.promise(() =>
            page.locator("main").textContent()
          );
          Array.forEach((marker: string) => {
            expect(guideText).toContain(marker);
          })([
            "https://api.taxkit.dev/mcp",
            "taxkit_get_calculator_schema",
            "five-second limit",
            "taxkit_calculate_visible_form",
          ]);
          const guideMarkdown = yield* Effect.promise(() =>
            page
              .getByRole("link", {
                exact: true,
                name: "Read this page as Markdown",
              })
              .getAttribute("href")
          );
          expect(guideMarkdown).toBe(`${websiteOrigin}/api/agent-tools.md`);
          const guideBody = yield* Effect.gen(function* () {
            const reply = yield* HttpClient.get(
              `${websiteOrigin}/api/agent-tools.md`
            );
            expect({
              replyStatus: reply.status,
              markdownContentType: Headers.get(
                reply.headers,
                "content-type"
              ).pipe(Option.map((value) => value.includes("text/markdown"))),
            }).toStrictEqual({
              replyStatus: 200,
              markdownContentType: Option.some(true),
            });
            return yield* reply.text;
          }).pipe(Effect.provide(FetchHttpClient.layer));
          Array.forEach((marker: string) => {
            expect(guideBody).toContain(marker);
          })([
            "# Agent connection guide",
            "taxkit_get_calculator_schema",
            "five-second limit",
          ]);
        }).pipe(Effect.withSpan("NativePair.verifyAgentGuide"));
        const {
          typescriptSdkReply,
          typescriptSdkBody,
          docsNavigationReply,
          docsNavigationBody,
        } = yield* Effect.gen(function* captureDocumentationReplies() {
          // Documentation reads use the API's own public routes. Read the actual
          // replies the browser will receive for later corrupted-reply checks.
          const sdkReply = yield* Effect.promise(() =>
            publicApi.dispatchFetch(docsPageAddress("/sdk/typescript-sdk"), {
              headers: { origin: websiteOrigin },
            })
          );
          expect({
            status: sdkReply.status,
            accessControlAllowOrigin: sdkReply.headers.get(
              "access-control-allow-origin"
            ),
          }).toStrictEqual({
            status: 200,
            accessControlAllowOrigin: websiteOrigin,
          });
          const sdkBody = yield* Effect.promise(() => sdkReply.text());
          expect(sdkBody).toContain('"markdown":');
          const navigationReply = yield* Effect.promise(() =>
            publicApi.dispatchFetch(docsNavigationAddress, {
              headers: { origin: websiteOrigin },
            })
          );
          expect(navigationReply.status).toBe(200);
          const navigationBody = yield* Effect.promise(() =>
            navigationReply.text()
          );
          expect(navigationBody).toContain('"primaryNavigation":');
          // Invalid page addresses are rejected by the API and give the Website's
          // native not-found page; neither reflects a framework error.
          yield* Effect.forEach(
            [`/${"a".repeat(256)}`, `../${frameworkSentinel}`],
            (invalidPath) =>
              Effect.gen(function* () {
                const response = yield* Effect.promise(() =>
                  publicApi.dispatchFetch(docsPageAddress(invalidPath))
                );
                expect(response.status, invalidPath).toBe(400);
                expect({
                  responseHeadersGetCacheControl:
                    response.headers.get("cache-control"),
                  EffectPromiseResponseText: yield* Effect.promise(() =>
                    response.text()
                  ),
                }).toStrictEqual({
                  responseHeadersGetCacheControl: "no-store",
                  EffectPromiseResponseText: "",
                });
              })
          );
          yield* Effect.forEach(
            [
              `/${"a".repeat(256)}`,
              `/..%2F${frameworkSentinel}`,
              "/start/missing",
            ],
            (address) =>
              Effect.gen(function* () {
                const response = yield* Effect.promise(() =>
                  website.dispatchFetch(`${websiteOrigin}${address}`, {
                    headers: { accept: "text/html" },
                  })
                );
                expect(response.status, address).toBe(404);
                EffectFunction.pipe(
                  response.headers.get("cache-control"),
                  (actual) => {
                    expect(actual).toBe("no-store");
                  }
                );
                const html = yield* Effect.promise(() => response.text());
                expect(html).toContain("Documentation page not found");
                expect(html).not.toContain("Server Fn Error");
              })
          );
          return {
            typescriptSdkReply: sdkReply,
            typescriptSdkBody: sdkBody,
            docsNavigationReply: navigationReply,
            docsNavigationBody: navigationBody,
          };
        }).pipe(Effect.withSpan("NativePair.captureDocumentationReplies"));
        const { docsPage, docsCalls, docsDocuments, docsRequests } =
          yield* Effect.gen(function* verifyAccessibleDocumentation() {
            const documentationPage = yield* Effect.promise(() =>
              context.newPage()
            );
            const parsedSitemap = yield* Effect.promise(() =>
              documentationPage.evaluate((xml) => {
                const document = new DOMParser().parseFromString(
                  xml,
                  "application/xml"
                );
                return {
                  hasParserError:
                    document.querySelectorAll("parsererror").length > 0,
                  locationCount: document.querySelectorAll("loc").length,
                  locationText: document.documentElement.textContent ?? "",
                  namespace: document.documentElement.namespaceURI,
                };
              }, discoverySitemap.body)
            );
            expect({
              sitemapParsed: !parsedSitemap.hasParserError,
              sitemapDocument: {
                parsedSitemapNamespace: parsedSitemap.namespace,
                parsedSitemapLocationCount: parsedSitemap.locationCount,
              },
              parsedSitemapLocationTextTrimSplitSU: parsedSitemap.locationText
                .trim()
                .split(/\s+/u),
            }).toStrictEqual({
              sitemapParsed: true,
              sitemapDocument: {
                parsedSitemapNamespace:
                  "http://www.sitemaps.org/schemas/sitemap/0.9",
                parsedSitemapLocationCount: 62,
              },
              parsedSitemapLocationTextTrimSplitSU: EffectFunction.pipe(
                publicContent.pages,
                Array.map((item) => `${websiteOrigin}${item.path}`)
              ),
            });
            documentationPage.on("pageerror", (error) =>
              Queue.offerUnsafe(exceptions, error.message)
            );
            const documentationCalls = yield* Queue.make<string>();
            const documentRequests = yield* Queue.make<string>();
            // Record every documentation API read and any retired transport call.
            const apiRequests = yield* Queue.make<BrowserRequest>();
            documentationPage.on("request", (request) => {
              const url = new URL(request.url());
              if (
                (url.origin === apiOrigin &&
                  url.pathname.startsWith("/api/v1/docs/")) ||
                url.pathname.startsWith("/_serverFn")
              ) {
                Queue.offerUnsafe(
                  documentationCalls,
                  `${request.method()} ${request.url()}`
                );
                Queue.offerUnsafe(apiRequests, request);
              }
              if (
                request.isNavigationRequest() &&
                request.frame() === documentationPage.mainFrame()
              ) {
                Queue.offerUnsafe(documentRequests, request.url());
              }
            });
            yield* Effect.promise(() =>
              documentationPage.goto(`${websiteOrigin}/start/quickstart`)
            );
            yield* Effect.promise(() =>
              documentationPage.waitForLoadState("networkidle")
            );
            expect({
              mainLandmarks: {
                EffectPromiseDocsPageLocatorMainCount: yield* Effect.promise(
                  () => documentationPage.locator("main").count()
                ),
                pageHeadingCount: yield* Effect.promise(() =>
                  documentationPage.locator(".docs-article h1").count()
                ),
              },
              headingUnfocused: !(yield* Effect.promise(() =>
                documentationPage
                  .locator(".docs-article h1")
                  .evaluate((heading) => heading === document.activeElement)
              )),
              articleLandmarks: {
                articleCount: yield* Effect.promise(() =>
                  documentationPage.getByRole("article").count()
                ),
                documentationNavigationCount: yield* Effect.promise(() =>
                  documentationPage
                    .getByRole("navigation", {
                      exact: true,
                      name: "Documentation",
                    })
                    .count()
                ),
              },
              bodyFocused: yield* Effect.promise(() =>
                documentationPage.evaluate(
                  () => document.activeElement === document.body
                )
              ),
            }).toStrictEqual({
              mainLandmarks: {
                EffectPromiseDocsPageLocatorMainCount: 1,
                pageHeadingCount: 1,
              },
              headingUnfocused: true,
              articleLandmarks: {
                articleCount: 1,
                documentationNavigationCount: 1,
              },
              bodyFocused: true,
            });
            yield* expectReadableText({
              page: documentationPage,
              selector: ".docs-article p",
            });
            yield* expectReadableText({
              page: documentationPage,
              selector: ".docs-navigation-panel summary",
            });
            yield* Effect.promise(() =>
              documentationPage.keyboard.press("Tab")
            );
            expect(
              yield* Effect.promise(() =>
                documentationPage
                  .getByRole("link", { exact: true, name: "Skip to content" })
                  .evaluate((element) => element === document.activeElement)
              )
            ).toBeTruthy();
            yield* Effect.promise(() =>
              documentationPage.keyboard.press("Enter")
            );
            expect(
              yield* Effect.promise(() =>
                documentationPage
                  .getByRole("main")
                  .evaluate((element) => element === document.activeElement)
              )
            ).toBeTruthy();
            yield* Effect.promise(() =>
              documentationPage.emulateMedia({ reducedMotion: "reduce" })
            );
            const motionElements = documentationPage.locator(
              ".app-shell, .docs-layout, .docs-navigation-panel, .docs-navigation, .docs-article"
            );
            const motionCount = yield* Effect.promise(() =>
              motionElements.count()
            );
            expect(motionCount).toBeGreaterThan(0);
            yield* Effect.forEach(Array.range(0, motionCount - 1), (index) =>
              Effect.gen(function* () {
                const style = yield* Effect.promise(() =>
                  motionElements.nth(index).evaluate((element) => {
                    const computed = getComputedStyle(element);
                    return {
                      animationName: computed.animationName,
                      transitionDuration: computed.transitionDuration,
                    };
                  })
                );
                expect(style).toStrictEqual({
                  animationName: "none",
                  transitionDuration: "0s",
                });
              })
            );
            yield* Effect.promise(() =>
              documentationPage.emulateMedia({ reducedMotion: "no-preference" })
            );
            return {
              docsPage: documentationPage,
              docsCalls: documentationCalls,
              docsDocuments: documentRequests,
              docsRequests: apiRequests,
            };
          }).pipe(Effect.withSpan("NativePair.verifyAccessibleDocumentation"));
        yield* Effect.gen(function* verifyShareMetadata() {
          const imagePage = yield* Effect.acquireRelease(
            Effect.promise(() => browser.newPage()),
            (resource) => Effect.promise(() => resource.close())
          );
          // Read every actual SSR article with the browser's HTML parser. The
          // checked transport alone cannot satisfy these rendered-body oracles.
          yield* EffectFunction.pipe(
            publicContent.pages,
            Effect.forEach((expected) =>
              Effect.gen(function* () {
                const response = yield* Effect.promise(() =>
                  website.dispatchFetch(`${websiteOrigin}${expected.path}`, {
                    headers: { "x-taxkit-docs-page": "/private9" },
                  })
                );
                const html = yield* Effect.promise(() => response.text());
                const rendered = yield* Effect.promise(() =>
                  docsPage.evaluate((value) => {
                    const document = new DOMParser().parseFromString(
                      value,
                      "text/html"
                    );
                    const article = document.querySelector(".docs-article");
                    return {
                      alternate: document
                        .querySelector(
                          'link[rel="alternate"][type="text/markdown"]'
                        )
                        ?.getAttribute("href"),
                      articleJson:
                        document.querySelector(
                          'script[type="application/ld+json"]'
                        )?.textContent ?? "",
                      canonical: document
                        .querySelector('link[rel="canonical"]')
                        ?.getAttribute("href"),
                      description: document
                        .querySelector('meta[name="description"]')
                        ?.getAttribute("content"),
                      heading: article?.querySelector("h1")?.textContent,
                      image: document
                        .querySelector('meta[property="og:image"]')
                        ?.getAttribute("content"),
                      imageHeight: document
                        .querySelector('meta[property="og:image:height"]')
                        ?.getAttribute("content"),
                      imageWidth: document
                        .querySelector('meta[property="og:image:width"]')
                        ?.getAttribute("content"),
                      markdown: article
                        ?.querySelector(".docs-markdown-link a")
                        ?.getAttribute("href"),
                      navigation:
                        document.querySelectorAll(".docs-navigation a").length,
                      text: article?.textContent,
                      title: document.title,
                      twitterCard: document
                        .querySelector('meta[name="twitter:card"]')
                        ?.getAttribute("content"),
                    };
                  }, html)
                );
                const article = yield* Schema.decodeEffect(TechArticleJson)(
                  rendered.articleJson
                );
                expect({
                  headline: article.headline,
                  description: article.description,
                  url: article.url.href,
                  image: article.image.href,
                }).toStrictEqual({
                  headline: expected.frontmatter.title,
                  description: expected.frontmatter.description,
                  url: `${websiteOrigin}${expected.path}`,
                  image: `${websiteOrigin}${docsImagePath(expected.path)}`,
                });
                // Browser-native decode returns its own Promise at this required
                // Playwright host callback. No renderer runs in the browser.
                yield* Effect.promise(() =>
                  imagePage.setContent(
                    `<img id="docs-image-proof" src="${article.image.href}">`
                  )
                );
                yield* Effect.promise(() =>
                  imagePage
                    .locator("#docs-image-proof")
                    .evaluate((image: HTMLImageElement) => image.decode())
                );
                expect(
                  yield* Effect.promise(() =>
                    imagePage
                      .locator("#docs-image-proof")
                      .evaluate((image: HTMLImageElement) => ({
                        height: image.naturalHeight,
                        width: image.naturalWidth,
                      }))
                  )
                ).toStrictEqual(docsOgImageSize);
                const {
                  articleJson: _articleJson,
                  text: _text,
                  ...metadata
                } = rendered;
                expect({
                  status: response.status,
                  vary: response.headers.get("vary"),
                  metadata,
                }).toStrictEqual({
                  status: 200,
                  vary: "Accept",
                  metadata: {
                    heading: expected.frontmatter.title,
                    title: `${expected.frontmatter.title} | TaxKit`,
                    description: expected.frontmatter.description,
                    canonical: `${websiteOrigin}${expected.path}`,
                    alternate: `${websiteOrigin}${expected.path}.md`,
                    markdown: `${websiteOrigin}${expected.path}.md`,
                    navigation: 62,
                    image: article.image.href,
                    imageWidth: String(docsOgImageSize.width),
                    imageHeight: String(docsOgImageSize.height),
                    twitterCard: "summary_large_image",
                  },
                });
                expect(rendered.text?.length).toBeGreaterThan(100);
                expect(rendered.text).not.toContain(
                  "Documentation could not load"
                );
              })
            )
          );
        }).pipe(Effect.withSpan("NativePair.verifyShareMetadata"));
        yield* Effect.gen(function* verifyDocumentationRepresentations() {
          yield* Effect.promise(() =>
            docsPage
              .getByRole("link", { name: "Read this page as Markdown" })
              .click()
          );
          EffectFunction.pipe(docsPage.url(), (actual) => {
            expect(actual).toBe(`${websiteOrigin}/start/quickstart.md`);
          });
          expect(
            yield* Effect.promise(() => docsPage.locator("pre").textContent())
          ).toBe(quickstart.markdown);
          yield* Effect.promise(() =>
            docsPage.goto(`${websiteOrigin}/start/quickstart`)
          );
          yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
          const missing = yield* Effect.promise(() =>
            website.dispatchFetch(`${websiteOrigin}/private9`)
          );
          expect(missing.status).toBe(404);
          const missingHtml = yield* Effect.promise(() => missing.text());
          expect(missingHtml).toContain("Documentation page not found");
          expect(missingHtml).not.toContain(
            "The documentation page was not found."
          );
          // Each broken-docs fixture pair gets its own host. Serialising all of
          // them with the Website made one config too large for its startup bound.
          yield* EffectFunction.pipe(
            docsFixtureWorkers,
            Effect.forEach(({ mode, workers }) =>
              Effect.gen(function* () {
                const fixture = yield* Effect.acquireRelease(
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
                        port: 0,
                        workers,
                      })
                  ),
                  (host) => Effect.promise(() => host.dispose())
                );
                yield* Effect.promise(() => fixture.ready).pipe(
                  Effect.timeout("10 seconds")
                );
                const worker = yield* Effect.promise(() =>
                  fixture.getWorker(`taxkit-website-docs-${mode}`)
                );
                const response = yield* Effect.promise(() =>
                  worker.fetch(`${websiteOrigin}/start/quickstart`)
                );
                const html = yield* Effect.promise(() => response.text());
                // The server checks that the API page is the requested address
                // before rendering and fails closed through TanStack's native
                // route error egress.
                expect(response.status, mode).toBe(500);
                EffectFunction.pipe(
                  response.headers.get("cache-control"),
                  (actual) => {
                    expect(actual).toBe("no-store");
                  }
                );
                expect(html).toContain("Documentation could not load");
                Array.forEach((marker: string) => {
                  expect(html).not.toContain(marker);
                })(["PRIVATE9", "private9.mdx", "DocsPresentationUnavailable"]);
              })
            )
          );
        }).pipe(
          Effect.withSpan("NativePair.verifyDocumentationRepresentations")
        );
        yield* Effect.gen(function* verifyClientNavigation() {
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
          expect({
            headingFocused: yield* Effect.promise(() =>
              docsPage
                .locator(".docs-article h1")
                .evaluate((heading) => heading === document.activeElement)
            ),
            currentNavigationHref: yield* Effect.promise(() =>
              docsPage
                .locator('.docs-navigation [aria-current="page"]')
                .getAttribute("href")
            ),
            documentationRequests: EffectFunction.pipe(
              yield* Queue.clear(docsCalls),
              Array.sort(Order.String)
            ),
          }).toStrictEqual({
            headingFocused: true,
            currentNavigationHref: "/sdk/typescript-sdk",
            documentationRequests: [
              `GET ${docsNavigationAddress}`,
              `GET ${docsPageAddress("/sdk/typescript-sdk")}`,
            ],
          });
          // Direct public reads omit credentials and trace correlation.
          const docsHeaders = yield* EffectFunction.pipe(
            yield* Queue.clear(docsRequests),
            Effect.forEach((request) =>
              Effect.promise(() => request.allHeaders())
            )
          );
          expect({
            headerCount: docsHeaders.length,
            privateHeadersAbsent: EffectFunction.pipe(
              docsHeaders,
              Array.every(
                (headers) =>
                  !Record.has(headers, "cookie") &&
                  !Record.has(headers, "b3") &&
                  !Record.has(headers, "traceparent")
              )
            ),
            QueueClearDocsDocuments: yield* Queue.clear(docsDocuments),
          }).toStrictEqual({
            headerCount: 2,
            privateHeadersAbsent: true,
            QueueClearDocsDocuments: [],
          });
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
          expect({
            documentationRequests: EffectFunction.pipe(
              yield* Queue.clear(docsCalls),
              Array.sort(Order.String)
            ),
            QueueClearDocsDocuments: yield* Queue.clear(docsDocuments),
          }).toStrictEqual({
            documentationRequests: [
              `GET ${docsNavigationAddress}`,
              `GET ${docsPageAddress("/sdk/plain-sdk")}`,
            ],
            QueueClearDocsDocuments: [],
          });
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
            docsPage.evaluate(() => {
              window.scrollTo(0, 0);
            })
          );
          yield* Effect.promise(() =>
            docsPage.screenshot({
              fullPage: true,
              path: path.join(screenshotRoot, "docs-desktop.png"),
            })
          );
        }).pipe(Effect.withSpan("NativePair.verifyClientNavigation"));
        yield* Effect.gen(function* verifyMobileNavigation() {
          yield* Effect.promise(() =>
            docsPage.setViewportSize({ height: 844, width: 390 })
          );
          expect(
            yield* Effect.promise(() =>
              docsPage.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth
              )
            )
          ).toBeTruthy();
          yield* Effect.promise(() =>
            docsPage.locator(".docs-navigation-panel summary").focus()
          );
          yield* expectReadableText({
            page: docsPage,
            selector: ".docs-navigation-panel summary",
          });
          yield* Effect.promise(() => docsPage.keyboard.press("Enter"));
          expect(
            yield* Effect.promise(() =>
              docsPage.locator(".docs-navigation-panel").getAttribute("open")
            )
          ).toBeNull();
          yield* Effect.promise(() =>
            docsPage.evaluate(() => {
              window.scrollTo(0, 0);
            })
          );
          yield* Effect.promise(() =>
            docsPage.screenshot({
              fullPage: true,
              path: path.join(screenshotRoot, "docs-mobile.png"),
            })
          );
        }).pipe(Effect.withSpan("NativePair.verifyMobileNavigation"));
        yield* Effect.gen(function* verifyNavigationWithoutJavaScript() {
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
        }).pipe(
          Effect.withSpan("NativePair.verifyNavigationWithoutJavaScript")
        );
        yield* Effect.gen(function* verifyResponsiveTablesAndDiagrams() {
          yield* Effect.promise(() =>
            docsPage.goto(`${websiteOrigin}/contributing/what-are-you-changing`)
          );
          yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
          yield* Effect.promise(() =>
            docsPage.locator(".docs-navigation-panel summary").click()
          );
          expect({
            fitsViewport: yield* Effect.promise(() =>
              docsPage.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth
              )
            ),
            diagramLoaded: yield* Effect.promise(() =>
              docsPage
                .getByRole("img", {
                  name: "Which contribution guide matches your change",
                })
                .evaluate(
                  (image: HTMLImageElement) =>
                    image.complete && image.naturalWidth > 0
                )
            ),
          }).toStrictEqual({
            fitsViewport: true,
            diagramLoaded: true,
          });
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
          ).toBeTruthy();
          yield* Effect.promise(() => docsPage.keyboard.press("ArrowRight"));
          yield* Effect.promise(() =>
            docsPage.evaluate(() => {
              window.scrollTo(0, 0);
            })
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
            docsPage.evaluate(() => {
              window.scrollTo(0, 0);
            })
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
        }).pipe(
          Effect.withSpan("NativePair.verifyResponsiveTablesAndDiagrams")
        );
        yield* Effect.gen(function* verifyMalformedPageRecovery() {
          // An undecodable API reply is contained by the documentation route.
          yield* Effect.promise(() =>
            docsPage.route(
              docsPageAddress("/sdk/typescript-sdk"),
              (route) =>
                route.fulfill({
                  body: typescriptSdkBody.replace('"markdown":', '"PRIVATE9":'),
                  headers: Record.fromEntries(typescriptSdkReply.headers),
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
          yield* expectReadableText({
            page: docsPage,
            selector: ".docs-state p",
          });
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
          // The Quickstart link is a full page load and its heading is in the
          // server HTML. Wait for hydration, or the next click bypasses the
          // intercepted reply as a server-rendered document navigation.
          yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
          yield* Effect.promise(() =>
            docsPage.goto(`${websiteOrigin}/start/quickstart`)
          );
          yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
        }).pipe(Effect.withSpan("NativePair.verifyMalformedPageRecovery"));
        yield* Effect.gen(function* verifySearchNavigation() {
          yield* Queue.clear(docsCalls);
          yield* Queue.clear(docsDocuments);
          yield* Effect.promise(() =>
            docsPage
              .getByRole("link", { exact: true, name: "Search documentation" })
              .click()
          );
          yield* Effect.promise(() =>
            docsPage
              .getByRole("heading", {
                exact: true,
                name: "Search documentation",
              })
              .waitFor()
          );
          // An empty search reads only the navigation, directly from the API.
          expect(yield* Queue.clear(docsCalls)).toStrictEqual([
            `GET ${docsNavigationAddress}`,
          ]);
          yield* Queue.clear(docsRequests);
          expect({
            QueueClearDocsDocuments: yield* Queue.clear(docsDocuments),
            searchPromptCount: yield* Effect.promise(() =>
              docsPage
                .getByText("Enter a few words to find a documentation page.")
                .count()
            ),
          }).toStrictEqual({
            QueueClearDocsDocuments: [],
            searchPromptCount: 1,
          });
        }).pipe(Effect.withSpan("NativePair.verifySearchNavigation"));
        yield* Effect.gen(function* verifySearchInputBoundaries() {
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
                    docsPage.locator(".docs-search-results li").count()
                  )
                ).toBeLessThanOrEqual(20);
                expect({
                  term: yield* Effect.promise(() =>
                    docsPage
                      .getByRole("searchbox", { name: "Search words" })
                      .inputValue()
                  ),
                  titles: yield* Effect.promise(() =>
                    docsPage
                      .locator(".docs-search-results h3 a")
                      .allTextContents()
                  ),
                  robots: yield* Effect.promise(() =>
                    docsPage
                      .locator('meta[name="robots"]')
                      .getAttribute("content")
                  ),
                }).toStrictEqual({
                  term,
                  titles: EffectFunction.pipe(
                    expected,
                    Array.map((item) => item.title)
                  ),
                  robots: "noindex, follow",
                });
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
              `?term=${EffectFunction.pipe("a".repeat(1201), encodeURIComponent)}`,
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
          expect({
            unavailableSearchStatus: unavailableSearch.status,
            unavailableSearchHeadersGetCacheControl:
              unavailableSearch.headers.get("cache-control"),
            unavailableSearchCdnCache: unavailableSearch.headers.get(
              "cloudflare-cdn-cache-control"
            ),
          }).toStrictEqual({
            unavailableSearchStatus: 503,
            unavailableSearchHeadersGetCacheControl: "no-store",
            unavailableSearchCdnCache: "no-store",
          });
          expect(
            yield* Effect.promise(() => unavailableSearch.text())
          ).toContain(
            "Documentation search could not load. Please reload this page to try again."
          );
        }).pipe(Effect.withSpan("NativePair.verifySearchInputBoundaries"));
        yield* Effect.gen(function* verifySearchInteraction() {
          yield* Effect.promise(() => docsPage.goto(`${websiteOrigin}/search`));
          yield* Effect.promise(() =>
            docsPage
              .getByRole("searchbox", { name: "Search words" })
              .pressSequentially("Quickstart")
          );
          yield* Effect.promise(() =>
            docsPage
              .getByRole("button", {
                exact: true,
                name: "Search documentation",
              })
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
            docsPage.evaluate(() => {
              window.scrollTo(0, 0);
            })
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
          ).toBeTruthy();
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
            docsPage.evaluate(() => {
              window.scrollTo(0, 0);
            })
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
            docsPage
              .locator(".docs-article h1")
              .evaluate((element) => document.activeElement === element)
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
        }).pipe(Effect.withSpan("NativePair.verifySearchInteraction"));
        yield* Effect.gen(function* verifySearchWithoutJavaScript() {
          yield* Effect.promise(() =>
            plainPage.goto(`${websiteOrigin}/search`)
          );
          yield* Effect.promise(() =>
            plainPage
              .getByRole("searchbox", { name: "Search words" })
              .pressSequentially("Quickstart")
          );
          yield* Effect.promise(() =>
            plainPage
              .getByRole("button", {
                exact: true,
                name: "Search documentation",
              })
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
        }).pipe(Effect.withSpan("NativePair.verifySearchWithoutJavaScript"));
        yield* Effect.gen(function* verifyMalformedNavigationRecovery() {
          yield* Effect.promise(() =>
            docsPage.goto(`${websiteOrigin}/start/quickstart`)
          );
          yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
          // An undecodable navigation reply is contained by the search route.
          yield* Effect.promise(() =>
            docsPage.route(
              docsNavigationAddress,
              (route) =>
                route.fulfill({
                  body: docsNavigationBody.replace(
                    '"primaryNavigation":',
                    '"PRIVATE9":'
                  ),
                  headers: Record.fromEntries(docsNavigationReply.headers),
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
            yield* Effect.promise(() =>
              docsPage.getByRole("alert").textContent()
            )
          ).toContain("Documentation search could not load.");
          expect(
            yield* Effect.promise(() =>
              docsPage.getByRole("alert").textContent()
            )
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
        }).pipe(
          Effect.withSpan("NativePair.verifyMalformedNavigationRecovery")
        );
        yield* Effect.gen(function* verifyHostTelemetry() {
          expect(yield* Queue.clear(exceptions)).toStrictEqual([]);
          const capturedLogs = yield* Queue.clear(logs);
          const logText = yield* Schema.encodeEffect(Json)(capturedLogs);
          const messageText = yield* Schema.encodeEffect(Json)(
            EffectFunction.pipe(
              capturedLogs,
              Array.map((log) => log.message)
            )
          );
          expect(logText).not.toContain(frameworkSentinel);
          Array.forEach((marker: string) => {
            expect(messageText).not.toContain(marker);
          })(["1654", "130100"]);
        }).pipe(Effect.withSpan("NativePair.verifyHostTelemetry"));
      }).pipe(
        Effect.timeout("65 seconds"),
        Effect.scoped,
        Effect.provide(NodeServices.layer)
      ),
    { timeout: 70_000 }
  );
});
