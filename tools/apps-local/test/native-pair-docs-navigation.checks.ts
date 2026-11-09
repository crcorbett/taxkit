// Native pair surface: Documentation navigation, layout, themes and malformed-reply recovery.
// native-pair.boundary.test.ts runs these checks in order on one host pair.
import { expect } from "@effect/vitest";
import {
  Schedule,
  Function as EffectFunction,
  Array,
  Effect,
  Option,
  Order,
  Path,
  Queue,
  Record,
} from "effect";
import type { Route as BrowserRoute } from "playwright";

import type { verifyCalculatorVariants } from "./native-pair-calculator-browser.checks";
import type {
  captureDocumentationReplies,
  verifyAccessibleDocumentation,
} from "./native-pair-docs-reader.checks";
import {
  websiteOrigin,
  docsNavigationAddress,
  docsPageAddress,
  expectReadableText,
} from "./native-pair.fixture";
import type { NativePairBundles } from "./native-pair.fixture";

export const verifyClientNavigation = Effect.fnUntraced(
  function* verifyClientNavigation({
    screenshotRoot,
    docsPage,
    docsCalls,
    docsDocuments,
    docsRequests,
  }: {
    readonly screenshotRoot: NativePairBundles["screenshotRoot"];
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
    const path = yield* Path.Path;
    yield* Queue.clear(docsCalls);
    yield* Queue.clear(docsDocuments);
    yield* Effect.promise(() =>
      docsPage.locator('.docs-navigation a[href="/sdk/typescript-sdk"]').click()
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
      Effect.forEach((request) => Effect.promise(() => request.allHeaders()))
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
      docsPage.locator('.docs-article a[href="/sdk/plain-sdk"]').first().click()
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
  }
);
export const verifyPendingDestinationFocus = Effect.fnUntraced(
  function* verifyPendingDestinationFocus({
    docsPage,
  }: {
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
    yield* Effect.forEach(
      [
        { width: 1440, path: "/sdk/effect-sdk", title: "Effect SDK" },
        {
          width: 390,
          path: "/concepts/money-and-branded-values",
          title: "Money and branded values",
        },
      ],
      (destination) =>
        Effect.gen(function* () {
          const paused = yield* Queue.make<BrowserRoute>();
          yield* Effect.promise(() =>
            docsPage.setViewportSize({
              height: 900,
              width: destination.width,
            })
          );
          yield* Effect.promise(() =>
            docsPage.route(
              docsPageAddress(destination.path),
              (route) => {
                Queue.offerUnsafe(paused, route);
              },
              { times: 1 }
            )
          );
          if (destination.width === 390) {
            yield* Effect.promise(() =>
              docsPage
                .getByRole("button", { name: "Open documentation menu" })
                .click()
            );
          }
          yield* Effect.promise(() =>
            docsPage
              .getByRole("navigation", {
                exact: true,
                name: "Documentation",
              })
              .getByRole("link", { exact: true, name: destination.title })
              .click()
          );
          const request = yield* Queue.take(paused).pipe(
            Effect.timeout("5 seconds")
          );
          yield* Effect.promise(() =>
            docsPage.getByRole("dialog").waitFor({ state: "hidden" })
          );
          // Keep the old document visible and force a section update while
          // the destination is withheld. It must not consume focus intent.
          yield* Effect.promise(() =>
            docsPage.evaluate(() => {
              window.scrollTo(0, document.documentElement.scrollHeight);
            })
          );
          expect(
            yield* Effect.promise(() =>
              docsPage
                .locator(".docs-article h1")
                .evaluate((element) => element === document.activeElement)
            )
          ).toBeFalsy();
          yield* Effect.promise(() => request.continue());
          yield* Effect.promise(() =>
            docsPage
              .getByRole("heading", {
                exact: true,
                name: destination.title,
              })
              .waitFor()
          );
          yield* Effect.promise(() =>
            docsPage
              .locator(".docs-article h1")
              .evaluate((element) => element === document.activeElement)
          ).pipe(
            Effect.repeat({
              until: (value) => value,
              schedule: Schedule.spaced("20 millis"),
            }),
            Effect.timeout("2 seconds"),
            Effect.tap((value) =>
              Effect.sync(() => {
                expect(value).toBeTruthy();
              })
            )
          );
          yield* Effect.promise(() =>
            docsPage.goto(`${websiteOrigin}/start/quickstart`)
          );
          yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
          yield* Effect.promise(() =>
            docsPage.locator('main[aria-busy="false"]').waitFor()
          );
        })
    );
    yield* Effect.promise(() =>
      docsPage.setViewportSize({ height: 900, width: 1440 })
    );
  }
);
export const verifyPageOutline = Effect.fnUntraced(function* verifyPageOutline({
  docsPage,
}: {
  readonly docsPage: Effect.Success<
    ReturnType<typeof verifyAccessibleDocumentation>
  >["docsPage"];
}) {
  const outline = docsPage.locator(".docs-page-sidebar .docs-outline");
  const last = outline.getByRole("link").last();
  const target = yield* Effect.promise(() => last.getAttribute("href"));
  yield* Effect.promise(() => last.click());
  yield* Effect.promise(() =>
    outline.locator('a[aria-current="location"]').waitFor()
  );
  yield* Effect.promise(() =>
    outline.locator('a[aria-current="location"]').getAttribute("href")
  ).pipe(
    Effect.repeat({
      until: (value) => value === target,
      schedule: Schedule.spaced("20 millis"),
    }),
    Effect.timeout("2 seconds"),
    Effect.tap((value) =>
      Effect.sync(() => {
        expect(value).toBe(target);
      })
    )
  );
  yield* Effect.promise(() =>
    docsPage.evaluate(() => {
      window.scrollTo(0, 0);
    })
  );
});
export const verifyMobileNavigation = Effect.fnUntraced(
  function* verifyMobileNavigation({
    screenshotRoot,
    docsPage,
  }: {
    readonly screenshotRoot: NativePairBundles["screenshotRoot"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
    const path = yield* Path.Path;
    const fits = yield* EffectFunction.pipe(
      [320, 390],
      Effect.forEach((width) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            docsPage.setViewportSize({ height: 844, width })
          );
          return yield* Effect.promise(() =>
            docsPage.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth
            )
          );
        })
      )
    );
    expect(fits).toStrictEqual([true, true]);
    yield* Effect.promise(() =>
      docsPage.getByRole("radio", { name: /^dark$/iu }).check()
    );
    const menu = docsPage.getByRole("button", {
      name: "Open documentation menu",
    });
    yield* Effect.promise(() => menu.focus());
    yield* Effect.promise(() => docsPage.keyboard.press("Enter"));
    const dialog = docsPage.getByRole("dialog");
    yield* Effect.promise(() => dialog.waitFor());
    expect(
      yield* Effect.promise(() =>
        dialog.evaluate((element) => ({
          focusInside: element.contains(document.activeElement),
          scheme: getComputedStyle(element).colorScheme,
        }))
      )
    ).toStrictEqual({ focusInside: true, scheme: "dark" });
    yield* Effect.promise(() => docsPage.keyboard.press("Escape"));
    yield* Effect.promise(() => dialog.waitFor({ state: "hidden" }));
    expect(
      yield* Effect.promise(() =>
        menu.evaluate((element) => element === document.activeElement)
      )
    ).toBeTruthy();
    yield* Effect.promise(() => menu.click());
    yield* Effect.promise(() =>
      dialog.getByRole("link", { name: "Quickstart", exact: true }).click()
    );
    yield* Effect.promise(() => dialog.waitFor({ state: "hidden" }));
    expect(
      yield* Effect.promise(() =>
        docsPage
          .locator(".docs-article h1")
          .evaluate((element) => element === document.activeElement)
      )
    ).toBeTruthy();
    expect(
      yield* Effect.promise(() =>
        docsPage
          .getByRole("link", { name: "Read as Markdown", exact: true })
          .isVisible()
      )
    ).toBeTruthy();
    yield* Effect.promise(() =>
      docsPage.getByRole("radio", { name: /^system$/iu }).check()
    );
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
  }
);
export const verifyCodeScrollbar = Effect.fnUntraced(
  function* verifyCodeScrollbar({
    docsPage,
  }: {
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
    const code = docsPage
      .getByRole("region", { name: "TypeScript", exact: true })
      .first();
    const track = code
      .locator("..")
      .locator('[data-slot="scroll-area-scrollbar"]');
    const thumb = track.locator('[data-slot="scroll-area-thumb"]');
    yield* Effect.promise(() => code.scrollIntoViewIfNeeded());
    const trackBounds = yield* Effect.promise(() => track.boundingBox()).pipe(
      Effect.flatMap((value) => Effect.fromOption(Option.fromNullishOr(value)))
    );
    const thumbBounds = yield* Effect.promise(() => thumb.boundingBox()).pipe(
      Effect.flatMap((value) => Effect.fromOption(Option.fromNullishOr(value)))
    );
    yield* Effect.promise(() =>
      thumb.dragTo(track, {
        targetPosition: {
          x: trackBounds.width - 4,
          y: trackBounds.height / 2,
        },
      })
    );
    const codeScrolled = yield* Effect.promise(() =>
      code.evaluate((element) => element.scrollLeft > 0)
    );
    expect({
      thumbFits: thumbBounds.width < trackBounds.width,
      thumbVisible: thumbBounds.height > 0,
      codeScrolled,
    }).toStrictEqual({
      thumbFits: true,
      thumbVisible: true,
      codeScrolled: true,
    });
  }
);
export const verifyNavigationWithoutJavaScript = Effect.fnUntraced(
  function* verifyNavigationWithoutJavaScript({
    plainPage,
  }: {
    readonly plainPage: Effect.Success<
      ReturnType<typeof verifyCalculatorVariants>
    >["plainPage"];
  }) {
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
        .getByRole("navigation", { name: "Documentation", exact: true })
        .locator('a[href="/sdk/typescript-sdk"]')
        .click()
    );
    expect(
      yield* Effect.promise(() =>
        plainPage.locator(".docs-article h1").textContent()
      )
    ).toBe("TypeScript SDK");
    yield* Effect.promise(() =>
      plainPage.getByRole("radio", { name: /^dark$/iu }).check()
    );
    expect(
      yield* Effect.promise(() =>
        plainPage
          .locator(".docs-reader")
          .evaluate((element) => getComputedStyle(element).colorScheme)
      )
    ).toBe("dark");
    yield* Effect.promise(() =>
      plainPage.setViewportSize({ height: 844, width: 320 })
    );
    const code = plainPage
      .getByRole("region", { name: "TypeScript", exact: true })
      .first();
    yield* Effect.promise(() => code.focus());
    yield* Effect.promise(() => plainPage.keyboard.press("ArrowRight"));
    const scrolled = yield* Effect.promise(() =>
      code.evaluate((element) => element.scrollLeft > 0)
    ).pipe(
      Effect.repeat({
        until: (value) => value,
        schedule: Schedule.spaced("20 millis"),
      }),
      Effect.timeout("2 seconds")
    );
    expect({
      scrolled,
      focused: yield* Effect.promise(() =>
        code.evaluate((element) => element === document.activeElement)
      ),
      copyControls: yield* Effect.promise(() =>
        plainPage.getByRole("button", { name: /^Copy/u }).count()
      ),
    }).toStrictEqual({ scrolled: true, focused: true, copyControls: 0 });
    yield* Effect.promise(() =>
      plainPage.setViewportSize({ height: 900, width: 1280 })
    );
  }
);
export const verifyResponsiveTablesAndDiagrams = Effect.fnUntraced(
  function* verifyResponsiveTablesAndDiagrams({
    screenshotRoot,
    docsPage,
  }: {
    readonly screenshotRoot: NativePairBundles["screenshotRoot"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
    const path = yield* Path.Path;
    yield* Effect.promise(() =>
      docsPage.goto(`${websiteOrigin}/contributing/what-are-you-changing`)
    );
    yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
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
        docsPage.getByRole("region", { name: "Documentation table" }).count()
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
  }
);
export const verifyPairedThemes = Effect.fnUntraced(
  function* verifyPairedThemes({
    screenshotRoot,
    docsPage,
    docsCalls,
  }: {
    readonly screenshotRoot: NativePairBundles["screenshotRoot"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
    readonly docsCalls: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsCalls"];
  }) {
    const path = yield* Path.Path;
    yield* Queue.clear(docsCalls);
    yield* Effect.promise(() =>
      docsPage.emulateMedia({ colorScheme: "light" })
    );
    const text = yield* Effect.promise(() =>
      docsPage.locator(".docs-article pre").first().textContent()
    );
    const light = yield* Effect.promise(() =>
      docsPage
        .locator(".mdx-code-token")
        .first()
        .evaluate((element) => getComputedStyle(element).color)
    );
    yield* Effect.promise(() =>
      docsPage.getByRole("radio", { name: /^dark$/iu }).check()
    );
    const dark = yield* Effect.promise(() =>
      docsPage
        .locator(".mdx-code-token")
        .first()
        .evaluate((element) => getComputedStyle(element).color)
    );
    expect({
      scheme: yield* Effect.promise(() =>
        docsPage
          .locator(".docs-reader")
          .evaluate((element) => getComputedStyle(element).colorScheme)
      ),
      changedColour: dark !== light,
      text: yield* Effect.promise(() =>
        docsPage.locator(".docs-article pre").first().textContent()
      ),
    }).toStrictEqual({ scheme: "dark", changedColour: true, text });
    yield* Effect.promise(() =>
      docsPage.screenshot({
        fullPage: true,
        path: path.join(screenshotRoot, "docs-theme-code-dark.png"),
      })
    );
    yield* Effect.promise(() =>
      docsPage.getByRole("radio", { name: /^system$/iu }).check()
    );
    yield* Effect.promise(() => docsPage.emulateMedia({ colorScheme: "dark" }));
    expect(
      yield* Effect.promise(() =>
        docsPage
          .locator(".mdx-code-token")
          .first()
          .evaluate((element) => getComputedStyle(element).color)
      )
    ).toBe(dark);
    yield* Effect.promise(() =>
      docsPage.getByRole("radio", { name: /^light$/iu }).check()
    );
    expect(
      yield* Effect.promise(() =>
        docsPage
          .locator(".mdx-code-token")
          .first()
          .evaluate((element) => getComputedStyle(element).color)
      )
    ).toBe(light);
    expect(yield* Queue.clear(docsCalls)).toStrictEqual([]);
    yield* Effect.promise(() =>
      docsPage.emulateMedia({ colorScheme: "light" })
    );
    yield* Effect.promise(() =>
      docsPage.goto(`${websiteOrigin}/contributing/what-are-you-changing`)
    );
    yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
    const diagram = docsPage.getByRole("img", {
      name: "Which contribution guide matches your change",
    });
    const src = yield* Effect.promise(() => diagram.getAttribute("src"));
    yield* Effect.promise(() =>
      docsPage.getByRole("radio", { name: /^dark$/iu }).check()
    );
    expect({
      source: yield* Effect.promise(() => diagram.getAttribute("src")),
      loaded: yield* Effect.promise(() =>
        diagram.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0
        )
      ),
      scheme: yield* Effect.promise(() =>
        docsPage
          .locator(".docs-reader")
          .evaluate((element) => getComputedStyle(element).colorScheme)
      ),
    }).toStrictEqual({ source: src, loaded: true, scheme: "dark" });
    yield* Effect.promise(() =>
      docsPage.screenshot({
        fullPage: true,
        path: path.join(screenshotRoot, "docs-theme-diagram-dark.png"),
      })
    );
    yield* Effect.promise(() =>
      docsPage.goto(`${websiteOrigin}/start/quickstart`)
    );
    yield* Effect.promise(() => docsPage.waitForLoadState("networkidle"));
  }
);
export const verifyMalformedPageRecovery = Effect.fnUntraced(
  function* verifyMalformedPageRecovery({
    typescriptSdkReply,
    typescriptSdkBody,
    docsPage,
  }: {
    readonly typescriptSdkReply: Effect.Success<
      ReturnType<typeof captureDocumentationReplies>
    >["typescriptSdkReply"];
    readonly typescriptSdkBody: Effect.Success<
      ReturnType<typeof captureDocumentationReplies>
    >["typescriptSdkBody"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
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
      docsPage.locator('.docs-navigation a[href="/sdk/typescript-sdk"]').click()
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
  }
);
export const verifyMalformedNavigationRecovery = Effect.fnUntraced(
  function* verifyMalformedNavigationRecovery({
    docsNavigationReply,
    docsNavigationBody,
    docsPage,
  }: {
    readonly docsNavigationReply: Effect.Success<
      ReturnType<typeof captureDocumentationReplies>
    >["docsNavigationReply"];
    readonly docsNavigationBody: Effect.Success<
      ReturnType<typeof captureDocumentationReplies>
    >["docsNavigationBody"];
    readonly docsPage: Effect.Success<
      ReturnType<typeof verifyAccessibleDocumentation>
    >["docsPage"];
  }) {
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
  }
);
