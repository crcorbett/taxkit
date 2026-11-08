// Native pair surface: Built bundles, the checked docs catalogue, share images and discovery files.
// native-pair.boundary.test.ts runs these checks in order on one host pair.
import { expect } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import { DiscoveryPath } from "@taxkit/api-http/routes";
import { docsImagePath } from "@taxkit/content/publication";
import {
  DocsPngBytes,
  DocsPublicCatalogue,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Path,
  Record,
  Schema,
} from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";

import { apiOrigin, websiteOrigin, publicCache } from "./native-pair.fixture";
import type { NativePairBundles, NativePairHosts } from "./native-pair.fixture";

export const verifyBundles = Effect.fnUntraced(function* verifyBundles({
  root,
  apiFiles,
  apiModules,
  apiWasm,
  websiteFiles,
  websiteModules,
}: {
  readonly root: NativePairBundles["root"];
  readonly apiFiles: NativePairBundles["apiFiles"];
  readonly apiModules: NativePairBundles["apiModules"];
  readonly apiWasm: NativePairBundles["apiWasm"];
  readonly websiteFiles: NativePairBundles["websiteFiles"];
  readonly websiteModules: NativePairBundles["websiteModules"];
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
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
});
export const verifyContentCatalogue = Effect.fnUntraced(
  function* verifyContentCatalogue({
    root,
    publicApi,
    website,
  }: {
    readonly root: NativePairBundles["root"];
    readonly publicApi: NativePairHosts["publicApi"];
    readonly website: NativePairHosts["website"];
  }) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    // Compare the actual built Worker with the owning checked catalogue,
    // including every body rather than accepting a count or a placeholder.
    const catalogue = yield* fs
      .readFileString(
        path.join(root, "apps/api/src/generated/docs-catalogue.json")
      )
      .pipe(
        Effect.flatMap(
          Schema.decodeEffect(Schema.fromJsonString(DocsPublicCatalogue))
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
          new Uint8Array(yield* Effect.promise(() => served.arrayBuffer()))
        );
        const owned = yield* Effect.promise(() =>
          publicApi.dispatchFetch(`${apiOrigin}/api/v2/docs/og${page.path}.png`)
        );
        expect({
          ownedStatus: owned.status,
          apiImageBytes: Array.fromIterable(
            new Uint8Array(yield* Effect.promise(() => owned.arrayBuffer()))
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
      const term = yield* Schema.decodeEffect(DocsSearchTerm)("Quickstart");
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
);
export const verifyDiscoveryDocuments = Effect.fnUntraced(
  function* verifyDiscoveryDocuments({
    publicApi,
    website,
    publicContent,
  }: {
    readonly publicApi: NativePairHosts["publicApi"];
    readonly website: NativePairHosts["website"];
    readonly publicContent: Effect.Success<
      ReturnType<typeof verifyContentCatalogue>
    >["publicContent"];
  }) {
    // The API's own discovery routes are the reference documents.
    const discoveryDocuments = yield* EffectFunction.pipe(
      DiscoveryPath.literals,
      Effect.forEach((documentPath) =>
        Effect.gen(function* () {
          const owned = yield* Effect.promise(() =>
            publicApi.dispatchFetch(
              `${apiOrigin}/api/v2/docs/discovery${documentPath}`
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
            xContentTypeOptions: served.headers.get("x-content-type-options"),
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
              `${apiOrigin}/api/v2/docs/discovery${document.path}`
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
            xContentTypeOptions: head.headers.get("x-content-type-options"),
            body: yield* Effect.promise(() => head.text()),
          }).toStrictEqual({
            status: 200,
            contentType: served.headers.get("content-type"),
            cacheControl: served.headers.get("cache-control"),
            cloudflareCdnCacheControl: served.headers.get(
              "cloudflare-cdn-cache-control"
            ),
            xContentTypeOptions: served.headers.get("x-content-type-options"),
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
            wrongMethodHeadersGetAllow: wrongMethod.headers.get("allow"),
            wrongMethodHeadersGetCacheControl:
              wrongMethod.headers.get("cache-control"),
            EffectPromiseWrongMethodText: yield* Effect.promise(() =>
              wrongMethod.text()
            ),
          };
          const query = yield* Effect.promise(() =>
            website.dispatchFetch(`${websiteOrigin}${document.path}?PRIVATE9=1`)
          );
          expect({
            method: rejectedMethod,
            query: {
              queryStatus: query.status,
              EffectPromiseQueryText: yield* Effect.promise(() => query.text()),
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
            `(${apiOrigin}/api/v2/docs/markdown?${new URLSearchParams({ path: page.path }).toString()})`
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
  }
);
