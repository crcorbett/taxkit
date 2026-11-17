// Native pair surface: The API's public docs pages, Markdown negotiation and search replies.
// native-pair.boundary.test.ts runs these checks in order on one host pair.
import { expect } from "@effect/vitest";
import { DocsPageUnavailable } from "@taxkit/content/errors";
import {
  DocsPublicPage,
  DocsPublicNavigation,
  DocsSearchResult,
} from "@taxkit/content/schemas";
import { Function as EffectFunction, Array, Effect, Schema } from "effect";

import type {
  verifyContentCatalogue,
  verifyDiscoveryDocuments,
} from "./native-pair-content.checks";
import { apiOrigin, websiteOrigin, publicCache } from "./native-pair.fixture";
import type { NativePairHosts } from "./native-pair.fixture";

export const verifyPublicDocumentation = Effect.fnUntraced(
  function* verifyPublicDocumentation({
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
    const docsNavigation = yield* Effect.promise(() =>
      publicApi.dispatchFetch(`${apiOrigin}/api/v2/docs/navigation`)
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
            publicApi.dispatchFetch(`${apiOrigin}/api/v2/docs/page?${query}`, {
              headers: { origin: websiteOrigin },
            })
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
              `${apiOrigin}/api/v2/docs/markdown?${query}`
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
                  servedHeadersGetContentType: "text/markdown; charset=utf-8",
                  cacheControl: publicCache.browser,
                  cloudflareCdnCacheControl: publicCache.cdn,
                  servedHeadersGetVary: "Accept",
                  servedHeadersGetXContentTypeOptions: "nosniff",
                });
                EffectFunction.pipe(served.headers.get("link"), (actual) => {
                  expect(actual).toBe(
                    `<${websiteOrigin}${page.path}>; rel="canonical"; type="text/html"`
                  );
                });
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
                      expect(actualHeader).toBe(served.headers.get(header));
                    })
                );
                expect(yield* Effect.promise(() => head.text())).toBe("");
              })
            )
          );
        })
      )
    );
  }
);
export const verifyMarkdownNegotiation = Effect.fnUntraced(
  function* verifyMarkdownNegotiation({
    website,
    publicContent,
    unavailableDiscoveryWorker,
  }: {
    readonly website: NativePairHosts["website"];
    readonly publicContent: Effect.Success<
      ReturnType<typeof verifyContentCatalogue>
    >["publicContent"];
    readonly unavailableDiscoveryWorker: Effect.Success<
      ReturnType<typeof verifyDiscoveryDocuments>
    >["unavailableDiscoveryWorker"];
  }) {
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
          EffectFunction.pipe(response.headers.get("vary"), (actual) => {
            // Every reply at a docs address carries the same Vary set, so Workers
            // Cache keeps the HTML and Markdown variants side by side.
            expect(actual).toBe("Accept");
          });
          const body = yield* Effect.promise(() => response.text());
          if (choice.markdown) {
            EffectFunction.pipe(response.headers.get("location"), (actual) => {
              expect(actual).toBe("/start/quickstart.md");
            });
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
              cdnCacheControl: "public, max-age=604800, stale-if-error=0",
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
            website.dispatchFetch(`${websiteOrigin}${invalid.address}`, {
              headers: { accept: "text/markdown" },
              method: invalid.method,
              redirect: "manual",
            })
          );
          expect(response.status).toBe(invalid.status);
          if (invalid.status === 405) {
            EffectFunction.pipe(response.headers.get("allow"), (actual) => {
              expect(actual).toBe("GET, HEAD");
            });
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
);
export const verifySearchResponses = Effect.fnUntraced(
  function* verifySearchResponses({
    publicApi,
  }: {
    readonly publicApi: NativePairHosts["publicApi"];
  }) {
    const docsSearch = yield* Effect.promise(() =>
      publicApi.dispatchFetch(`${apiOrigin}/api/v2/docs/search?term=Quickstart`)
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
        "/api/v2/docs/page?path=..%2Ftaxkit-secret-sentinel",
        "/api/v2/docs/search?term=%20%20",
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
        `${apiOrigin}/api/v2/docs/markdown?path=%2Fprivate-taxkit-sentinel`
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
  }
);
