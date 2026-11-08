// Native pair surface: Documentation reading: accessibility, share metadata and representations.
// native-pair.boundary.test.ts runs these checks in order on one host pair.
import { expect } from "@effect/vitest";
import { docsImagePath } from "@taxkit/content/publication";
import { docsOgImageSize } from "@taxkit/content/schemas";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Queue,
  Schema,
} from "effect";
import { Miniflare } from "miniflare";
import type { Request as BrowserRequest } from "playwright";

import type { verifyBrowserCalculation } from "./native-pair-calculator-browser.checks";
import type {
  verifyContentCatalogue,
  verifyDiscoveryDocuments,
} from "./native-pair-content.checks";
import type { verifyMarkdownNegotiation } from "./native-pair-docs-api.checks";
import {
  TechArticleJson,
  apiOrigin,
  websiteOrigin,
  frameworkSentinel,
  docsNavigationAddress,
  docsPageAddress,
  expectReadableText,
} from "./native-pair.fixture";
import type { NativePairHosts } from "./native-pair.fixture";

export const captureDocumentationReplies = Effect.fnUntraced(
  function* captureDocumentationReplies({
    publicApi,
    website,
  }: {
    readonly publicApi: NativePairHosts["publicApi"];
    readonly website: NativePairHosts["website"];
  }) {
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
    const navigationBody = yield* Effect.promise(() => navigationReply.text());
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
      [`/${"a".repeat(256)}`, `/..%2F${frameworkSentinel}`, "/start/missing"],
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
  }
);
export const verifyAccessibleDocumentation = Effect.fnUntraced(
  function* verifyAccessibleDocumentation({
    exceptions,
    publicContent,
    discoverySitemap,
    context,
  }: {
    readonly exceptions: NativePairHosts["exceptions"];
    readonly publicContent: Effect.Success<
      ReturnType<typeof verifyContentCatalogue>
    >["publicContent"];
    readonly discoverySitemap: Effect.Success<
      ReturnType<typeof verifyDiscoveryDocuments>
    >["discoverySitemap"];
    readonly context: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["context"];
  }) {
    const documentationPage = yield* Effect.promise(() => context.newPage());
    const parsedSitemap = yield* Effect.promise(() =>
      documentationPage.evaluate((xml) => {
        const document = new DOMParser().parseFromString(
          xml,
          "application/xml"
        );
        return {
          hasParserError: document.querySelectorAll("parsererror").length > 0,
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
        parsedSitemapNamespace: "http://www.sitemaps.org/schemas/sitemap/0.9",
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
          url.pathname.startsWith("/api/v2/docs/")) ||
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
        EffectPromiseDocsPageLocatorMainCount: yield* Effect.promise(() =>
          documentationPage.locator("main").count()
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
      selector: ".docs-nav-section-heading > a",
    });
    yield* Effect.promise(() => documentationPage.keyboard.press("Tab"));
    expect(
      yield* Effect.promise(() =>
        documentationPage
          .getByRole("link", { exact: true, name: "Skip to content" })
          .evaluate((element) => element === document.activeElement)
      )
    ).toBeTruthy();
    yield* Effect.promise(() => documentationPage.keyboard.press("Enter"));
    expect(
      yield* Effect.promise(() =>
        documentationPage
          .locator(".docs-article h1")
          .evaluate((element) => element === document.activeElement)
      )
    ).toBeTruthy();
    yield* Effect.promise(() =>
      documentationPage.emulateMedia({ reducedMotion: "reduce" })
    );
    const motionElements = documentationPage.locator(
      ".app-shell, .docs-layout, .docs-navigation, .docs-article"
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
  }
);
export const verifyShareMetadata = Effect.fnUntraced(
  function* verifyShareMetadata({
    website,
    publicContent,
    browser,
    docsPage,
  }: {
    readonly website: NativePairHosts["website"];
    readonly publicContent: Effect.Success<
      ReturnType<typeof verifyContentCatalogue>
    >["publicContent"];
    readonly browser: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["browser"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
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
                  .querySelector('link[rel="alternate"][type="text/markdown"]')
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
                  ?.querySelector('.docs-page-actions a[href$=".md"]')
                  ?.getAttribute("href"),
                navigation: document.querySelectorAll(
                  ".docs-sidebar .docs-navigation a"
                ).length,
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
          expect(rendered.text).not.toContain("Documentation could not load");
        })
      )
    );
  }
);
export const verifyDocumentationRepresentations = Effect.fnUntraced(
  function* verifyDocumentationRepresentations({
    logs,
    exceptions,
    website,
    docsFixtureWorkers,
    quickstart,
    docsPage,
  }: {
    readonly logs: NativePairHosts["logs"];
    readonly exceptions: NativePairHosts["exceptions"];
    readonly website: NativePairHosts["website"];
    readonly docsFixtureWorkers: NativePairHosts["docsFixtureWorkers"];
    readonly quickstart: Effect.Success<
      ReturnType<typeof verifyMarkdownNegotiation>
    >["quickstart"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
    yield* Effect.promise(() =>
      docsPage.getByRole("link", { name: "Read as Markdown" }).first().click()
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
    expect(missingHtml).not.toContain("The documentation page was not found.");
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
  }
);
