import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { CalculatorRpcPayload } from "@taxkit/api-rpc/schemas";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import { packEnvValue } from "alchemy/RuntimeContext";
import { Array, Effect, FileSystem, Path, Queue, Record, Schema } from "effect";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

it.live.each(["missing", "invalid", "throwing"] as const)(
  "contains a %s native limiter binding without exposing provider data",
  (mode) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const modulesRoot = path.resolve(
        "../../.alchemy/native-pair/bundles/TaxKitApi"
      );
      const files = yield* fs.glob("**/*.js", { root: modulesRoot });
      expect(files).toContain("worker.js");
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
      const logs = yield* Queue.make<WorkerdStructuredLog>();
      const exceptions = yield* Queue.make<string>();
      const origins = {
        API_PUBLIC_ORIGIN: {
          type: "json" as const,
          value: "https://api.example.com",
        },
        CALCULATOR_RATE_NAMESPACE: {
          type: "json" as const,
          value: packEnvValue("10082"),
        },
        WEBSITE_PUBLIC_ORIGIN: {
          type: "json" as const,
          value: "https://website.example.com",
        },
      };
      const env =
        mode === "missing"
          ? origins
          : {
              ...origins,
              // Deliberately wrong native capability: the live SDK still receives it
              // through WorkerEnvironment and must check its actual reply or failure.
              CALCULATOR_RATE_LIMIT: {
                type: "worker" as const,
                worker: "provider-fixture",
              },
            };
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
              port: 0,
              workers: [
                {
                  config: {
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    env,
                    manifest: { mainModule: "worker.js", modules, modulesRoot },
                    name: "api-provider-proof",
                  },
                },
                {
                  config: {
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    manifest: {
                      mainModule: "provider.js",
                      modules: {
                        "provider.js": {
                          contents: `
              import { WorkerEntrypoint } from "cloudflare:workers";
              export default class extends WorkerEntrypoint {
                limit() { ${mode === "throwing" ? 'throw new Error("PRIVATE9")' : 'return { success: "PRIVATE9" }'}; }
                fetch() { return new Response(null, { status: 404 }); }
              }
            `,
                          type: "esm" as const,
                        },
                      },
                      modulesRoot,
                    },
                    name: "provider-fixture",
                  },
                },
              ],
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      const api = yield* Effect.promise(() =>
        host.getWorker("api-provider-proof")
      );
      const body = yield* Schema.encodeEffect(
        Schema.fromJsonString(
          CalculatorRpcPayload.fields.request.fields.payload
        )
      )(CalculationRequest.payload);
      const response = yield* Effect.promise(() =>
        api.fetch(
          "https://api.example.com/api/v1/calculators/au.pay.take-home/calculate",
          {
            body,
            headers: {
              "cf-connecting-ip": "203.0.113.75",
              "content-type": "application/json",
            },
            method: "POST",
          }
        )
      );
      expect(response.status).toBe(503);
      const text = yield* Effect.promise(() => response.text());
      expect(text).toContain('"_tag":"CalculatorAdmissionUnavailable"');
      expect(text).not.toContain("PRIVATE9");
      expect(text).not.toContain("203.0.113.75");
      expect(
        (yield* Effect.promise(() =>
          api.fetch("https://api.example.com/api/v1/calculators")
        )).status
      ).toBe(200);
      const captured = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Unknown)
      )(Array.map(yield* Queue.clear(logs), (log) => log.message));
      expect(captured).not.toContain("PRIVATE9");
      expect(captured).not.toContain("203.0.113.75");
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped)
);
