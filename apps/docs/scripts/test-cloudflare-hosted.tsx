import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Console, Effect, Match } from "effect";
import { chromium } from "playwright";
import type {
  Browser,
  Page,
  Request,
  Response as PlaywrightResponse,
} from "playwright";

import {
  HostedProofAssetPropagationError,
  runCloudflareHostedProof,
} from "./cloudflare-hosted-proof.boundary.js";
import type { CloudflareHostedProofHost } from "./cloudflare-hosted-proof.boundary.js";

interface BrowserRouterHarness {
  readonly navigate: (options: { readonly to: string }) => Promise<void>;
}

declare global {
  var __TSR_ROUTER__: BrowserRouterHarness | undefined;
}

const repositoryRoot = new URL("../../../", import.meta.url);
const knownPath = "/guides/calculate-australian-take-home-pay";
const missingPath = "/__docs-evidence__/missing";
const runtimeProofHeaders = {
  "x-taxkit-docs-runtime-proof": "construction-count",
};

const parseRgb = (value: string): readonly [number, number, number] => {
  const channels = value.match(/\d+(?:\.\d+)?/gu)?.map(Number);
  assert.ok(channels !== undefined && channels.length >= 3);
  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
};

const relativeLuminance = (color: readonly [number, number, number]) =>
  color
    .map((channel) => channel / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )
    .reduce(
      (luminance, channel, index) =>
        luminance + channel * ([0.2126, 0.7152, 0.0722][index] ?? 0),
      0
    );

const assertComputedContrast = async (page: Page) => {
  const colors = await page.evaluate(() => {
    const foreground = document.querySelector(".docs-article p");
    const background = document.querySelector(":root");
    if (
      !(foreground instanceof HTMLElement) ||
      !(background instanceof HTMLElement)
    ) {
      throw new Error("The contrast target was unavailable.");
    }
    return {
      background: getComputedStyle(background).backgroundColor,
      foreground: getComputedStyle(foreground).color,
    };
  });
  const foreground = relativeLuminance(parseRgb(colors.foreground));
  const background = relativeLuminance(parseRgb(colors.background));
  const ratio =
    (Math.max(foreground, background) + 0.05) /
    (Math.min(foreground, background) + 0.05);
  assert.ok(ratio >= 4.5);
  return Number(ratio.toFixed(2));
};

const waitForHydratedRouter = async (page: Page, timeoutMs: number) => {
  await page.waitForFunction(
    () =>
      globalThis.__TSR_ROUTER__ !== undefined &&
      document.querySelector('[data-tk-hydrated="true"]') !== null &&
      document.querySelector('[data-tk-navigation-interactive="true"]') !==
        null,
    undefined,
    { timeout: timeoutMs }
  );
};

export const visitHydratedPage = async ({
  attempts,
  delayMs,
  diagnostics,
  hydrationTimeoutMs = 30_000,
  origin,
  page,
  path,
}: {
  readonly attempts: number;
  readonly delayMs: number;
  readonly diagnostics: string[];
  readonly hydrationTimeoutMs?: number;
  readonly origin: string;
  readonly page: Page;
  readonly path: string;
}): Promise<number> => {
  let missingScriptAsset = false;
  const observeMissingScriptAsset = (response: PlaywrightResponse) => {
    if (response.status() !== 404) {
      return;
    }
    const url = new URL(response.url());
    if (
      url.origin === origin &&
      /^\/assets\/[^/?#]+-[A-Za-z0-9_-]{8,}\.js$/u.test(url.pathname)
    ) {
      missingScriptAsset = true;
    }
  };
  page.on("response", observeMissingScriptAsset);
  try {
    const visitAttempt = async (attempt: number): Promise<number> => {
      missingScriptAsset = false;
      const diagnosticsBeforeAttempt = diagnostics.length;
      await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
      try {
        await waitForHydratedRouter(page, hydrationTimeoutMs);
        return attempt - 1;
      } catch (error) {
        if (!missingScriptAsset) {
          throw error;
        }
      }
      if (attempt === attempts) {
        throw new HostedProofAssetPropagationError({
          reason: "missing-script-asset",
        });
      }
      diagnostics.length = diagnosticsBeforeAttempt;
      await Bun.sleep(delayMs);
      return visitAttempt(attempt + 1);
    };
    return await visitAttempt(1);
  } finally {
    page.off("response", observeMissingScriptAsset);
  }
};

const digest = async (url: URL) =>
  createHash("sha256")
    .update(await readFile(url))
    .digest("hex");

const isExpectedServerFunctionAbort = (request: Request, origin: string) => {
  const url = new URL(request.url());

  return (
    (request.resourceType() === "fetch" || request.resourceType() === "xhr") &&
    url.origin === origin &&
    url.pathname.startsWith("/_serverFn/") &&
    request.failure()?.errorText === "net::ERR_ABORTED"
  );
};

const playwrightHostedProofHost = {
  close: (browser) => browser.close(),
  launch: () => chromium.launch({ headless: true }),
  run: async (config, browser) => {
    const {
      acceptedPlanSha256,
      accountId,
      candidateCommit,
      configSha256,
      deploymentId,
      deploymentInputSha256,
      environment,
      evidenceDirectory,
      hostedPropagationAttempts,
      hostedPropagationDelayMs,
      lockfileSha256,
      origin,
      previewPrNumber,
      previousVersionId,
      rollbackRecoveryIdentity,
      stage,
      stateStoreId,
      versionId,
      workerName,
    } = config;
    const candidateAbbreviation = candidateCommit.slice(0, 7);
    const desktopEvidencePath = `${evidenceDirectory}/${environment}-desktop-${candidateAbbreviation}.png`;
    const mobileEvidencePath = `${evidenceDirectory}/${environment}-mobile-${candidateAbbreviation}.png`;
    const desktopScreenshot = new URL(desktopEvidencePath, repositoryRoot);
    const mobileScreenshot = new URL(mobileEvidencePath, repositoryRoot);
    const fetchHostedResponse = async (
      input: string,
      init: RequestInit | undefined,
      expectedStatus: number
    ) => {
      const fetchAttempt = async (
        attempt: number,
        response: Response
      ): Promise<Response> => {
        if (
          attempt >= hostedPropagationAttempts ||
          (response.status !== 404 && response.status < 500) ||
          response.status === expectedStatus
        ) {
          return response;
        }
        await Bun.sleep(hostedPropagationDelayMs);
        return fetchAttempt(attempt + 1, await fetch(input, init));
      };

      return fetchAttempt(1, await fetch(input, init));
    };

    const initialResponse = await fetchHostedResponse(
      `${origin}${knownPath}`,
      { headers: runtimeProofHeaders },
      200
    );
    const initialHtml = await initialResponse.text();
    assert.equal(initialResponse.status, 200);
    assert.match(initialHtml, /Calculate Australian take-home pay/u);
    assert.equal(
      initialResponse.headers.get("x-taxkit-docs-runtime-constructions"),
      "1"
    );
    const firstIsolate = initialResponse.headers.get(
      "x-taxkit-docs-runtime-isolate"
    );
    assert.ok(firstIsolate !== null && firstIsolate.length > 0);

    const assetPath =
      /(?:src|href)="(?<asset>\/assets\/[^"]+\.(?:css|js))"/u.exec(initialHtml)
        ?.groups?.["asset"];
    assert.ok(assetPath !== undefined);
    const assetResponse = await fetchHostedResponse(
      `${origin}${assetPath}`,
      undefined,
      200
    );
    const assetBody = await assetResponse.text();
    assert.equal(assetResponse.status, 200);
    assert.match(
      assetResponse.headers.get("content-type") ?? "",
      /css|javascript/u
    );
    assert.match(
      assetResponse.headers.get("cache-control") ?? "",
      /max-age=31536000/u
    );
    assert.match(
      assetResponse.headers.get("cache-control") ?? "",
      /immutable/u
    );
    assert.match(
      assetResponse.headers.get("cache-control") ?? "",
      /(?:^|,\s*)public(?:,|$)/u
    );
    assert.ok((assetResponse.headers.get("etag") ?? "").length > 0);
    assert.doesNotMatch(assetBody.slice(0, 100), /<!doctype html>/iu);

    const missingResponse = await fetch(`${origin}${missingPath}`, {
      headers: runtimeProofHeaders,
    });
    const missingHtml = await missingResponse.text();
    assert.equal(missingResponse.status, 404);
    assert.match(missingHtml, /Documentation page not found/u);
    assert.equal(
      missingResponse.headers.get("x-taxkit-docs-runtime-constructions"),
      "1"
    );
    const secondIsolate = missingResponse.headers.get(
      "x-taxkit-docs-runtime-isolate"
    );
    assert.ok(secondIsolate !== null && secondIsolate.length > 0);
    assert.equal(firstIsolate, secondIsolate);

    const browserVersion = browser.version();
    const page = await browser.newPage({
      viewport: { height: 1000, width: 1440 },
    });
    const diagnostics: string[] = [];
    let assetPropagationRetries = 0;
    let documentRequests = 0;
    const serverFunctionResponses: {
      readonly method: string;
      readonly status: number;
      readonly url: string;
    }[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        diagnostics.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) =>
      diagnostics.push(`pageerror: ${error.message}`)
    );
    page.on("requestfailed", (request) => {
      if (isExpectedServerFunctionAbort(request, origin)) {
        return;
      }

      diagnostics.push(
        `requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`
      );
    });
    page.on("request", (request) => {
      if (request.resourceType() === "document") {
        documentRequests += 1;
      }
    });
    page.on("response", (response) => {
      const request = response.request();
      if (
        (request.resourceType() === "fetch" ||
          request.resourceType() === "xhr") &&
        new URL(response.url()).pathname.startsWith("/_serverFn/")
      ) {
        serverFunctionResponses.push({
          method: request.method(),
          status: response.status(),
          url: response.url(),
        });
      }
    });

    const visit = async (target: Page, path: string) => {
      assetPropagationRetries += await visitHydratedPage({
        attempts: hostedPropagationAttempts,
        delayMs: hostedPropagationDelayMs,
        diagnostics,
        origin,
        page: target,
        path,
      });
    };

    await visit(page, knownPath);
    await page
      .getByRole("heading", { name: "Calculate Australian take-home pay" })
      .waitFor();
    assert.equal(await page.getByRole("main").count(), 1);
    assert.equal(await page.getByRole("article").count(), 1);
    assert.equal(
      await page.getByRole("navigation", { name: "Documentation" }).count(),
      1
    );
    const contrastRatio = await assertComputedContrast(page);
    const navigationDocumentBaseline = documentRequests;
    const navigationServerFunctionBaseline = serverFunctionResponses.length;
    await page
      .getByRole("navigation", { name: "Documentation" })
      .getByRole("link", { exact: true, name: "Reference" })
      .first()
      .click();
    await page
      .getByRole("heading", { exact: true, name: "Reference" })
      .waitFor();
    assert.equal(documentRequests, navigationDocumentBaseline);
    assert.ok(
      serverFunctionResponses.length > navigationServerFunctionBaseline
    );
    assert.ok(
      serverFunctionResponses
        .slice(navigationServerFunctionBaseline)
        .every(({ status }) => status === 200)
    );

    const observedServerFunction =
      serverFunctionResponses[navigationServerFunctionBaseline];
    assert.ok(observedServerFunction !== undefined);
    const malformedResponse = await page.request.fetch(
      observedServerFunction.url,
      {
        data: "{",
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );
    assert.ok(malformedResponse.status() >= 400);
    assert.ok(malformedResponse.status() < 500);

    await page.evaluate(async (path) => {
      const router = globalThis.__TSR_ROUTER__;
      if (router === undefined) {
        throw new TypeError("The hydrated TanStack router was unavailable.");
      }
      await router.navigate({ to: path });
    }, missingPath);
    await page.getByTestId("route-not-found").waitFor();
    assert.equal(documentRequests, navigationDocumentBaseline);

    await visit(page, "/start");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to documentation" });
    assert.equal(
      await skipLink.evaluate((element) => element === document.activeElement),
      true
    );
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => document.activeElement?.id === "docs-main"),
      true
    );

    await visit(page, knownPath);
    await page
      .getByRole("heading", { name: "Calculate Australian take-home pay" })
      .waitFor();
    await page.screenshot({
      fullPage: true,
      path: fileURLToPath(desktopScreenshot),
    });

    const mobilePage = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: 844, width: 390 },
    });
    mobilePage.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        diagnostics.push(`mobile ${message.type()}: ${message.text()}`);
      }
    });
    mobilePage.on("pageerror", (error) =>
      diagnostics.push(`mobile pageerror: ${error.message}`)
    );
    mobilePage.on("requestfailed", (request) => {
      if (isExpectedServerFunctionAbort(request, origin)) {
        return;
      }

      diagnostics.push(
        `mobile requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`
      );
    });
    await visit(mobilePage, knownPath);
    await mobilePage.getByRole("button", { name: "Open navigation" }).click();
    await mobilePage
      .getByRole("button", { name: "Close navigation" })
      .waitFor();
    await mobilePage.screenshot({
      fullPage: true,
      path: fileURLToPath(mobileScreenshot),
    });

    assert.deepEqual(diagnostics, []);

    return {
      acceptedPlanSha256,
      accessibility: {
        contrastRatio,
        labelledArticle: true,
        labelledMain: true,
        labelledNavigation: true,
        skipLinkFocus: true,
      },
      accountId,
      asset: {
        cacheControl: assetResponse.headers.get("cache-control"),
        contentType: assetResponse.headers.get("content-type"),
        etagPresent: true,
        path: assetPath,
        status: assetResponse.status,
      },
      assetPropagationRetries,
      browser: { name: "chromium", version: browserVersion },
      candidateCommit,
      configSha256,
      deploymentId,
      deploymentInputSha256,
      diagnostics,
      direct404: missingResponse.status,
      environment,
      initialSsr: initialResponse.status,
      lockfileSha256,
      malformedServerFunctionStatus: malformedResponse.status(),
      navigation: {
        client404WithoutDocumentReload: true,
        documentRequestsAdded: 0,
        serverFunctionResponses: serverFunctionResponses.length,
      },
      previewPrNumber,
      previousVersionId,
      rollbackRecoveryIdentity,
      runtime: {
        constructionCounts: [1, 1],
        firstIsolate,
        sameObservedIsolate: firstIsolate === secondIsolate,
        secondIsolate,
      },
      screenshots: [
        {
          kind: "desktop",
          path: desktopEvidencePath,
          sha256: await digest(desktopScreenshot),
          viewport: { deviceScaleFactor: 1, height: 1000, width: 1440 },
        },
        {
          kind: "mobile",
          path: mobileEvidencePath,
          sha256: await digest(mobileScreenshot),
          viewport: { deviceScaleFactor: 1, height: 844, width: 390 },
        },
      ],
      stage,
      stateStoreId,
      url: origin,
      versionId,
      workerName,
    };
  },
} satisfies CloudflareHostedProofHost<Browser>;

const program = runCloudflareHostedProof(playwrightHostedProofHost).pipe(
  Effect.flatMap(Console.log),
  Effect.tapErrorTag("HostedProofConfigurationError", (error) =>
    Console.error(`FAIL [hosted-proof] config=${error.requirement}`)
  ),
  Effect.tapErrorTag("HostedProofExecutionError", (error) =>
    Console.error(`FAIL [hosted-proof] execution=${error.operation}`)
  ),
  Effect.tapErrorTag("HostedProofEvidenceError", (error) =>
    Console.error(`FAIL [hosted-proof] evidence=${error.operation}`)
  ),
  Effect.scoped,
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
