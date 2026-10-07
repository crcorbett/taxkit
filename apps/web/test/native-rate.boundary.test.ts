import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  CalculatorRpcPayload,
  CalculatorRpcVersion,
} from "@taxkit/api-rpc/schemas";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import { toRpcAsync } from "alchemy/Cloudflare/Bridge";
import type { TaxKitApiWorker } from "api/worker";
import {
  Array,
  Clock,
  Duration,
  Effect,
  FileSystem,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { Miniflare } from "miniflare";
import type { WorkerdStructuredLog } from "miniflare";

import {
  nativeMcpSessionExports,
  nativeMcpSessionFixture,
} from "./native-mcp.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

const apiOrigin = "http://127.0.0.1:4214";
const websiteOrigin = "http://127.0.0.1:4213";
const key = "2001:db8::75";
const alias = "2001:0db8:0000:0000:0000:0000:0000:0075";
const Frame = Schema.TaggedStruct("Request", {
  headers: Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
  id: Schema.String,
  payload: CalculatorRpcPayload,
  tag: Schema.Literal("Calculate"),
});

it.live(
  "shares the built native allowance across HTTP, Website and every RPC batch member",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const logs = yield* Queue.make<WorkerdStructuredLog>();
      const exceptions = yield* Queue.make<string>();
      const workers = yield* Effect.forEach(
        [
          {
            entry: "worker.js",
            name: "api-rate",
            output: ".alchemy/native-pair/bundles/TaxKitApi",
          },
          {
            entry: "server.js",
            name: "website-rate",
            output: "apps/web/dist/server",
          },
        ] as const,
        (artifact) =>
          Effect.gen(function* () {
            const modulesRoot = path.join(root, artifact.output);
            const files = yield* fs.glob("**/*.js", { root: modulesRoot });
            expect(files).toContain(artifact.entry);
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
            return {
              config: {
                compatibilityDate: "2026-10-04",
                compatibilityFlags: ["nodejs_compat"],
                env: {
                  ...(artifact.entry === "worker.js"
                    ? {
                        ...nativeRateFixture("10079"),
                        ...nativeMcpSessionFixture(artifact.name),
                      }
                    : {
                        TAXKIT_API: {
                          type: "worker" as const,
                          worker: "api-rate",
                        },
                      }),
                  API_PUBLIC_ORIGIN: {
                    type: "json" as const,
                    value: apiOrigin,
                  },
                  CALCULATOR_HOST_MODE: {
                    type: "json" as const,
                    value: "edge",
                  },
                  WEBSITE_PUBLIC_ORIGIN: {
                    type: "json" as const,
                    value: websiteOrigin,
                  },
                  WORKER_URL: {
                    type: "json" as const,
                    value:
                      artifact.entry === "worker.js"
                        ? apiOrigin
                        : websiteOrigin,
                  },
                },
                exports:
                  artifact.entry === "worker.js"
                    ? nativeMcpSessionExports
                    : undefined,
                manifest: { mainModule: artifact.entry, modules, modulesRoot },
                name: artifact.name,
              },
            };
          })
      );
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
              workers,
            })
        ),
        (value) => Effect.promise(() => value.dispose())
      );
      const api = yield* Effect.promise(() => host.getWorker("api-rate"));
      const website = yield* Effect.promise(() =>
        host.getWorker("website-rate")
      );
      const privateApi = toRpcAsync<typeof TaxKitApiWorker>(api);
      const body = yield* Schema.encodeEffect(
        Schema.fromJsonString(
          CalculatorRpcPayload.fields.request.fields.payload
        )
      )(CalculationRequest.payload);
      const calculate = (address: string) =>
        Effect.promise(() =>
          api.fetch(
            `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
            {
              body,
              headers: {
                "cf-connecting-ip": address,
                "content-type": "application/json",
              },
              method: "POST",
            }
          )
        );
      // workerd counts fixed minute windows. Keep this short burst away from
      // the reset boundary so the test observes one allowance, not two windows.
      const elapsed = (yield* Clock.currentTimeMillis) % 60_000;
      if (elapsed > 55_000) {
        yield* Effect.sleep(Duration.millis(60_050 - elapsed));
      }
      yield* Effect.forEach(Array.range(1, 58), (index) =>
        Effect.gen(function* () {
          const response = yield* calculate(index % 2 === 0 ? alias : key);
          expect(response.status).toBe(200);
          expect(yield* Effect.promise(() => response.text())).toContain(
            '"cents":130100'
          );
        })
      );
      const submit = Effect.promise(() =>
        website.fetch(`${websiteOrigin}/`, {
          body: "grossDollars=1654&period=weekly&taxFreeThresholdClaimed=on",
          headers: {
            "cf-connecting-ip": key,
            "content-type": "application/x-www-form-urlencoded",
          },
          method: "POST",
        })
      ).pipe(
        Effect.flatMap((response) => Effect.promise(() => response.text()))
      );
      expect(yield* submit).toContain("$1,301.00");
      const batch = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Array(Frame))
      )(
        Array.map(Array.range(1, 2), (id) =>
          Frame.make({
            headers: [],
            id: String(id),
            payload: {
              request: CalculationRequest,
              version: CalculatorRpcVersion,
            },
            tag: "Calculate",
          })
        )
      );
      const reply = yield* Effect.promise(() =>
        privateApi.calculatorRequest(
          new Request(`${apiOrigin}/rpc`, {
            body: batch,
            headers: {
              "cf-connecting-ip": "198.51.100.99",
              "content-type": "application/json",
            },
            method: "POST",
          }),
          alias
        )
      );
      const replyText = yield* Effect.promise(() => reply.text());
      expect(replyText.match(/CalculatorRateLimited/gu)).toHaveLength(1);
      expect(replyText).toContain('"Success"');
      const rejected = yield* calculate(key);
      expect(rejected.status).toBe(429);
      expect(rejected.headers.get("retry-after")).toBe("60");
      expect(yield* submit).toContain(
        "Too many calculations were sent. Wait a minute before trying again."
      );
      expect((yield* calculate("198.51.100.99")).status).toBe(200);
      yield* Effect.forEach(
        [
          {},
          { "x-forwarded-for": key },
          { "cf-connecting-ip": "private-canary" },
          { "cf-connecting-ip": key, "cf-worker": "private-canary" },
        ],
        (headers) =>
          Effect.gen(function* () {
            const response = yield* Effect.promise(() =>
              api.fetch(
                `${apiOrigin}/api/v1/calculators/au.pay.take-home/calculate`,
                {
                  body,
                  headers: { ...headers, "content-type": "application/json" },
                  method: "POST",
                }
              )
            );
            expect(response.status).toBe(503);
            expect(yield* Effect.promise(() => response.text())).toContain(
              "calculation-admission-unavailable"
            );
          })
      );
      expect(
        (yield* Effect.promise(() =>
          api.fetch(`${apiOrigin}/api/v1/calculators`)
        )).status
      ).toBe(200);
      const captured = yield* Schema.encodeEffect(
        Schema.fromJsonString(Schema.Unknown)
      )(Array.map(yield* Queue.clear(logs), (log) => log.message));
      yield* Effect.forEach(
        [key, alias, "198.51.100.99", "1654", "130100"],
        (sentinel) =>
          Effect.sync(() => expect(captured).not.toContain(sentinel))
      );
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(Effect.provide(NodeServices.layer), Effect.scoped)
);
