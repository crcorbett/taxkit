import { expect } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  FileSystem,
  Option,
  Path,
  Queue,
  Record,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";
import type { Page } from "playwright";

import {
  nativeLocalModeFixture,
  nativeRateFixture,
} from "./native-rate.fixture";
import {
  nativeWorkerCompatibility,
  readWorkerModules,
} from "./native-worker.fixture";

// The page's checked structured data, as a search engine reads it.
export const TechArticleJson = Schema.fromJsonString(
  Schema.Struct({
    description: Schema.String,
    headline: Schema.String,
    image: Schema.URLFromString,
    inLanguage: Schema.Literal("en-AU"),
    url: Schema.URLFromString,
  })
);
export const apiOrigin = "http://127.0.0.1:4197";
export const websiteOrigin = "http://127.0.0.1:4196";
export const form =
  "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on";
// The one cache policy: shared public reads and unshared everything else.
export const publicCache = {
  browser: "public, max-age=0",
  cdn: "public, max-age=604800, stale-if-error=0",
};
export const frameworkSentinel = "PRIVATE9";
// The browser calls the public API directly. Calculation is its only POST.
const calculationPath = /^\/api\/v2\/calculators\/[^/]+\/calculate$/u;
export const isCalculation = (url: URL) =>
  url.origin === apiOrigin && calculationPath.test(url.pathname);
export const takeHomeCalculation = `${apiOrigin}/api/v2/calculators/au.pay.take-home/calculate`;
export const docsNavigationAddress = `${apiOrigin}/api/v2/docs/navigation`;
export const docsPageAddress = (path: string) =>
  `${apiOrigin}/api/v2/docs/page?${new URLSearchParams({ path })}`;
export const Json = Schema.fromJsonString(Schema.Unknown);
const ColourChannel = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(255)
);
const ColourChannels = Schema.Tuple([
  ColourChannel,
  ColourChannel,
  ColourChannel,
]);
export const expectReadableText = Effect.fnUntraced(function* ({
  page,
  selector,
}: {
  readonly page: Page;
  readonly selector: string;
}) {
  const colours = yield* Effect.promise(() =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => {
        // Let the browser resolve modern CSS and system colours into sRGB.
        // Read the actual reader surface, including themed recovery pages.
        const context = document.createElement("canvas").getContext("2d");
        const channels = (colour: string) => {
          if (context) {
            context.fillStyle = colour;
            context.fillRect(0, 0, 1, 1);
            const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
            return [red, green, blue];
          }
          return [];
        };
        const surface =
          element.closest(".docs-reader") ?? document.documentElement;
        return [
          channels(getComputedStyle(element).color),
          channels(getComputedStyle(surface).backgroundColor),
        ];
      })
  ).pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(Schema.Tuple([ColourChannels, ColourChannels]))
    )
  );
  const luminance = EffectFunction.pipe(
    colours,
    Array.map((channels) =>
      EffectFunction.pipe(
        Array.zipWith(channels, [0.2126, 0.7152, 0.0722], (channel, weight) => {
          const normalised = channel / 255;
          return (
            EffectBoolean.match(normalised <= 0.04045, {
              onFalse: () => ((normalised + 0.055) / 1.055) ** 2.4,
              onTrue: () => normalised / 12.92,
            }) * weight
          );
        }),
        Array.reduce(0, (sum, value) => sum + value)
      )
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
// Both built Workers, read once from the native build's output.
export const readNativePairBundles = Effect.fnUntraced(
  function* readNativePairBundles() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = path.resolve(".");
    const screenshotRoot = path.join(root, ".alchemy/native-pair/screenshots");
    yield* fs.makeDirectory(screenshotRoot, { recursive: true });
    const apiRoot = path.join(root, ".alchemy/native-pair/bundles/TaxKitApi");
    const websiteRoot = path.join(root, "apps/web/dist/server");
    const {
      files: apiFiles,
      modules: apiModules,
      wasm: apiWasm,
    } = yield* readWorkerModules({
      modulesRoot: apiRoot,
    });
    const { files: websiteFiles, modules: websiteModules } =
      yield* readWorkerModules({
        modulesRoot: websiteRoot,
      });
    return {
      root,
      screenshotRoot,
      apiRoot,
      websiteRoot,
      apiFiles,
      apiModules,
      apiWasm,
      websiteFiles,
      websiteModules,
    };
  }
);
export type NativePairBundles = Effect.Success<
  ReturnType<typeof readNativePairBundles>
>;
// The public API host, then the Website host with its private API binding.
export const startNativePairHosts = Effect.fnUntraced(
  function* startNativePairHosts({
    root,
    apiRoot,
    websiteRoot,
    apiModules,
    apiWasm,
    websiteModules,
  }: NativePairBundles) {
    const path = yield* Path.Path;
    const logs = yield* Queue.make<WorkerdStructuredLog>();
    const exceptions = yield* Queue.make<string>();
    const apiWorker = (name: string) => ({
      config: {
        ...nativeWorkerCompatibility,
        env: {
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
          modules: { ...apiModules, ...apiWasm },
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
        ...nativeWorkerCompatibility,
        env: {
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
          mainModule: "entry.server.js",
          modules: websiteModules,
          modulesRoot: websiteRoot,
        },
        name,
      },
    });
    const docsFixtureWorkers = yield* EffectFunction.pipe(
      ["Address"] as const,
      Effect.forEach((mode) =>
        Effect.gen(function* () {
          const modulesRoot = path.join(
            root,
            `.alchemy/native-pair/bundles/TaxKitApiDocs${mode}`
          );
          const { files, modules, wasm } = yield* readWorkerModules({
            modulesRoot,
          });
          expect(files).toContain("worker.js");
          EffectFunction.pipe(
            Record.values(modules),
            Array.some(
              (module) =>
                module.contents.includes("PRIVATE9") ||
                module.contents.includes("/private9")
            ),
            (actual) => {
              expect(actual).toBeTruthy();
            }
          );
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
                    modules: { ...modules, ...wasm },
                    modulesRoot,
                  },
                },
              },
              websiteWorker(`taxkit-website-docs-${mode}`, name),
            ],
          };
        })
      )
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
    return { logs, exceptions, publicApi, website, docsFixtureWorkers };
  }
);
export type NativePairHosts = Effect.Success<
  ReturnType<typeof startNativePairHosts>
>;
