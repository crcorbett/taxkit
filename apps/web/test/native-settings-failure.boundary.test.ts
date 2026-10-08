import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Option,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

const origin = "http://127.0.0.1:4198";
const Json = Schema.fromJsonString(Schema.Unknown);

it.live(
  "contains a real internal settings defect before native framework error egress",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const modulesRoot = path.join(
        root,
        ".alchemy/native-pair/settings-defect/server"
      );
      const files = yield* fs.glob("**/*.js", { root: modulesRoot });
      const modules = Record.fromEntries(
        yield* Effect.forEach(files, (file) =>
          fs
            .readFileString(path.join(modulesRoot, file))
            .pipe(
              Effect.map(
                (contents) =>
                  [file, { contents, type: "esm" as const }] as const
              )
            )
        )
      );
      expect(files).toContain("server.js");
      // The actual source-built application must contain the injected operation.
      // An ordinary artifact or an empty fake cannot satisfy this fault oracle.
      expect(
        Array.some(Record.values(modules), (module) =>
          module.contents.includes('die("PRIVATE9")')
        )
      ).toBe(true);
      const functionId = Array.findFirst(Record.values(modules), (module) =>
        module.contents.includes(
          'functionName: "websiteSettings_createServerFn_handler"'
        )
      ).pipe(
        Option.flatMap((module) =>
          Option.fromNullishOr(
            module.contents.match(
              /"(?<functionId>[a-f0-9]{64})":\s*\{\s*functionName:\s*"websiteSettings_createServerFn_handler"/u
            )?.groups
          ).pipe(Option.flatMap(Record.get("functionId")))
        ),
        Option.getOrElse(() =>
          expect.fail("Missing native settings function identity")
        )
      );
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
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json" as const,
                        value: origin,
                      },
                    },
                    manifest: { mainModule: "server.js", modules, modulesRoot },
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
      const response = yield* Effect.promise(() =>
        host.dispatchFetch(`${origin}/_serverFn/${functionId}`, {
          headers: {
            origin,
            "sec-fetch-site": "same-origin",
            "x-tsr-serverFn": "true",
          },
        })
      );
      const body = yield* Effect.promise(() => response.text());
      expect(body.includes("PRIVATE9")).toBe(false);
      expect(response.status).toBe(500);
      expect(body).toBe("");
      expect(yield* Queue.clear(exceptions)).toEqual([]);
      const logText = yield* Schema.encodeEffect(Json)(
        yield* Queue.clear(logs)
      );
      // Require positive safe reporting as well as absence of the injected Cause.
      expect(logText).toContain("website.runtime.event");
      expect(logText).not.toContain("PRIVATE9");
      expect(logText).not.toContain("Server Fn Error");
    }).pipe(
      Effect.timeout("20 seconds"),
      Effect.scoped,
      Effect.provide(NodeServices.layer)
    )
);
