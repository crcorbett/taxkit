import {
  Array as EffectArray,
  Crypto,
  Effect,
  Fiber,
  FileSystem,
  Match,
  Option,
  Path,
  Queue,
  Ref,
  Schema,
  Stream,
} from "effect";
import { Hex } from "effect/encoding";
import { chromium } from "playwright";
import type {
  ConsoleMessage,
  Page,
  Request,
  Response as BrowserResponse,
  Route,
} from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DocsRecoverableError } from "../src/components/docs-route-states.js";
import type { BuiltBrowserInput } from "./cloudflare-built-proof.boundary.js";
import {
  BuiltBrowserObservation,
  BuiltProofError,
} from "./cloudflare-built-proof.boundary.js";
import { HostedProofSha256 } from "./cloudflare-hosted-proof.boundary.js";

const knownPath = "/guides/calculate-australian-take-home-pay";
const missingPath = "/__docs-evidence__/missing";
const browserFailure = () =>
  new BuiltProofError({ operation: "browser", reason: "start-or-read" });
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
  Schema.Struct({ kind: Schema.Literal("transport-request") }),
  Schema.Struct({ kind: Schema.Literal("missing-asset") }),
  ServerFunctionObservation,
]);
const BrowserObservations = Schema.Struct({
  diagnostics: Schema.Array(Schema.String),
  documentRequests: Schema.Int,
  missingScriptAsset: Schema.Boolean,
  serverFunctions: Schema.Array(ServerFunctionObservation),
  transportRequests: Schema.Int,
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
    transportRequests: 0,
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
    if (
      request.resourceType() === "fetch" ||
      request.resourceType() === "xhr"
    ) {
      enqueue({ kind: "transport-request" });
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
          Match.when({ kind: "transport-request" }, () => ({
            ...current,
            transportRequests: current.transportRequests + 1,
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

const Colors = Schema.Struct({
  background: Schema.String,
  foreground: Schema.String,
});
const Channels = Schema.Tuple([Schema.Finite, Schema.Finite, Schema.Finite]);
const computedContrast = Effect.fnUntraced(function* (
  page: Page,
  foregroundSelector: string,
  backgroundSelector: string
) {
  const colors = yield* Effect.tryPromise({
    catch: browserFailure,
    try: () =>
      page.evaluate(
        ({ foreground, background }) => ({
          background: getComputedStyle(
            document.querySelector(background) ?? document.documentElement
          ).backgroundColor,
          foreground: getComputedStyle(
            document.querySelector(foreground) ?? document.documentElement
          ).color,
        }),
        { background: backgroundSelector, foreground: foregroundSelector }
      ),
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

// The SDK remains private to this adapter. The caller receives only the owning
// checked observation. Scope closes the browser even during a pending request.
export const verifyBuiltBrowser = Effect.fnUntraced(
  function* (config: typeof BuiltBrowserInput.Type) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const crypto = yield* Crypto.Crypto;
    const browser = yield* Effect.acquireRelease(
      Effect.tryPromise({
        catch: browserFailure,
        try: () => chromium.launch({ env: config.environment, headless: true }),
      }),
      (value) =>
        Effect.tryPromise({
          catch: () =>
            new BuiltProofError({
              operation: "cleanup",
              reason: "start-or-read",
            }),
          try: () => value.close(),
        }).pipe(Effect.orDie)
    );
    const page = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => browser.newPage({ viewport: { height: 1000, width: 1440 } }),
    });
    const state = yield* observePage(page, config.origin);
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.goto(`${config.origin}${knownPath}`, { waitUntil: "networkidle" }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.waitForFunction(
          () =>
            window.__TSR_ROUTER__ !== undefined &&
            document.querySelector('[data-tk-hydrated="true"]') !== null &&
            document.querySelector(
              '[data-tk-navigation-interactive="true"]'
            ) !== null
        ),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page
          .getByRole("heading", { name: "Calculate Australian take-home pay" })
          .waitFor(),
    });
    const landmarks = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.getByRole("main").count(),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Literal(1))),
      Effect.mapError(browserFailure)
    );
    const articles = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.getByRole("article").count(),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Literal(1))),
      Effect.mapError(browserFailure)
    );
    const navigation = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.getByRole("navigation", { name: "Documentation" }).count(),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Literal(1))),
      Effect.mapError(browserFailure)
    );
    yield* requireProof(landmarks === 1 && articles === 1 && navigation === 1);
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.evaluate(() => document.activeElement === document.body),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Literal(true))),
      Effect.mapError(browserFailure)
    );
    yield* computedContrast(page, ".docs-article p", ":root");
    const baseline = yield* state.collect;
    const serverResponse = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.waitForResponse(
          (response) =>
            response.url().startsWith(`${config.origin}/_serverFn/`) &&
            (response.request().resourceType() === "fetch" ||
              response.request().resourceType() === "xhr")
        ),
    }).pipe(Effect.forkScoped);
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page
          .getByRole("navigation", { name: "Documentation" })
          .getByRole("link", { exact: true, name: "Reference" })
          .first()
          .click(),
    });
    const observedResponse = yield* Fiber.join(serverResponse);
    yield* Schema.decodeUnknownEffect(Schema.Literal(200))(
      observedResponse.status()
    ).pipe(Effect.mapError(browserFailure));
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.getByRole("heading", { exact: true, name: "Reference" }).waitFor(),
    });
    const navigated = yield* state.collect;
    const added = EffectArray.drop(
      navigated.serverFunctions,
      baseline.serverFunctions.length
    );
    yield* requireProof(
      navigated.documentRequests === baseline.documentRequests &&
        added.length > 0 &&
        EffectArray.every(
          added,
          (response) =>
            response.status === 200 &&
            response.url.startsWith(`${config.origin}/_serverFn/`)
        )
    );
    const firstResponse = yield* EffectArray.head(added).pipe(
      Effect.fromOption,
      Effect.mapError(browserFailure)
    );
    const malformed = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.request.fetch(firstResponse.url, {
          data: Buffer.from("{"),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
    });
    yield* Schema.decodeEffect(
      Schema.Int.check(Schema.isBetween({ maximum: 499, minimum: 400 }))
    )(malformed.status()).pipe(Effect.mapError(browserFailure));
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.evaluate(
          (target) => window.__TSR_ROUTER__?.navigate({ to: target }),
          missingPath
        ),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.getByTestId("route-not-found").waitFor(),
    });
    const missing = yield* state.collect;
    yield* requireProof(
      missing.documentRequests === baseline.documentRequests &&
        missing.transportRequests > 0
    );
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.goto(`${config.origin}/start`, { waitUntil: "networkidle" }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.keyboard.press("Tab"),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page
          .getByRole("link", { name: "Skip to documentation" })
          .evaluate((element) => element === document.activeElement),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Literal(true))),
      Effect.mapError(browserFailure)
    );
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.keyboard.press("Enter"),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.evaluate(() => document.activeElement?.id === "docs-main"),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Literal(true))),
      Effect.mapError(browserFailure)
    );
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.setViewportSize({ height: 844, width: 390 }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.goto(`${config.origin}${knownPath}`, { waitUntil: "networkidle" }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.waitForFunction(
          () =>
            document.querySelector(
              '[data-tk-navigation-interactive="true"]'
            ) !== null
        ),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.getByRole("button", { name: "Open navigation" }).click(),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page
          .getByRole("button", { name: "Close navigation" })
          .getAttribute("aria-expanded"),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Literal("true"))),
      Effect.mapError(browserFailure)
    );
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page
          .getByRole("navigation", { name: "Documentation" })
          .getByRole("link", { name: "Calculate Australian take-home pay" })
          .waitFor(),
    });
    yield* computedContrast(page, ".docs-nav-toggle", ".docs-nav-toggle");
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.setViewportSize({ height: 1000, width: 1440 }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.emulateMedia({ reducedMotion: "reduce" }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.goto(`${config.origin}${knownPath}`, { waitUntil: "networkidle" }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.waitForFunction(
          () =>
            document.querySelector(
              '[data-tk-navigation-interactive="true"]'
            ) !== null
        ),
    });
    const motionSelector =
      ".docs-page-layout, .docs-nav, .docs-nav-toggle, .docs-article, .docs-route-state";
    const motionCount = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.locator(motionSelector).count(),
    }).pipe(
      Effect.flatMap(
        Schema.decodeUnknownEffect(Schema.Int.check(Schema.isGreaterThan(0)))
      ),
      Effect.mapError(browserFailure)
    );
    // Browser callbacks read one DOM node. Native Array/Effect owns traversal in
    // the host; no native map or imported helper runs in the serialised realm.
    yield* Effect.forEach(EffectArray.range(0, motionCount - 1), (index) =>
      Effect.tryPromise({
        catch: browserFailure,
        try: () =>
          page
            .locator(motionSelector)
            .nth(index)
            .evaluate((element) => {
              const style = getComputedStyle(element);
              return {
                animationName: style.animationName,
                transitionDuration: style.transitionDuration,
              };
            }),
      }).pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(
            Schema.Struct({
              animationName: Schema.Literal("none"),
              transitionDuration: Schema.Literal("0s"),
            })
          )
        ),
        Effect.mapError(browserFailure)
      )
    );
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.emulateMedia({ reducedMotion: "no-preference" }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.goto(`${config.origin}/start`, { waitUntil: "networkidle" }),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.waitForFunction(() => window.__TSR_ROUTER__ !== undefined),
    });
    const pendingBaseline = yield* state.collect;
    const routes = yield* Queue.make<Route>({
      capacity: 128,
      strategy: "dropping",
    });
    const routeFailure = yield* Ref.make(Option.none<BuiltProofError>());
    const routeOverflow = yield* Queue.make<boolean>({
      capacity: 1,
      strategy: "dropping",
    });
    const enqueueRoute = (route: Route) => {
      if (!Queue.offerUnsafe(routes, route)) {
        Queue.offerUnsafe(routeOverflow, true);
      }
    };
    const routeWorker = yield* Stream.fromQueue(routes).pipe(
      Stream.mapEffect(
        (route) =>
          Effect.gen(function* () {
            const resource = route.request().resourceType();
            if (resource === "fetch" || resource === "xhr") {
              yield* Effect.sleep(800);
            }
            yield* Effect.tryPromise({
              catch: browserFailure,
              try: () => route.continue(),
            });
          }),
        { concurrency: 16 }
      ),
      Stream.runDrain,
      Effect.catchTag("BuiltProofError", (error) =>
        Ref.set(routeFailure, Option.some(error))
      ),
      Effect.forkScoped
    );
    yield* Effect.acquireRelease(
      Effect.tryPromise({
        catch: browserFailure,
        try: () => page.route("**/*", enqueueRoute),
      }),
      () =>
        Effect.tryPromise({
          catch: browserFailure,
          try: () => page.unroute("**/*", enqueueRoute),
        }).pipe(Effect.orDie)
    );
    const pendingNavigation = yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.evaluate(
          (target) => window.__TSR_ROUTER__?.navigate({ to: target }),
          knownPath
        ),
    }).pipe(Effect.forkScoped);
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.getByTestId("route-pending").waitFor(),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page.getByRole("heading", { name: "Loading documentation" }).waitFor(),
    });
    yield* computedContrast(page, ".docs-route-state p", ":root");
    yield* Fiber.join(pendingNavigation);
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () => page.unroute("**/*", enqueueRoute),
    });
    yield* Fiber.interrupt(routeWorker);
    yield* requireProof((yield* Queue.size(routeOverflow)) === 0);
    yield* Option.match(yield* Ref.get(routeFailure), {
      onNone: () => Effect.void,
      onSome: (error) => Effect.fail(error),
    });
    yield* Effect.tryPromise({
      catch: browserFailure,
      try: () =>
        page
          .getByRole("heading", { name: "Calculate Australian take-home pay" })
          .waitFor(),
    });
    yield* requireProof(
      (yield* state.collect).documentRequests ===
        pendingBaseline.documentRequests
    );
    const recoverableMarkup = yield* Effect.try({
      catch: browserFailure,
      try: () =>
        renderToStaticMarkup(
          createElement(DocsRecoverableError, {
            message: "The documentation source could not be loaded.",
            onRetry: () => false,
          })
        ),
    });
    yield* requireProof(/Docs page is unavailable/u.test(recoverableMarkup));
    const screenshots = yield* Effect.gen(function* () {
      if (!config.captureScreenshots) {
        return [] as const;
      }
      yield* fs.makeDirectory(config.screenshotDirectory, { recursive: true });
      const desktopFile = path.join(config.screenshotDirectory, "desktop.png");
      yield* Effect.tryPromise({
        catch: browserFailure,
        try: () => page.screenshot({ fullPage: true, path: desktopFile }),
      });
      yield* requireProof(
        Number((yield* fs.stat(desktopFile)).size) <= 67_108_864
      );
      const desktopBytes = yield* fs.readFile(desktopFile);
      const desktopSha = yield* crypto
        .digest("SHA-256", desktopBytes)
        .pipe(
          Effect.map(Hex.encode),
          Effect.flatMap(HostedProofSha256.makeEffect)
        );
      const mobile = yield* Effect.tryPromise({
        catch: browserFailure,
        try: () =>
          browser.newPage({
            deviceScaleFactor: 1,
            viewport: { height: 844, width: 390 },
          }),
      });
      const mobileState = yield* observePage(mobile, config.origin);
      yield* Effect.tryPromise({
        catch: browserFailure,
        try: () =>
          mobile.goto(`${config.origin}${knownPath}`, {
            waitUntil: "networkidle",
          }),
      });
      yield* Effect.tryPromise({
        catch: browserFailure,
        try: () =>
          mobile.waitForFunction(
            () =>
              document.querySelector(
                '[data-tk-navigation-interactive="true"]'
              ) !== null
          ),
      });
      yield* Effect.tryPromise({
        catch: browserFailure,
        try: () =>
          mobile.getByRole("button", { name: "Open navigation" }).click(),
      });
      yield* Effect.tryPromise({
        catch: browserFailure,
        try: () =>
          mobile.getByRole("button", { name: "Close navigation" }).waitFor(),
      });
      const mobileFile = path.join(config.screenshotDirectory, "mobile.png");
      yield* Effect.tryPromise({
        catch: browserFailure,
        try: () => mobile.screenshot({ fullPage: true, path: mobileFile }),
      });
      yield* requireProof(
        Number((yield* fs.stat(mobileFile)).size) <= 67_108_864
      );
      const mobileBytes = yield* fs.readFile(mobileFile);
      const mobileSha = yield* crypto
        .digest("SHA-256", mobileBytes)
        .pipe(
          Effect.map(Hex.encode),
          Effect.flatMap(HostedProofSha256.makeEffect)
        );
      yield* requireProof(
        (yield* mobileState.collect).diagnostics.length === 0
      );
      yield* Effect.tryPromise({
        catch: browserFailure,
        try: () => mobile.close(),
      });
      return [
        {
          kind: "desktop",
          path: "screenshots/desktop.png",
          sha256: desktopSha,
          viewport: { deviceScaleFactor: 1, height: 1000, width: 1440 },
        },
        {
          kind: "mobile",
          path: "screenshots/mobile.png",
          sha256: mobileSha,
          viewport: { deviceScaleFactor: 1, height: 844, width: 390 },
        },
      ] as const;
    });
    const finalState = yield* state.collect;
    yield* requireProof(finalState.diagnostics.length === 0);
    return yield* BuiltBrowserObservation.makeEffect({
      browserVersion: browser.version(),
      screenshots,
      serverFunctionRequests: finalState.transportRequests,
    });
  },
  Effect.timeoutOrElse({
    duration: "2 minutes",
    orElse: () =>
      Effect.fail(
        new BuiltProofError({ operation: "browser", reason: "timeout" })
      ),
  }),
  Effect.mapError((error) =>
    Match.value(error).pipe(
      Match.tag("BuiltProofError", (value) => value),
      Match.orElse(browserFailure)
    )
  )
);
