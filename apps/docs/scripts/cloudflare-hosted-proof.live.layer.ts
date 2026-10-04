import {
  Array as EffectArray,
  Crypto,
  Effect,
  FileSystem,
  Layer,
  Match,
  Option,
  Path,
  Queue,
  Record,
  Ref,
  Result,
  Schema,
} from "effect";
import { Hex } from "effect/encoding";
import { Headers, HttpClient } from "effect/http";
import type { HttpClientResponse } from "effect/http/HttpClientResponse";
import { chromium } from "playwright";
import type {
  ConsoleMessage,
  Page,
  Request,
  Response as BrowserResponse,
} from "playwright";

import {
  CloudflareHostedProof,
  HostedProofAssetPropagationError,
  HostedProofExecutionError,
  HostedProofProbe,
  HostedProofSha256,
} from "./cloudflare-hosted-proof.boundary.js";
import type {
  CloudflareHostedProofConfig,
  PropagationRequest,
  PropagationProbe,
} from "./cloudflare-hosted-proof.boundary.js";

const knownPath = "/guides/calculate-australian-take-home-pay";
const missingPath = "/__docs-evidence__/missing";
const runtimeProofHeaders = {
  "x-taxkit-docs-runtime-proof": "construction-count",
};
const browserFailure = () =>
  new HostedProofExecutionError({ operation: "browser-proof" });
// These are proof assertions, not operational exceptions containing SDK data.
const requireProof = (passes: boolean) =>
  passes ? Effect.void : Effect.fail(browserFailure());

const ServerFunctionObservation = Schema.Struct({
  kind: Schema.Literal("server-function"),
  method: Schema.String,
  status: Schema.Int,
  url: Schema.String,
});
const BrowserEvent = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("diagnostic"), text: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("document") }),
  Schema.Struct({ kind: Schema.Literal("missing-asset") }),
  ServerFunctionObservation,
]);
const BrowserObservations = Schema.Struct({
  diagnostics: Schema.Array(Schema.String),
  documentRequests: Schema.Int,
  missingScriptAsset: Schema.Boolean,
  serverFunctions: Schema.Array(ServerFunctionObservation),
});

const isExpectedServerFunctionAbort = (request: Request, origin: string) =>
  (request.resourceType() === "fetch" || request.resourceType() === "xhr") &&
  request.url().startsWith(`${origin}/_serverFn/`) &&
  request.failure()?.errorText === "net::ERR_ABORTED";

// The SDK callbacks can only enqueue observations. They never execute an
// Effect, change application arrays or expose the Page outside this adapter.
const observePage = Effect.fnUntraced(function* (page: Page, origin: string) {
  const events = yield* Queue.make<typeof BrowserEvent.Type>({
    capacity: 1024,
    strategy: "dropping",
  });
  const overflow = yield* Queue.make<boolean>({
    capacity: 1,
    strategy: "dropping",
  });
  const observations = yield* Ref.make<typeof BrowserObservations.Type>({
    diagnostics: [],
    documentRequests: 0,
    missingScriptAsset: false,
    serverFunctions: [],
  });
  const enqueue = (event: typeof BrowserEvent.Type) => {
    if (!Queue.offerUnsafe(events, event)) {
      Queue.offerUnsafe(overflow, true);
    }
  };
  // Listener types come from the installed SDK's event contract.
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error" || message.type() === "warning") {
      enqueue({
        kind: "diagnostic",
        text: `${message.type()}: ${message.text()}`,
      });
    }
  };
  const onError = (error: Error) =>
    enqueue({ kind: "diagnostic", text: `pageerror: ${error.message}` });
  const onFailed = (request: Request) => {
    if (!isExpectedServerFunctionAbort(request, origin)) {
      enqueue({
        kind: "diagnostic",
        text: `requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`,
      });
    }
  };
  const onRequest = (request: Request) => {
    if (request.resourceType() === "document") {
      enqueue({ kind: "document" });
    }
  };
  const onResponse = (response: BrowserResponse) => {
    const request = response.request();
    if (
      response.status() === 404 &&
      response.url().startsWith(origin) &&
      /^\/assets\/[^/?#]+-[A-Za-z0-9_-]{8,}\.js$/u.test(
        response.url().slice(origin.length)
      )
    ) {
      enqueue({ kind: "missing-asset" });
    }
    if (
      (request.resourceType() === "fetch" ||
        request.resourceType() === "xhr") &&
      response.url().includes("/_serverFn/")
    ) {
      enqueue({
        kind: "server-function",
        method: request.method(),
        status: response.status(),
        url: response.url(),
      });
    }
  };
  yield* Effect.acquireRelease(
    Effect.sync(() => {
      page.on("console", onConsole);
      page.on("pageerror", onError);
      page.on("requestfailed", onFailed);
      page.on("request", onRequest);
      page.on("response", onResponse);
    }),
    () =>
      Effect.sync(() => {
        page.off("console", onConsole);
        page.off("pageerror", onError);
        page.off("requestfailed", onFailed);
        page.off("request", onRequest);
        page.off("response", onResponse);
      })
  );
  const collect = Effect.gen(function* () {
    yield* requireProof((yield* Queue.size(overflow)) === 0);
    const incoming = yield* Queue.clear(events);
    return yield* Ref.updateAndGet(observations, (state) =>
      EffectArray.reduce(incoming, state, (current, observedEvent) =>
        Match.value(observedEvent).pipe(
          Match.when({ kind: "diagnostic" }, (event) => ({
            ...current,
            diagnostics: EffectArray.append(current.diagnostics, event.text),
          })),
          Match.when({ kind: "document" }, () => ({
            ...current,
            documentRequests: current.documentRequests + 1,
          })),
          Match.when({ kind: "missing-asset" }, () => ({
            ...current,
            missingScriptAsset: true,
          })),
          Match.when({ kind: "server-function" }, (event) => ({
            ...current,
            serverFunctions: EffectArray.append(current.serverFunctions, event),
          })),
          Match.exhaustive
        )
      )
    );
  });
  return { collect, observations } as const;
});

type ObservationState = Effect.Success<ReturnType<typeof observePage>>;

const visitHydratedPage = Effect.fnUntraced(function* (
  page: Page,
  state: ObservationState,
  origin: string,
  target: string,
  config: Pick<
    typeof PropagationRequest.Type,
    "attempts" | "delayMs" | "hydrationTimeoutMs"
  >
) {
  const attemptVisit: (
    attempt: number
  ) => Effect.Effect<
    number,
    HostedProofExecutionError | HostedProofAssetPropagationError
  > = (attempt) =>
    Effect.gen(function* () {
      const before = yield* state.collect;
      yield* Ref.update(state.observations, (value) => ({
        ...value,
        missingScriptAsset: false,
      }));
      yield* Effect.tryPromise({
        catch: () =>
          new HostedProofExecutionError({ operation: "browser-proof" }),
        try: () =>
          page.goto(`${origin}${target}`, { waitUntil: "domcontentloaded" }),
      });
      const hydration = yield* Effect.tryPromise({
        catch: () =>
          new HostedProofExecutionError({ operation: "browser-proof" }),
        try: () =>
          page.waitForFunction(
            () =>
              window.__TSR_ROUTER__ !== undefined &&
              document.querySelector('[data-tk-hydrated="true"]') !== null &&
              document.querySelector(
                '[data-tk-navigation-interactive="true"]'
              ) !== null,
            undefined,
            { timeout: config.hydrationTimeoutMs }
          ),
      }).pipe(Effect.result);
      const after = yield* state.collect;
      if (Result.isSuccess(hydration)) {
        return attempt - 1;
      }
      if (!after.missingScriptAsset) {
        return yield* hydration.failure;
      }
      if (attempt >= config.attempts) {
        return yield* new HostedProofAssetPropagationError({
          reason: "missing-script-asset",
        });
      }
      yield* Ref.update(state.observations, (value) => ({
        ...value,
        diagnostics: before.diagnostics,
      }));
      yield* Effect.sleep(config.delayMs);
      return yield* attemptVisit(attempt + 1);
    });
  return yield* attemptVisit(1);
});

const Colors = Schema.Struct({
  background: Schema.String,
  foreground: Schema.String,
});
const Channels = Schema.Tuple([Schema.Finite, Schema.Finite, Schema.Finite]);
const computedContrast = Effect.fnUntraced(function* (page: Page) {
  const colors = yield* Effect.tryPromise({
    catch: () => new HostedProofExecutionError({ operation: "browser-proof" }),
    try: () =>
      page.evaluate(() => ({
        background: getComputedStyle(document.documentElement).backgroundColor,
        foreground: getComputedStyle(
          document.querySelector(".docs-article p") ?? document.documentElement
        ).color,
      })),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Colors)),
    Effect.mapError(browserFailure)
  );
  const channels = yield* Effect.forEach(
    [colors.foreground, colors.background],
    (value) =>
      Option.fromNullishOr(value.match(/\d+(?:\.\d+)?/gu)).pipe(
        Option.map((matches) =>
          EffectArray.map(EffectArray.take(matches, 3), Number)
        ),
        Effect.fromOption,
        Effect.flatMap(Schema.decodeUnknownEffect(Channels)),
        Effect.mapError(browserFailure)
      )
  );
  const luminance = EffectArray.map(channels, (color) =>
    EffectArray.reduce(
      EffectArray.zipWith(
        color,
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
      (sum, channel) => sum + channel
    )
  );
  const [foreground, background] = yield* Schema.decodeUnknownEffect(
    Schema.Tuple([Schema.Finite, Schema.Finite])
  )(luminance).pipe(Effect.mapError(browserFailure));
  const ratio =
    (Math.max(foreground, background) + 0.05) /
    (Math.min(foreground, background) + 0.05);
  yield* requireProof(ratio >= 4.5);
  return Number(ratio.toFixed(2));
});

// Browser and Page stay private. Closing the scoped browser retires pending
// Playwright work; interrupting its Promise alone does not prove cancellation.
const acquireBrowser = Effect.acquireRelease(
  Effect.tryPromise({
    catch: () => new HostedProofExecutionError({ operation: "browser-launch" }),
    try: () => chromium.launch({ headless: true }),
  }),
  (browser) =>
    Effect.tryPromise({
      catch: () =>
        new HostedProofExecutionError({ operation: "browser-close" }),
      try: () => browser.close(),
    }).pipe(Effect.orDie)
);

export const CloudflareHostedProofLive = Layer.effect(
  CloudflareHostedProof,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const crypto = yield* Crypto.Crypto;
    const client = yield* HttpClient.HttpClient;
    const repositoryRoot = yield* path.fromFileUrl(
      new URL("../../../", import.meta.url)
    );
    return CloudflareHostedProof.of({
      verifyAssetPropagation: Effect.fn(
        "CloudflareHostedProof.verifyAssetPropagation"
      )(function* (config) {
        const browser = yield* acquireBrowser;
        const page = yield* Effect.tryPromise({
          catch: () =>
            new HostedProofExecutionError({ operation: "browser-proof" }),
          try: () => browser.newPage(),
        });
        const state = yield* observePage(page, config.origin);
        const retries = yield* visitHydratedPage(
          page,
          state,
          config.origin,
          "/guide",
          config
        );
        const routerPresent = yield* Effect.tryPromise({
          catch: () =>
            new HostedProofExecutionError({ operation: "browser-proof" }),
          try: () => page.evaluate(() => window.__TSR_ROUTER__ !== undefined),
        }).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(Schema.Boolean)),
          Effect.mapError(browserFailure)
        );
        const observations = yield* state.collect;
        yield* requireProof(observations.diagnostics.length === 0);
        return {
          diagnostics: observations.diagnostics,
          retries,
          routerPresent,
        } satisfies typeof PropagationProbe.Type;
      }, Effect.scoped),
      verifyHostedDeployment: Effect.fn(
        "CloudflareHostedProof.verifyHostedDeployment"
      )(
        function* (config: CloudflareHostedProofConfig) {
          const browser = yield* acquireBrowser;
          const propagation = {
            attempts: config.hostedPropagationAttempts,
            delayMs: config.hostedPropagationDelayMs,
            hydrationTimeoutMs: 30_000,
          } as const;
          // Native HTTP owns body reading and interruption. Retry only the observed
          // propagation responses (404 or 5xx), retaining the original attempt limit.
          const fetchHostedResponse = (
            target: string,
            expectedStatus: number,
            headers: Readonly<Record<string, string>> = {}
          ) => {
            const visit: (
              attempt: number
            ) => Effect.Effect<
              HttpClientResponse,
              HostedProofExecutionError
            > = (attempt) =>
              Effect.gen(function* () {
                const response = yield* client
                  .get(`${config.origin}${target}`, { headers })
                  .pipe(Effect.mapError(browserFailure));
                if (
                  attempt >= propagation.attempts ||
                  (response.status !== 404 && response.status < 500) ||
                  response.status === expectedStatus
                ) {
                  return response;
                }
                yield* response.text.pipe(Effect.mapError(browserFailure));
                yield* Effect.sleep(propagation.delayMs);
                return yield* visit(attempt + 1);
              });
            return visit(1);
          };
          const initial = yield* fetchHostedResponse(
            knownPath,
            200,
            runtimeProofHeaders
          );
          const initialHtml = yield* initial.text.pipe(
            Effect.mapError(browserFailure)
          );
          yield* requireProof(
            initial.status === 200 &&
              /Calculate Australian take-home pay/u.test(initialHtml) &&
              Headers.get(
                initial.headers,
                "x-taxkit-docs-runtime-constructions"
              ).pipe(Option.contains("1"))
          );
          const firstIsolate = yield* Headers.get(
            initial.headers,
            "x-taxkit-docs-runtime-isolate"
          ).pipe(
            Effect.fromOption,
            Effect.filterOrFail((value) => value.length > 0, browserFailure),
            Effect.mapError(browserFailure)
          );
          const assetPath = yield* Option.fromNullishOr(
            /(?:src|href)="(?<asset>\/assets\/[^"]+\.(?:css|js))"/u.exec(
              initialHtml
            )?.groups
          ).pipe(
            Option.flatMap((groups) => Record.get(groups, "asset")),
            Effect.fromOption,
            Effect.mapError(browserFailure)
          );
          const asset = yield* fetchHostedResponse(assetPath, 200);
          const assetBody = yield* asset.text.pipe(
            Effect.mapError(browserFailure)
          );
          const cacheControl = yield* Headers.get(
            asset.headers,
            "cache-control"
          ).pipe(Effect.fromOption, Effect.mapError(browserFailure));
          const contentType = yield* Headers.get(
            asset.headers,
            "content-type"
          ).pipe(Effect.fromOption, Effect.mapError(browserFailure));
          yield* requireProof(
            asset.status === 200 &&
              /css|javascript/u.test(contentType) &&
              /max-age=31536000/u.test(cacheControl) &&
              /immutable/u.test(cacheControl) &&
              /(?:^|,\s*)public(?:,|$)/u.test(cacheControl) &&
              Headers.get(asset.headers, "etag").pipe(
                Option.exists((value) => value.length > 0)
              ) &&
              !/<!doctype html>/iu.test(assetBody.slice(0, 100))
          );
          const missing = yield* client
            .get(`${config.origin}${missingPath}`, {
              headers: runtimeProofHeaders,
            })
            .pipe(Effect.mapError(browserFailure));
          const missingHtml = yield* missing.text.pipe(
            Effect.mapError(browserFailure)
          );
          const secondIsolate = yield* Headers.get(
            missing.headers,
            "x-taxkit-docs-runtime-isolate"
          ).pipe(Effect.fromOption, Effect.mapError(browserFailure));
          yield* requireProof(
            missing.status === 404 &&
              /Documentation page not found/u.test(missingHtml) &&
              Headers.get(
                missing.headers,
                "x-taxkit-docs-runtime-constructions"
              ).pipe(Option.contains("1")) &&
              firstIsolate === secondIsolate
          );

          const page = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              browser.newPage({ viewport: { height: 1000, width: 1440 } }),
          });
          const state = yield* observePage(page, config.origin);
          const initialRetries = yield* visitHydratedPage(
            page,
            state,
            config.origin,
            knownPath,
            propagation
          );
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page
                .getByRole("heading", {
                  name: "Calculate Australian take-home pay",
                })
                .waitFor(),
          });
          const landmarks = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () => page.getByRole("main").count(),
          }).pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(Schema.Int)),
            Effect.mapError(browserFailure)
          );
          const articles = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () => page.getByRole("article").count(),
          }).pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(Schema.Int)),
            Effect.mapError(browserFailure)
          );
          const navigation = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page.getByRole("navigation", { name: "Documentation" }).count(),
          }).pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(Schema.Int)),
            Effect.mapError(browserFailure)
          );
          yield* requireProof(
            landmarks === 1 && articles === 1 && navigation === 1
          );
          const contrastRatio = yield* computedContrast(page);
          const baseline = yield* state.collect;
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page
                .getByRole("navigation", { name: "Documentation" })
                .getByRole("link", { exact: true, name: "Reference" })
                .first()
                .click(),
          });
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page
                .getByRole("heading", { exact: true, name: "Reference" })
                .waitFor(),
          });
          const navigated = yield* state.collect;
          const addedResponses = EffectArray.drop(
            navigated.serverFunctions,
            baseline.serverFunctions.length
          );
          yield* requireProof(
            navigated.documentRequests === baseline.documentRequests &&
              addedResponses.length > 0 &&
              EffectArray.every(
                addedResponses,
                (response) => response.status === 200
              )
          );
          const observedServerFunction = yield* EffectArray.head(
            addedResponses
          ).pipe(Effect.fromOption, Effect.mapError(browserFailure));
          const malformedStatus = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page.request.fetch(observedServerFunction.url, {
                data: Buffer.from("{"),
                headers: { "content-type": "application/json" },
                method: "POST",
              }),
          }).pipe(
            Effect.flatMap((response) =>
              Schema.decodeUnknownEffect(Schema.Int)(response.status())
            ),
            Effect.mapError(browserFailure)
          );
          yield* requireProof(malformedStatus >= 400 && malformedStatus < 500);
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page.evaluate(
                (target) => window.__TSR_ROUTER__?.navigate({ to: target }),
                missingPath
              ),
          });
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () => page.getByTestId("route-not-found").waitFor(),
          });
          yield* requireProof(
            (yield* state.collect).documentRequests ===
              baseline.documentRequests
          );
          const startRetries = yield* visitHydratedPage(
            page,
            state,
            config.origin,
            "/start",
            propagation
          );
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () => page.keyboard.press("Tab"),
          });
          const skipFocused = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page
                .getByRole("link", { name: "Skip to documentation" })
                .evaluate((element) => element === document.activeElement),
          }).pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(Schema.Boolean)),
            Effect.mapError(browserFailure)
          );
          yield* requireProof(skipFocused);
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () => page.keyboard.press("Enter"),
          });
          const mainFocused = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page.evaluate(() => document.activeElement?.id === "docs-main"),
          }).pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(Schema.Boolean)),
            Effect.mapError(browserFailure)
          );
          yield* requireProof(mainFocused);
          const desktopRetries = yield* visitHydratedPage(
            page,
            state,
            config.origin,
            knownPath,
            propagation
          );
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              page
                .getByRole("heading", {
                  name: "Calculate Australian take-home pay",
                })
                .waitFor(),
          });
          const desktopPath = `${config.evidenceDirectory}/${config.environment}-desktop-${config.candidateCommit.slice(0, 7)}.png`;
          const desktopFile = path.join(repositoryRoot, desktopPath);
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () => page.screenshot({ fullPage: true, path: desktopFile }),
          });
          const desktopBytes = yield* fs
            .readFile(desktopFile)
            .pipe(Effect.mapError(browserFailure));
          const desktopSha = yield* crypto
            .digest("SHA-256", desktopBytes)
            .pipe(
              Effect.map(Hex.encode),
              Effect.flatMap(HostedProofSha256.makeEffect),
              Effect.mapError(browserFailure)
            );
          const mobilePage = yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              browser.newPage({
                deviceScaleFactor: 1,
                viewport: { height: 844, width: 390 },
              }),
          });
          const mobileState = yield* observePage(mobilePage, config.origin);
          const mobileRetries = yield* visitHydratedPage(
            mobilePage,
            mobileState,
            config.origin,
            knownPath,
            propagation
          );
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              mobilePage
                .getByRole("button", { name: "Open navigation" })
                .click(),
          });
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              mobilePage
                .getByRole("button", { name: "Close navigation" })
                .waitFor(),
          });
          const mobilePath = `${config.evidenceDirectory}/${config.environment}-mobile-${config.candidateCommit.slice(0, 7)}.png`;
          const mobileFile = path.join(repositoryRoot, mobilePath);
          yield* Effect.tryPromise({
            catch: () =>
              new HostedProofExecutionError({ operation: "browser-proof" }),
            try: () =>
              mobilePage.screenshot({ fullPage: true, path: mobileFile }),
          });
          const mobileBytes = yield* fs
            .readFile(mobileFile)
            .pipe(Effect.mapError(browserFailure));
          const mobileSha = yield* crypto
            .digest("SHA-256", mobileBytes)
            .pipe(
              Effect.map(Hex.encode),
              Effect.flatMap(HostedProofSha256.makeEffect),
              Effect.mapError(browserFailure)
            );
          const finalDesktop = yield* state.collect;
          const finalMobile = yield* mobileState.collect;
          const diagnostics = EffectArray.appendAll(
            finalDesktop.diagnostics,
            finalMobile.diagnostics
          );
          yield* requireProof(diagnostics.length === 0);
          // New constrained output is constructed through its owner; SDK values
          // were decoded where they entered, and no raw response escapes.
          return yield* HostedProofProbe.makeEffect({
            accessibility: {
              contrastRatio,
              labelledArticle: true,
              labelledMain: true,
              labelledNavigation: true,
              skipLinkFocus: true,
            },
            asset: {
              cacheControl,
              contentType,
              etagPresent: true,
              path: assetPath,
              status: 200,
            },
            assetPropagationRetries:
              initialRetries + startRetries + desktopRetries + mobileRetries,
            browser: { name: "chromium", version: browser.version() },
            diagnostics,
            direct404: 404,
            initialSsr: 200,
            malformedServerFunctionStatus: malformedStatus,
            navigation: {
              client404WithoutDocumentReload: true,
              documentRequestsAdded: 0,
              serverFunctionResponses: finalDesktop.serverFunctions.length,
            },
            runtime: {
              constructionCounts: [1, 1],
              firstIsolate,
              sameObservedIsolate: true,
              secondIsolate,
            },
            screenshots: [
              {
                kind: "desktop",
                path: desktopPath,
                sha256: desktopSha,
                viewport: { deviceScaleFactor: 1, height: 1000, width: 1440 },
              },
              {
                kind: "mobile",
                path: mobilePath,
                sha256: mobileSha,
                viewport: { deviceScaleFactor: 1, height: 844, width: 390 },
              },
            ],
          }).pipe(Effect.mapError(browserFailure));
        },
        Effect.timeoutOrElse({
          duration: "5 minutes",
          orElse: () => Effect.fail(browserFailure()),
        }),
        Effect.scoped,
        Effect.catchTag("HostedProofAssetPropagationError", () =>
          Effect.fail(
            new HostedProofExecutionError({ operation: "asset-propagation" })
          )
        )
      ),
    });
  })
);
