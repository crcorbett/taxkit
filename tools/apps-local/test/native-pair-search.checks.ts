// Native pair surface: Documentation search navigation, input limits and interaction.
// native-pair.boundary.test.ts runs these checks in order on one host pair.
import { expect } from "@effect/vitest";
import { DocsSearchResult } from "@taxkit/content/schemas";
import {
  Schedule,
  Function as EffectFunction,
  Array,
  Effect,
  Order,
  Path,
  Queue,
  Schema,
} from "effect";

import type { verifyCalculatorVariants } from "./native-pair-calculator-browser.checks";
import type { verifyAccessibleDocumentation } from "./native-pair-docs-reader.checks";
import {
  apiOrigin,
  websiteOrigin,
  docsNavigationAddress,
  docsPageAddress,
} from "./native-pair.fixture";
import type { NativePairBundles, NativePairHosts } from "./native-pair.fixture";

export const verifySearchNavigation = Effect.fnUntraced(
  function* verifySearchNavigation({
    docsPage,
    docsCalls,
    docsDocuments,
    docsRequests,
  }: {
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
    readonly docsCalls: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsCalls"];
    readonly docsDocuments: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsDocuments"];
    readonly docsRequests: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsRequests"];
  }) {
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
    // Search uses the canonical page's checked theme through existing
    // bounded helpers; its navigation reads remain native public GETs.
    const searchReads = yield* Queue.clear(docsCalls).pipe(
      Effect.map(Array.sort(Order.String))
    );
    expect(searchReads).toStrictEqual([
      `GET ${docsNavigationAddress}`,
      `GET ${docsPageAddress("/start/quickstart")}`,
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
  }
);
export const verifySearchInputBoundaries = Effect.fnUntraced(
  function* verifySearchInputBoundaries({
    publicApi,
    website,
    docsPage,
  }: {
    readonly publicApi: NativePairHosts["publicApi"];
    readonly website: NativePairHosts["website"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
    yield* Effect.forEach(
      ["Quickstart", "2025", "true", "null", "税 😀", "café"],
      (term) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() =>
            publicApi.dispatchFetch(
              `${apiOrigin}/api/v2/docs/search?${new URLSearchParams({ term })}`
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
          yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));

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
              docsPage.locator(".docs-search-results h3 a").allTextContents()
            ),
            robots: yield* Effect.promise(() =>
              docsPage.locator('meta[name="robots"]').getAttribute("content")
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
      unavailableSearchWorker.fetch(`${websiteOrigin}/search?term=Quickstart`)
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
    expect(yield* Effect.promise(() => unavailableSearch.text())).toContain(
      "Documentation search could not load. Please reload this page to try again."
    );
  }
);
export const verifySearchInteraction = Effect.fnUntraced(
  function* verifySearchInteraction({
    screenshotRoot,
    docsPage,
  }: {
    readonly screenshotRoot: NativePairBundles["screenshotRoot"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
    const path = yield* Path.Path;
    yield* Effect.promise(() => docsPage.goto(`${websiteOrigin}/search`));
    yield* Effect.promise(() =>
      docsPage.getByRole("radio", { name: /^dark$/iu }).check()
    );
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
        .locator('.docs-search-results a[href="/start/quickstart"]')
        .waitFor()
    );
    expect(
      yield* Effect.promise(() =>
        docsPage
          .locator(".docs-reader")
          .evaluate((element) => getComputedStyle(element).colorScheme)
      )
    ).toBe("dark");
    // Re-submitting the same words must remain one native navigation.
    yield* Effect.promise(() =>
      docsPage
        .getByRole("button", {
          exact: true,
          name: "Search documentation",
        })
        .click()
    );
    yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
    const words = docsPage.getByRole("searchbox", {
      name: "Search words",
    });
    yield* Effect.promise(() => words.press("ControlOrMeta+A"));
    yield* Effect.promise(() => words.pressSequentially("money"));
    yield* Effect.promise(() =>
      docsPage
        .getByRole("button", {
          exact: true,
          name: "Search documentation",
        })
        .click()
    );
    yield* Effect.promise(() =>
      docsPage.waitForURL(`${websiteOrigin}/search?term=money`)
    );
    yield* Effect.promise(() =>
      docsPage.locator('main[aria-busy="false"]').waitFor()
    );
    yield* Effect.promise(() => docsPage.goBack());
    yield* Effect.promise(() =>
      docsPage.waitForURL(`${websiteOrigin}/search?term=Quickstart`)
    );
    yield* Effect.promise(() =>
      docsPage.locator('main[aria-busy="false"]').waitFor()
    );
    const restored = yield* Effect.promise(() => words.inputValue()).pipe(
      Effect.repeat({
        until: (value) => value === "Quickstart",
        schedule: Schedule.spaced("20 millis"),
      }),
      Effect.timeout("2 seconds")
    );
    yield* Effect.promise(() => docsPage.goForward());
    yield* Effect.promise(() =>
      docsPage.waitForURL(`${websiteOrigin}/search?term=money`)
    );
    yield* Effect.promise(() =>
      docsPage.locator('main[aria-busy="false"]').waitFor()
    );
    const forward = yield* Effect.promise(() => words.inputValue()).pipe(
      Effect.repeat({
        until: (value) => value === "money",
        schedule: Schedule.spaced("20 millis"),
      }),
      Effect.timeout("2 seconds")
    );
    expect({
      restored,
      forward,
    }).toStrictEqual({ restored: "Quickstart", forward: "money" });
    yield* Effect.promise(() => docsPage.goBack());
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
  }
);
export const verifySearchWithoutJavaScript = Effect.fnUntraced(
  function* verifySearchWithoutJavaScript({
    plainPage,
  }: {
    readonly plainPage: Effect.Success<
      ReturnType<typeof verifyCalculatorVariants>
    >["plainPage"];
  }) {
    yield* Effect.promise(() => plainPage.goto(`${websiteOrigin}/search`));
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
  }
);
