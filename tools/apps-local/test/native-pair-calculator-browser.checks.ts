// Native pair surface: Browser calculation, recalculation, failures, variants and the agent guide.
// native-pair.boundary.test.ts runs these checks in order on one host pair.
import { expect } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Option,
  Path,
  Queue,
  Record,
} from "effect";
import { FetchHttpClient, Headers, HttpClient } from "effect/http";
import { chromium } from "playwright";
import type { Request as BrowserRequest } from "playwright";

import {
  apiOrigin,
  websiteOrigin,
  isCalculation,
  takeHomeCalculation,
} from "./native-pair.fixture";
import type { NativePairBundles, NativePairHosts } from "./native-pair.fixture";

export const verifyBrowserCalculation = Effect.fnUntraced(
  function* verifyBrowserCalculation({
    exceptions,
  }: {
    readonly exceptions: NativePairHosts["exceptions"];
  }) {
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
      calculationRequests: [{ method: "POST", url: takeHomeCalculation }],
    });
    // Credentials are omitted and no trace correlation or collection
    // header is sent.
    const sentHeaders = yield* EffectFunction.pipe(
      requests,
      Effect.forEach((call) => Effect.promise(() => call.request.allHeaders()))
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
);
export const verifyRecalculation = Effect.fnUntraced(
  function* verifyRecalculation({
    page,
    calls,
  }: {
    readonly page: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["page"];
    readonly calls: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["calls"];
  }) {
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
  }
);
export const verifyCalculationFailure = Effect.fnUntraced(
  function* verifyCalculationFailure({
    page,
    calls,
    payInput,
  }: {
    readonly page: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["page"];
    readonly calls: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["calls"];
    readonly payInput: Effect.Success<
      ReturnType<typeof verifyRecalculation>
    >["payInput"];
  }) {
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
      page.getByRole("status", { name: "Calculation result" }).textContent()
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
  }
);
export const verifyCalculatorVariants = Effect.fnUntraced(
  function* verifyCalculatorVariants({
    screenshotRoot,
    browser,
    page,
    calls,
  }: {
    readonly screenshotRoot: NativePairBundles["screenshotRoot"];
    readonly browser: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["browser"];
    readonly page: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["page"];
    readonly calls: Effect.Success<
      ReturnType<typeof verifyBrowserCalculation>
    >["calls"];
  }) {
    const path = yield* Path.Path;
    yield* Effect.logInfo("native-pair: no JavaScript");
    const noJavaScript = yield* Effect.acquireRelease(
      Effect.promise(() => browser.newContext({ javaScriptEnabled: false })),
      (value) => Effect.promise(() => value.close())
    );
    const pageWithoutJavaScript = yield* Effect.promise(() =>
      noJavaScript.newPage()
    );
    yield* Effect.promise(() => pageWithoutJavaScript.goto(websiteOrigin));
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
          expect(yield* Effect.promise(() => link.getAttribute("href"))).toBe(
            href
          );
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
            page.locator(`nav a[href="/calculators/${calculator.id}"]`).click()
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
          yield* Effect.promise(() => calculatorInput.fill(calculator.amount));
          expect({
            result: idleResult,
            requests: yield* Queue.clear(calls),
          }).toStrictEqual({ result: "", requests: [] });
          yield* Effect.promise(() =>
            page.getByRole("button", { exact: true, name: "Calculate" }).click()
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
                page.locator(".calculation-details a[href^='https://']").count()
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
            page.getByRole("button", { exact: true, name: "Calculate" }).click()
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
            page.getByRole("button", { exact: true, name: "Calculate" }).focus()
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
);
export const verifyAgentGuide = Effect.fnUntraced(function* verifyAgentGuide({
  page,
}: {
  readonly page: Effect.Success<
    ReturnType<typeof verifyBrowserCalculation>
  >["page"];
}) {
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
        name: "Read as Markdown",
      })
      .first()
      .getAttribute("href")
  );
  expect(guideMarkdown).toBe(`${websiteOrigin}/api/agent-tools.md`);
  const guideBody = yield* Effect.gen(function* () {
    const reply = yield* HttpClient.get(`${websiteOrigin}/api/agent-tools.md`);
    expect({
      replyStatus: reply.status,
      markdownContentType: Headers.get(reply.headers, "content-type").pipe(
        Option.map((value) => value.includes("text/markdown"))
      ),
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
});
