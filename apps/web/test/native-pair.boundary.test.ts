import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { DocsPageUnavailable } from "@taxkit/api-http";
import { TaxKitApi } from "@taxkit/api-http/api";
import {
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyTooLarge,
} from "@taxkit/api-http/request-boundary";
import {
  DescriptorFilterQuery,
  HelpQuery,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import {
  DocsPublicCatalogue,
  DocsPublicPage,
  DocsPublicNavigation,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import {
  WebsiteForwardingCredentialHeader,
  WebsiteForwardingRateKeyHeader,
} from "@taxkit/observability/edge-identity";
import { DocsDiscoveryPath } from "@taxkit/publication/schemas";
import {
  Array,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { FetchHttpClient, Headers, HttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import { chromium } from "playwright";
import type { Page, Request as BrowserRequest } from "playwright";

import { generateDocsImages } from "../scripts/docs-images.build";
import { WebsiteDocsImageBytes } from "../scripts/docs-images.schemas";
import { WebsiteApiUnavailable } from "../src/lib/api/errors";
import {
  docsImagePath,
  WebsiteDocsArticleJson,
  WebsiteDocsImageSize,
} from "../src/lib/docs/social.schemas";
import {
  nativeForwardingFixture,
  nativeForwardingKey,
} from "./native-forwarding.fixture";
import {
  nativeLocalModeFixture,
  nativeRateFixture,
} from "./native-rate.fixture";

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
const expectReadableText = Effect.fnUntraced(function* (
  page: Page,
  selector: string
) {
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
        Array.reduce(
          Array.zipWith(
            channels,
            [0.2126, 0.7152, 0.0722],
            (channel, weight) => {
              const normalised = channel / 255;
              return (
                (normalised <= 0.04045
                  ? normalised / 12.92
                  : ((normalised + 0.055) / 1.055) ** 2.4) * weight
              );
            }
          ),
          0,
          (sum, value) => sum + value
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
            Effect.sync(() => {
              expect(clientCode.includes(marker), marker).toBe(false);
            })
        );
        yield* Effect.forEach(
          [
            "taxkit/WebsiteDocsImageBytes",
            "@takumi-rs",
            "takumi_wasm",
            "Public documentation images could not be built.",
            "taxkit-accepted-doc-images",
          ],
          (marker) =>
            Effect.sync(() => {
              expect(clientCode.includes(marker), marker).toBe(false);
              expect(
                Array.some(Record.values(websiteModules), (module) =>
                  module.contents.includes(marker)
                ),
                marker
              ).toBe(false);
              expect(apiCode.includes(marker), marker).toBe(false);
            })
        );
        expect(
          yield* fs.glob("**/*.wasm", {
            root: path.join(root, "apps/web/dist"),
          })
        ).toEqual([]);
        const logs = yield* Queue.make<WorkerdStructuredLog>();
        const exceptions = yield* Queue.make<string>();
        const apiWorker = (name: string) => ({
          config: {
            compatibilityDate: "2026-10-04",
            compatibilityFlags: ["nodejs_compat"],
            env: {
              ...nativeForwardingFixture,

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
              ...nativeForwardingFixture,
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
              ...nativeForwardingFixture,
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
              return {
                mode,
                workers: [
                  {
                    config: {
                      ...ordinary.config,
                      manifest: {
                        mainModule: "worker.js",
                        modules,
                        modulesRoot,
                      },
                    },
                  },
                  websiteWorker(`taxkit-website-docs-${mode}`, name),
                ],
              };
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
                ],
              })
          ),
          (host) => Effect.promise(() => host.dispose())
        );
        yield* Effect.logInfo("native-pair: waiting for website");
        yield* Effect.promise(() => website.ready).pipe(
          Effect.timeout("10 seconds")
        );
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
        expect(publicContent.pages).toHaveLength(62);
        // Repeat the actual build-only generator, then compare every fresh
        // output with the already built asset. This checks determinism and
        // Vite's public-copy ordering rather than a separate renderer probe.
        const repeatedImages = yield* generateDocsImages;
        expect(repeatedImages).toHaveLength(publicContent.pages.length);
        const copiedImages = yield* fs.glob("og/**/*.png", {
          root: path.join(root, "apps/web/dist/client"),
        });
        expect(Array.sort(copiedImages, Order.String)).toEqual(
          Array.sort(
            Array.map(publicContent.pages, (page) =>
              docsImagePath(page).slice(1)
            ),
            Order.String
          )
        );
        yield* Effect.forEach(repeatedImages, (image) =>
          Effect.gen(function* () {
            const built = yield* fs
              .readFile(
                path.join(root, "apps/web/dist/client", image.path.slice(1))
              )
              .pipe(Effect.flatMap(Schema.decodeEffect(WebsiteDocsImageBytes)));
            expect(Array.fromIterable(built)).toEqual(
              Array.fromIterable(image.bytes)
            );
            const served = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}${image.path}`)
            );
            expect(served.status).toBe(200);
            expect(served.headers.get("content-type")).toContain("image/png");
            expect(served.headers.get("cache-control")).toBe(
              "public, max-age=0, must-revalidate"
            );
            expect(
              Array.fromIterable(
                new Uint8Array(
                  yield* Effect.promise(() => served.arrayBuffer())
                )
              )
            ).toEqual(Array.fromIterable(built));
            const head = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}${image.path}`, {
                method: "HEAD",
              })
            );
            expect(head.status).toBe(200);
            expect(head.headers.get("content-type")).toBe(
              served.headers.get("content-type")
            );
            expect(head.headers.get("cache-control")).toBe(
              served.headers.get("cache-control")
            );
            expect(yield* Effect.promise(() => head.text())).toBe("");
          })
        );

        // The generated HTTP client restores the same catalogue values across
        // separate actual Worker requests. No authored source or compiler is consulted.
        yield* Effect.gen(function* () {
          const client = yield* HttpApiClient.make(TaxKitApi, {
            baseUrl: apiOrigin,
          });
          expect(yield* client.content.getNavigation()).toEqual(
            publicContent.navigation
          );
          yield* Effect.forEach(publicContent.pages, (page) =>
            Effect.gen(function* () {
              expect(
                yield* client.content.getPage({ query: { path: page.path } })
              ).toEqual(page);
              expect(
                yield* client.content.getMarkdown({
                  query: { path: page.path },
                })
              ).toBe(page.markdown);
            })
          );
          const term = yield* Schema.decodeEffect(DocsSearchTerm)("Quickstart");
          const results = yield* client.content.searchPages({
            query: { term },
          });
          expect(results.length).toBeGreaterThan(0);
          expect(results.length).toBeLessThanOrEqual(20);
          expect(
            Array.every(results, (result) => result.excerpt.length <= 240)
          ).toBe(true);
        }).pipe(Effect.provide(FetchHttpClient.layer));
        // The API's own discovery routes are the reference documents.
        const discoveryDocuments = yield* Effect.forEach(
          DocsDiscoveryPath.literals,
          (documentPath) =>
            Effect.gen(function* () {
              const owned = yield* Effect.promise(() =>
                publicApi.dispatchFetch(
                  `${apiOrigin}/api/v1/docs/discovery${documentPath}`
                )
              );
              expect(owned.status).toBe(200);
              return {
                body: yield* Effect.promise(() => owned.text()),
                contentType: (owned.headers.get("content-type") ?? "").replace(
                  "; charset=utf-8",
                  ""
                ),
                path: documentPath,
              };
            })
        );
        const unavailableDiscoveryWorker = yield* Effect.promise(() =>
          website.getWorker("taxkit-website-unavailable")
        );
        yield* Effect.forEach(discoveryDocuments, (document) =>
          Effect.gen(function* () {
            const served = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}${document.path}`)
            );
            expect(served.status).toBe(200);
            expect(served.headers.get("content-type")).toBe(
              `${document.contentType}; charset=utf-8`
            );
            expect(served.headers.get("cache-control")).toBe(
              publicCache.browser
            );
            expect(served.headers.get("cloudflare-cdn-cache-control")).toBe(
              publicCache.cdn
            );
            expect(served.headers.get("x-content-type-options")).toBe(
              "nosniff"
            );
            expect(yield* Effect.promise(() => served.text())).toBe(
              document.body
            );
            // The Website forwards the API's own discovery route unchanged.
            const owned = yield* Effect.promise(() =>
              publicApi.dispatchFetch(
                `${apiOrigin}/api/v1/docs/discovery${document.path}`
              )
            );
            expect(owned.status).toBe(200);
            expect(owned.headers.get("content-type")).toBe(
              served.headers.get("content-type")
            );
            expect(owned.headers.get("cache-control")).toBe(
              publicCache.browser
            );
            expect(yield* Effect.promise(() => owned.text())).toBe(
              document.body
            );
            const head = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}${document.path}`, {
                method: "HEAD",
              })
            );
            expect(head.status).toBe(200);
            expect(head.headers.get("content-type")).toBe(
              served.headers.get("content-type")
            );
            expect(head.headers.get("cache-control")).toBe(
              served.headers.get("cache-control")
            );
            expect(head.headers.get("cloudflare-cdn-cache-control")).toBe(
              served.headers.get("cloudflare-cdn-cache-control")
            );
            expect(head.headers.get("x-content-type-options")).toBe(
              served.headers.get("x-content-type-options")
            );
            expect(yield* Effect.promise(() => head.text())).toBe("");
            const wrongMethod = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}${document.path}`, {
                body: "PRIVATE9",
                method: "POST",
              })
            );
            expect(wrongMethod.status).toBe(405);
            expect(wrongMethod.headers.get("allow")).toBe("GET, HEAD");
            expect(wrongMethod.headers.get("cache-control")).toBe("no-store");
            expect(yield* Effect.promise(() => wrongMethod.text())).toBe("");
            const query = yield* Effect.promise(() =>
              website.dispatchFetch(
                `${websiteOrigin}${document.path}?PRIVATE9=1`
              )
            );
            expect(query.status).toBe(400);
            expect(yield* Effect.promise(() => query.text())).toBe("");
            const unavailable = yield* Effect.promise(() =>
              unavailableDiscoveryWorker.fetch(
                `${websiteOrigin}${document.path}`
              )
            );
            expect(unavailable.status).toBe(503);
            expect(unavailable.headers.get("cache-control")).toBe("no-store");
            expect(
              unavailable.headers.get("cloudflare-cdn-cache-control")
            ).toBe("no-store");
            expect(yield* Effect.promise(() => unavailable.text())).toBe("");
          })
        );
        const discoveryRobots = yield* Array.findFirst(
          discoveryDocuments,
          (document) => document.path === "/robots.txt"
        ).pipe(Effect.fromOption);
        // Nothing remains behind a retired server-function path.
        expect(discoveryRobots.body).toBe(
          `User-agent: *\nAllow: /\nSitemap: ${websiteOrigin}/sitemap.xml\n`
        );
        const discoverySitemap = yield* Array.findFirst(
          discoveryDocuments,
          (document) => document.path === "/sitemap.xml"
        ).pipe(Effect.fromOption);
        const discoveryIndex = yield* Array.findFirst(
          discoveryDocuments,
          (document) => document.path === "/llms.txt"
        ).pipe(Effect.fromOption);
        const discoveryFull = yield* Array.findFirst(
          discoveryDocuments,
          (document) => document.path === "/llms-full.txt"
        ).pipe(Effect.fromOption);
        expect(discoverySitemap.body).not.toContain("lastmod");
        expect(discoverySitemap.body).not.toContain("/search");
        expect(discoveryIndex.body).not.toContain(".mdx");
        // Exact processed-body comparison preserves useful fenced import/code
        // examples. It must not reject every line beginning with "import".
        yield* Effect.forEach(publicContent.pages, (page) =>
          Effect.sync(() => {
            expect(discoverySitemap.body).toContain(
              `<loc>${websiteOrigin}${page.path}</loc>`
            );
            expect(discoveryIndex.body).toContain(
              `(${apiOrigin}/api/v1/docs/markdown?${new URLSearchParams({ path: page.path }).toString()})`
            );
            expect(discoveryFull.body).toContain(
              `Canonical page: ${websiteOrigin}${page.path}\n\n${page.markdown}`
            );
          })
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
        // Retirement must preserve every authored page address as real HTML,
        // not only a successful Markdown or catalogue lookup.
        yield* Effect.forEach(publicContent.pages, (page) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              website.dispatchFetch(`${websiteOrigin}${page.path}`, {
                headers: { accept: "text/html" },
              })
            );
            expect(response.status, page.path).toBe(200);
            expect(response.headers.get("content-type")).toContain("text/html");
            const html = yield* Effect.promise(() => response.text());
            expect(response.headers.get("cache-control")).toBe(
              publicCache.browser
            );
            expect(response.headers.get("cloudflare-cdn-cache-control")).toBe(
              publicCache.cdn
            );
            expect(html).toContain(`href="${websiteOrigin}${page.path}"`);
            expect(html).toContain(
              `content="${websiteOrigin}/og${page.path}.png"`
            );
            expect(html).toContain('class="docs-article"');
          })
        );
        // Both original page URLs and explicit files must read the owning
        // processed body. A count, copied source or forged native header cannot
        // satisfy these actual built-Worker responses.
        yield* Effect.forEach(publicContent.pages, (page) =>
          Effect.gen(function* () {
            yield* Effect.forEach(["", ".md"] as const, (suffix) =>
              Effect.gen(function* () {
                const address = `${websiteOrigin}${page.path}${suffix}`;
                const headers = {
                  accept: "text/markdown",
                  "x-taxkit-docs-page": "/private9",
                };
                const served = yield* Effect.promise(() =>
                  website.dispatchFetch(address, { headers })
                );
                expect(served.status).toBe(200);
                expect(served.headers.get("content-type")).toBe(
                  "text/markdown; charset=utf-8"
                );
                expect(served.headers.get("cache-control")).toBe(
                  publicCache.browser
                );
                expect(served.headers.get("cloudflare-cdn-cache-control")).toBe(
                  publicCache.cdn
                );
                expect(served.headers.get("vary")).toBe("Accept");
                expect(served.headers.get("x-content-type-options")).toBe(
                  "nosniff"
                );
                expect(served.headers.get("link")).toBe(
                  `<${websiteOrigin}${page.path}>; rel="canonical"; type="text/html"`
                );
                expect(yield* Effect.promise(() => served.text())).toBe(
                  page.markdown
                );
                const head = yield* Effect.promise(() =>
                  website.dispatchFetch(address, { headers, method: "HEAD" })
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
                      expect(head.headers.get(header)).toBe(
                        served.headers.get(header)
                      );
                    })
                );
                expect(yield* Effect.promise(() => head.text())).toBe("");
              })
            );
          })
        );
        const quickstart = yield* Array.findFirst(
          publicContent.pages,
          (page) => page.path === "/start/quickstart"
        ).pipe(Effect.fromOption);
        yield* Effect.forEach(
          [
            {
              accept: "text/markdown;q=0.9, text/html;q=0.7",
              markdown: true,
              status: 200,
            },
            {
              accept: 'application/json;note="a,b;c", text/markdown',
              markdown: true,
              status: 200,
            },
            { accept: "text/markdown;q=0, */*", markdown: false, status: 200 },
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
            { accept: "invalid text/markdown", markdown: false, status: 400 },
            { accept: "text/markdown;q=1.001", markdown: false, status: 400 },
            { accept: "x".repeat(4097), markdown: false, status: 400 },
          ],
          (choice) =>
            Effect.gen(function* () {
              const response = yield* Effect.promise(() =>
                website.dispatchFetch(`${websiteOrigin}/start/quickstart`, {
                  headers: { accept: choice.accept },
                })
              );
              expect(response.status, choice.accept).toBe(choice.status);
              // Every reply at a docs address carries the same Vary set, so Workers
              // Cache keeps the HTML and Markdown variants side by side.
              expect(response.headers.get("vary")).toBe("Accept");
              const body = yield* Effect.promise(() => response.text());
              if (choice.status !== 200) {
                // Negotiation answers are stored as their own public variant
                // so they never evict the page's cached HTML.
                expect(response.headers.get("cache-control")).toBe(
                  "public, max-age=0"
                );
                expect(
                  response.headers.get("cloudflare-cdn-cache-control")
                ).toBe("public, max-age=604800, stale-if-error=0");
                expect(body).toBe("");
              } else if (choice.markdown) {
                expect(body).toBe(quickstart.markdown);
              } else {
                expect(response.headers.get("content-type")).toContain(
                  "text/html"
                );
                expect(body).toContain("docs-article");
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
          quickstart.markdown
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
            { address: "/private9", method: "GET", status: 404 },
            { address: "/search.md", method: "GET", status: 404 },
            { address: "/agents.md", method: "GET", status: 404 },
            { address: "/start/quickstart.md", method: "POST", status: 405 },
            { address: "/start/quickstart.md", method: "PUT", status: 405 },
            { address: "/start/quickstart", method: "POST", status: 404 },
          ],
          (invalid) =>
            Effect.gen(function* () {
              const response = yield* Effect.promise(() =>
                website.dispatchFetch(`${websiteOrigin}${invalid.address}`, {
                  headers: { accept: "text/markdown" },
                  method: invalid.method,
                })
              );
              expect(response.status).toBe(invalid.status);
              if (invalid.status === 405) {
                expect(response.headers.get("allow")).toBe("GET, HEAD");
              }
              expect(yield* Effect.promise(() => response.text())).toBe("");
            })
        );
        yield* Effect.forEach(["", ".md"] as const, (suffix) =>
          Effect.gen(function* () {
            const unavailable = yield* Effect.promise(() =>
              unavailableDiscoveryWorker.fetch(
                `${websiteOrigin}/start/quickstart${suffix}`,
                {
                  headers: { accept: "text/markdown" },
                }
              )
            );
            expect(unavailable.status).toBe(503);
            expect(unavailable.headers.get("cache-control")).toBe("no-store");
            expect(yield* Effect.promise(() => unavailable.text())).toBe("");
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
          const { calculatorApi } = yield* HttpApiClient.make(TaxKitApi, {
            baseUrl: apiOrigin,
          });
          const catalogue = yield* calculatorApi.listCalculators({
            query: MetadataQuery.make({}),
          });
          const pay = Array.findFirst(
            catalogue.calculators,
            (calculator) => calculator.calculatorId === "au.pay.take-home"
          ).pipe(
            Option.getOrElse(() => expect.fail("Missing retained calculator"))
          );
          const params = { calculatorId: pay.calculatorId };
          expect(
            yield* calculatorApi.getCalculator({
              params,
              query: HelpQuery.make({}),
            })
          ).toEqual(pay);
          const schema = yield* calculatorApi.getCalculatorSchema({
            params,
            query: HelpQuery.make({}),
          });
          expect(schema.calculator).toEqual(pay);
          expect(schema.inputFacts.length).toBeGreaterThan(0);
          const graph = yield* calculatorApi.getCalculatorGraph({
            params,
            query: MetadataQuery.make({}),
          });
          expect(graph.calculator).toEqual(pay);
          expect(graph.edges.length).toBeGreaterThan(0);
          expect(graph.validationIssues).toEqual([]);
          const filter = DescriptorFilterQuery.make({
            calculator: Option.some(Option.some(pay.calculatorId)),
          });
          const facts = yield* calculatorApi.listFacts({ query: filter });
          expect(facts.facts.length).toBeGreaterThan(0);
          const rules = yield* calculatorApi.listRules({ query: filter });
          expect(rules.rules).toEqual(
            expect.arrayContaining(Array.fromIterable(schema.rules))
          );
          expect(rules.rules).toHaveLength(schema.rules.length);
          expect(yield* calculatorApi.getJurisdictions()).toEqual({
            jurisdictions: [{ code: "AU", title: "Australia" }],
          });
          expect(
            yield* calculatorApi.getTaxYears({ query: MetadataQuery.make({}) })
          ).toEqual({
            taxYears: [{ jurisdiction: "AU", taxYear: "2025-26" }],
          });
        }).pipe(Effect.provide(FetchHttpClient.layer));
        // The Website declares no server functions: the generated resolver
        // manifest is empty and the framework base path serves nothing.
        expect(
          Array.some(Record.values(websiteModules), (module) =>
            /"[a-f0-9]{64}":\s*\{\s*functionName:/u.test(module.contents)
          )
        ).toBe(false);
        expect(
          Array.some(Record.values(websiteModules), (module) =>
            module.contents.includes("_createServerFn_handler")
          )
        ).toBe(false);
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
                    body: retired.method === "POST" ? frameworkSentinel : null,
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
              expect(response.headers.get("cache-control")).toBe("no-store");
              expect(yield* Effect.promise(() => response.text())).toBe("");
            })
        );
        yield* Effect.logInfo("native-pair: initial page");
        const initial = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/`)
        );
        const initialHtml = yield* Effect.promise(() => initial.text());
        expect(initial.status).toBe(200);
        expect(initial.headers.get("cache-control")).toBe(publicCache.browser);
        expect(initial.headers.get("cloudflare-cdn-cache-control")).toBe(
          publicCache.cdn
        );
        // The first HTML seeds the browser's checked public settings; there is
        // no separate settings request.
        expect(initialHtml).toContain(
          `apiOrigin:"${apiOrigin}/",publicationOrigin:"${websiteOrigin}/",websiteOrigin:"${websiteOrigin}/"`
        );
        expect(initialHtml).toContain("Pay before tax");
        expect(initialHtml).toContain(
          'href="/calculators/au.pay.withholdings"'
        );
        expect(initialHtml).toContain(
          'href="/calculators/au.income-tax.annual"'
        );
        expect(initialHtml).toContain('href="/agents"');
        expect(initialHtml).not.toContain("Take-home pay:");
        expect(initialHtml).not.toContain(nativeForwardingKey);
        yield* Effect.logInfo("native-pair: private binding calculation");
        const server = yield* Effect.promise(() =>
          website.dispatchFetch(`${websiteOrigin}/`, {
            body: form,
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          })
        );
        expect(server.status).toBe(200);
        // A personal no-JavaScript result is never shared.
        expect(server.headers.get("cache-control")).toBe("no-store");
        expect(server.headers.get("cloudflare-cdn-cache-control")).toBe(
          "no-store"
        );
        const serverHtml = yield* Effect.promise(() => server.text());
        expect(serverHtml).toContain("$1,301.00");
        expect(serverHtml).not.toContain(nativeForwardingKey);
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
        // The unconfigured API's reply is an unavailable service; the visitor
        // keeps the form and gets the Website's safe retry guidance.
        expect(unavailableHtml).toContain(new WebsiteApiUnavailable().message);
        expect(unavailableHtml).toContain('value="1654"');
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
        // A visitor cookie for the shared host: credentialed API calls would
        // carry it to the API's port as well.
        yield* Effect.promise(() =>
          context.addCookies([
            {
              domain: "127.0.0.1",
              name: "taxkit_visitor",
              path: "/",
              value: "visitor",
            },
          ])
        );
        const page = yield* Effect.promise(() => context.newPage());
        const calls = yield* Queue.make<{
          readonly method: string;
          readonly url: string;
          readonly request: BrowserRequest;
        }>();
        // Record calculations and any retired server-function call.
        const recordCalls = (request: BrowserRequest) => {
          const url = new URL(request.url());
          if (isCalculation(url) || url.pathname.startsWith("/_serverFn")) {
            Queue.offerUnsafe(calls, {
              method: request.method(),
              request,
              url: request.url(),
            });
          }
        };
        page.on("request", recordCalls);
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
        ).toEqual([{ method: "POST", url: takeHomeCalculation }]);
        // Credentials are omitted and no trace correlation is sent; the
        // visitor's collection preference travels as its own header.
        const sentHeaders = yield* Effect.forEach(requests, (call) =>
          Effect.promise(() => call.request.allHeaders())
        );
        expect(
          Array.every(
            sentHeaders,
            (headers) =>
              !Record.has(headers, "b3") &&
              !Record.has(headers, "traceparent") &&
              !Record.has(headers, "cookie") &&
              !Record.has(headers, WebsiteForwardingCredentialHeader) &&
              !Record.has(headers, WebsiteForwardingRateKeyHeader)
          )
        ).toBe(true);
        expect(
          Array.map(sentHeaders, (headers) =>
            Record.get(headers, "x-taxkit-collection-policy")
          )
        ).toEqual([Option.some("allow")]);
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
        errorPage.on("request", recordCalls);
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
        yield* Effect.promise(() => errorPage.waitForLoadState("networkidle"));
        yield* Effect.promise(() =>
          errorPage.getByRole("alert").waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() =>
            errorPage.getByRole("alert").textContent({ timeout: 5000 })
          )
        ).toBe(new WebsiteApiUnavailable().message);
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
        savedPage.on("request", recordCalls);
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
            .click({ timeout: 5000 })
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
            isCalculation,
            (route) =>
              route.fulfill({
                body: "",
                headers: { "access-control-allow-origin": websiteOrigin },
                status: 503,
              }),
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
              const link = plainPage
                .getByRole("navigation", { exact: true, name: "Calculators" })
                .getByRole("link", { exact: true, name: title });
              expect(yield* Effect.promise(() => link.count())).toBe(1);
              expect(
                yield* Effect.promise(() => link.getAttribute("href"))
              ).toBe(href);
            })
        );
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
        // Both remaining pages use the deployed calculator summaries and
        // submit to the real API. No browser fixture supplies these answers.
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
              savedAnswer: "$1,386.90",
              savedForm: "taxableDollars=30000",
              title: "AU annual income tax",
            },
          ] as const,
          (calculator) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => page.unroute(isCalculation));
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
                  isCalculation,
                  (route) =>
                    route.fulfill({
                      body: "",
                      headers: { "access-control-allow-origin": websiteOrigin },
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
                plainPage
                  .getByRole("navigation", { exact: true, name: "Calculators" })
                  .getByRole("link", { exact: true, name: calculator.title })
                  .click()
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
              return yield* Effect.void;
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
        expect(guideText).toContain("https://api.taxkit.dev/mcp");
        expect(guideText).toContain("taxkit_get_calculator_schema");
        expect(guideText).toContain("five-second limit");
        expect(guideText).toContain("taxkit_calculate_visible_form");
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
          expect(reply.status).toBe(200);
          expect(
            Headers.get(reply.headers, "content-type").pipe(
              Option.map((value) => value.includes("text/markdown"))
            )
          ).toEqual(Option.some(true));
          return yield* reply.text;
        }).pipe(Effect.provide(FetchHttpClient.layer));
        expect(guideBody).toContain("# Agent connection guide");
        expect(guideBody).toContain("taxkit_get_calculator_schema");
        expect(guideBody).toContain("five-second limit");
        // Documentation reads use the API's own public routes. Read the actual
        // replies the browser will receive for later corrupted-reply checks.
        const typescriptSdkReply = yield* Effect.promise(() =>
          publicApi.dispatchFetch(docsPageAddress("/sdk/typescript-sdk"), {
            headers: { origin: websiteOrigin },
          })
        );
        expect(typescriptSdkReply.status).toBe(200);
        expect(
          typescriptSdkReply.headers.get("access-control-allow-origin")
        ).toBe(websiteOrigin);
        const typescriptSdkBody = yield* Effect.promise(() =>
          typescriptSdkReply.text()
        );
        expect(typescriptSdkBody).toContain('"markdown":');
        const docsNavigationReply = yield* Effect.promise(() =>
          publicApi.dispatchFetch(docsNavigationAddress, {
            headers: { origin: websiteOrigin },
          })
        );
        expect(docsNavigationReply.status).toBe(200);
        const docsNavigationBody = yield* Effect.promise(() =>
          docsNavigationReply.text()
        );
        expect(docsNavigationBody).toContain('"primaryNavigation":');
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
              expect(response.headers.get("cache-control")).toBe("no-store");
              expect(yield* Effect.promise(() => response.text())).toBe("");
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
              expect(response.headers.get("cache-control")).toBe("no-store");
              const html = yield* Effect.promise(() => response.text());
              expect(html).toContain("Documentation page not found");
              expect(html).not.toContain("Server Fn Error");
            })
        );
        const docsPage = yield* Effect.promise(() => context.newPage());
        const parsedSitemap = yield* Effect.promise(() =>
          docsPage.evaluate((xml) => {
            const document = new DOMParser().parseFromString(
              xml,
              "application/xml"
            );
            return {
              hasParserError: document.querySelector("parsererror") !== null,
              locationCount: document.querySelectorAll("loc").length,
              locationText: document.documentElement.textContent ?? "",
              namespace: document.documentElement.namespaceURI,
            };
          }, discoverySitemap.body)
        );
        expect(parsedSitemap.hasParserError).toBe(false);
        expect(parsedSitemap.namespace).toBe(
          "http://www.sitemaps.org/schemas/sitemap/0.9"
        );
        expect(parsedSitemap.locationCount).toBe(62);
        expect(parsedSitemap.locationText.trim().split(/\s+/u)).toEqual(
          Array.map(
            publicContent.pages,
            (item) => `${websiteOrigin}${item.path}`
          )
        );
        docsPage.on("pageerror", (error) =>
          Queue.offerUnsafe(exceptions, error.message)
        );
        const docsCalls = yield* Queue.make<string>();
        const docsDocuments = yield* Queue.make<string>();
        // Record every documentation API read and any retired transport call.
        const docsRequests = yield* Queue.make<BrowserRequest>();
        docsPage.on("request", (request) => {
          const url = new URL(request.url());
          if (
            (url.origin === apiOrigin &&
              url.pathname.startsWith("/api/v1/docs/")) ||
            url.pathname.startsWith("/_serverFn")
          ) {
            Queue.offerUnsafe(
              docsCalls,
              `${request.method()} ${request.url()}`
            );
            Queue.offerUnsafe(docsRequests, request);
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
        expect(
          yield* Effect.promise(() => docsPage.getByRole("article").count())
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            docsPage
              .getByRole("navigation", { exact: true, name: "Documentation" })
              .count()
          )
        ).toBe(1);
        expect(
          yield* Effect.promise(() =>
            docsPage.evaluate(() => document.activeElement === document.body)
          )
        ).toBe(true);
        yield* expectReadableText(docsPage, ".docs-article p");
        yield* expectReadableText(docsPage, ".docs-navigation-panel summary");
        yield* Effect.promise(() => docsPage.keyboard.press("Tab"));
        expect(
          yield* Effect.promise(() =>
            docsPage
              .getByRole("link", { exact: true, name: "Skip to content" })
              .evaluate((element) => element === document.activeElement)
          )
        ).toBe(true);
        yield* Effect.promise(() => docsPage.keyboard.press("Enter"));
        expect(
          yield* Effect.promise(() =>
            docsPage
              .getByRole("main")
              .evaluate((element) => element === document.activeElement)
          )
        ).toBe(true);
        yield* Effect.promise(() =>
          docsPage.emulateMedia({ reducedMotion: "reduce" })
        );
        const motionElements = docsPage.locator(
          ".app-shell, .docs-layout, .docs-navigation-panel, .docs-navigation, .docs-article"
        );
        const motionCount = yield* Effect.promise(() => motionElements.count());
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
            expect(style).toEqual({
              animationName: "none",
              transitionDuration: "0s",
            });
          })
        );
        yield* Effect.promise(() =>
          docsPage.emulateMedia({ reducedMotion: "no-preference" })
        );
        const imagePage = yield* Effect.acquireRelease(
          Effect.promise(() => browser.newPage()),
          (resource) => Effect.promise(() => resource.close())
        );
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
                  alternate: document
                    .querySelector(
                      'link[rel="alternate"][type="text/markdown"]'
                    )
                    ?.getAttribute("href"),
                  articleJson:
                    document.querySelector('script[type="application/ld+json"]')
                      ?.textContent ?? "",
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

            const article = yield* Schema.decodeEffect(WebsiteDocsArticleJson)(
              rendered.articleJson
            );
            expect(article.headline).toBe(expected.frontmatter.title);
            expect(article.description).toBe(expected.frontmatter.description);
            expect(article.url.href).toBe(`${websiteOrigin}${expected.path}`);
            expect(article.image.href).toBe(
              `${websiteOrigin}${docsImagePath(expected)}`
            );
            expect(rendered.image).toBe(article.image.href);
            expect(rendered.imageWidth).toBe(
              String(WebsiteDocsImageSize.width)
            );
            expect(rendered.imageHeight).toBe(
              String(WebsiteDocsImageSize.height)
            );
            expect(rendered.twitterCard).toBe("summary_large_image");
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
            ).toEqual(WebsiteDocsImageSize);
            expect(rendered.heading).toBe(expected.frontmatter.title);
            expect(rendered.title).toBe(
              `${expected.frontmatter.title} | TaxKit`
            );
            expect(rendered.description).toBe(expected.frontmatter.description);
            expect(rendered.canonical).toBe(`${websiteOrigin}${expected.path}`);
            expect(rendered.alternate).toBe(
              `${websiteOrigin}${expected.path}.md`
            );
            // Every reply at a docs address carries the same Vary set, so Workers
            // Cache keeps the HTML and Markdown variants side by side.
            expect(response.headers.get("vary")).toBe("Accept");
            expect(rendered.navigation).toBe(62);
            expect(rendered.markdown).toBe(
              `${websiteOrigin}${expected.path}.md`
            );
            expect(rendered.text?.length).toBeGreaterThan(100);
            expect(rendered.text).not.toContain("Documentation could not load");
          })
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("link", { name: "Read this page as Markdown" })
            .click()
        );
        expect(docsPage.url()).toBe(`${websiteOrigin}/start/quickstart.md`);
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
        yield* Effect.forEach(docsFixtureWorkers, ({ mode, workers }) =>
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
            // The server checks the API page against its compiled
            // presentation before rendering and fails closed through
            // TanStack's native route error egress.
            expect(response.status, mode).toBe(500);
            expect(response.headers.get("cache-control")).toBe("no-store");
            expect(html).toContain("Documentation could not load");
            expect(html).not.toContain("PRIVATE9");
            expect(html).not.toContain("private9.mdx");
            expect(html).not.toContain("DocsPresentationUnavailable");
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
        expect(Array.sort(yield* Queue.clear(docsCalls), Order.String)).toEqual(
          [
            `GET ${docsNavigationAddress}`,
            `GET ${docsPageAddress("/sdk/typescript-sdk")}`,
          ]
        );
        // Direct public reads omit credentials and trace correlation.
        const docsHeaders = yield* Effect.forEach(
          yield* Queue.clear(docsRequests),
          (request) => Effect.promise(() => request.allHeaders())
        );
        expect(docsHeaders).toHaveLength(2);
        expect(
          Array.every(
            docsHeaders,
            (headers) =>
              !Record.has(headers, "cookie") &&
              !Record.has(headers, "b3") &&
              !Record.has(headers, "traceparent")
          )
        ).toBe(true);
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
        expect(Array.sort(yield* Queue.clear(docsCalls), Order.String)).toEqual(
          [
            `GET ${docsNavigationAddress}`,
            `GET ${docsPageAddress("/sdk/plain-sdk")}`,
          ]
        );
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
        yield* expectReadableText(docsPage, ".docs-navigation-panel summary");
        yield* Effect.promise(() => docsPage.keyboard.press("Enter"));
        expect(
          yield* Effect.promise(() =>
            docsPage.locator(".docs-navigation-panel").getAttribute("open")
          )
        ).toBe(null);
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
        yield* expectReadableText(docsPage, ".docs-state p");
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
        // A valid page whose body differs from the compiled presentation (a
        // differently activated API) is not rendered in the browser either.
        const plainSdkReply = yield* Effect.promise(() =>
          publicApi.dispatchFetch(docsPageAddress("/sdk/plain-sdk"), {
            headers: { origin: websiteOrigin },
          })
        );
        expect(plainSdkReply.status).toBe(200);
        const plainSdkBody = yield* Effect.promise(() => plainSdkReply.text());
        expect(plainSdkBody).toContain('"markdown":"');
        yield* Effect.promise(() =>
          docsPage.route(
            docsPageAddress("/sdk/plain-sdk"),
            (route) =>
              route.fulfill({
                body: plainSdkBody.replace(
                  '"markdown":"',
                  `"markdown":"${frameworkSentinel} `
                ),
                headers: Record.fromEntries(plainSdkReply.headers),
                status: 200,
              }),
            { times: 1 }
          )
        );
        yield* Effect.promise(() =>
          docsPage.locator('.docs-navigation a[href="/sdk/plain-sdk"]').click()
        );
        yield* Effect.promise(() =>
          docsPage
            .getByRole("heading", {
              exact: true,
              name: "This documentation page needs to be reloaded",
            })
            .waitFor({ timeout: 5000 })
        );
        expect(
          yield* Effect.promise(() => docsPage.locator("body").textContent())
        ).not.toContain(frameworkSentinel);
        yield* Effect.promise(() =>
          docsPage.goto(`${websiteOrigin}/start/quickstart`)
        );
        yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
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
        // An empty search reads only the navigation, directly from the API.
        expect(yield* Queue.clear(docsCalls)).toEqual([
          `GET ${docsNavigationAddress}`,
        ]);
        yield* Queue.clear(docsRequests);
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
            `?term=${encodeURIComponent("a".repeat(1201))}`,
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
        // A failed search load is a server error page, never a shared reply.
        expect(unavailableSearch.status).toBe(500);
        expect(unavailableSearch.headers.get("cache-control")).toBe("no-store");
        expect(
          unavailableSearch.headers.get("cloudflare-cdn-cache-control")
        ).toBe("no-store");
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
