import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

import { readWorkerModules } from "./native-modules.fixture";

const origin = "http://127.0.0.1:4198";
const Json = Schema.fromJsonString(Schema.Unknown);
it.live(
  "contains a real internal settings defect before native framework error egress",
  () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const modulesRoot = path.join(
        root,
        ".alchemy/native-pair/settings-defect/server"
      );
      const { files, modules, wasm } = yield* readWorkerModules({
        modulesRoot,
      });
      expect(files).toContain("index.js");
      expect({
        length: EffectFunction.pipe(
          Record.values(modules),
          Array.some((module) => module.contents.includes('die("PRIVATE9")'))
        ),
        length2: !EffectFunction.pipe(
          Record.values(modules),
          Array.some((module) =>
            module.contents.includes("_createServerFn_handler")
          )
        ),
      }).toStrictEqual({
        length: true,
        length2: true,
      });
      const logs = yield* Queue.make<WorkerdStructuredLog>();
      const exceptions = yield* Queue.make<string>();
      const host = yield* Effect.acquireRelease(
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
              port: 4198,
              workers: [
                {
                  config: {
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    env: {
                      API_PUBLIC_ORIGIN: {
                        type: "json" as const,
                        value: "http://127.0.0.1:4197",
                      },
                      TAXKIT_API: {
                        type: "worker" as const,
                        worker: "taxkit-website-settings-defect",
                      },
                      TAXKIT_PUBLICATION_ORIGIN: {
                        type: "json" as const,
                        value: origin,
                      },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json" as const,
                        value: origin,
                      },
                    },
                    manifest: {
                      mainModule: "index.js",
                      modules: { ...modules, ...wasm },
                      modulesRoot,
                    },
                    name: "taxkit-website-settings-defect",
                  },
                },
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      yield* Effect.promise(() => host.ready).pipe(
        Effect.timeout("10 seconds")
      );
      // The root loader's settings read reaches the injected defect on a
      // plain page request.
      yield* Effect.forEach(
        [{ body: null, headers: { accept: "text/html" }, method: "GET" }],
        (request) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              host.dispatchFetch(`${origin}/`, request)
            );
            const body = yield* Effect.promise(() => response.text());
            expect(body).not.toContain("PRIVATE9");
            // TanStack's native root error egress for an internal defect.
            expect(response.status, request.method).toBe(500);
            EffectFunction.pipe(
              response.headers.get("content-type"),
              (actual) => {
                expect(actual).toContain("text/html");
              }
            );
            expect({
              responseHeadersGetCacheControl:
                response.headers.get("cache-control"),
              responseHeadersGetCloudflareCdnCacheControl: response.headers.get(
                "cloudflare-cdn-cache-control"
              ),
            }).toStrictEqual({
              responseHeadersGetCacheControl: "no-store",
              responseHeadersGetCloudflareCdnCacheControl: "no-store",
            });
            // The root error component is the only page content.
            expect(body).toContain(
              "TaxKit cannot load its settings. Please try again later."
            );
            Array.forEach((marker: string) => {
              expect(body).not.toContain(marker);
            })(["Pay before tax", "1654", "Server Fn Error"]);
            // The dehydrated route error carries no message or stack.
            expect(body).toMatch(/s:"error",e:\$R\[\d+\]=new Error\(""\)/u);
          })
      );
      expect(yield* Queue.clear(exceptions)).toStrictEqual([]);
      const logText = yield* Schema.encodeEffect(Json)(
        yield* Queue.clear(logs)
      );
      // Require positive safe reporting as well as absence of the injected Cause.
      expect(logText).toContain("website.runtime.event");
      Array.forEach((marker: string) => {
        expect(logText).not.toContain(marker);
      })(["PRIVATE9", "Server Fn Error"]);
    }).pipe(
      Effect.timeout("20 seconds"),
      Effect.scoped,
      Effect.provide(NodeServices.layer)
    )
);
