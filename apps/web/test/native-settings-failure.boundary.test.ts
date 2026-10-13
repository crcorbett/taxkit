import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Array, Effect, FileSystem, Path, Queue, Record, Schema } from "effect";
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
      // The Website has no generated server-function surface to fall back on.
      expect(
        Array.some(Record.values(modules), (module) =>
          module.contents.includes("_createServerFn_handler")
        )
      ).toBe(false);
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
      // The root loader's settings read reaches the injected defect on both a
      // plain page request and a no-JavaScript form submission.
      yield* Effect.forEach(
        [
          { body: null, headers: { accept: "text/html" }, method: "GET" },
          {
            body: "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on",
            headers: {
              accept: "text/html",
              "content-type": "application/x-www-form-urlencoded",
            },
            method: "POST",
          },
        ],
        (request) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              host.dispatchFetch(`${origin}/`, request)
            );
            const body = yield* Effect.promise(() => response.text());
            expect(body.includes("PRIVATE9"), request.method).toBe(false);
            // TanStack's native root error egress for an internal defect.
            expect(response.status, request.method).toBe(500);
            expect(response.headers.get("content-type")).toContain("text/html");
            expect(response.headers.get("cache-control")).toBe("no-store");
            expect(response.headers.get("cloudflare-cdn-cache-control")).toBe(
              "no-store"
            );
            // The root error component is the only page content.
            expect(body).toContain(
              "TaxKit cannot load its settings. Please try again later."
            );
            expect(body).not.toContain("Pay before tax");
            expect(body).not.toContain("1654");
            expect(body).not.toContain("Server Fn Error");
            // The dehydrated route error carries no message or stack.
            expect(body).toMatch(/s:"error",e:\$R\[\d+\]=new Error\(""\)/u);
          })
      );
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
