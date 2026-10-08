import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { packEnvValue } from "alchemy/RuntimeContext";
import {
  Array,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
  Queue,
  Record,
  Schema,
} from "effect";
import { Miniflare, Response } from "miniflare";
import type { Request } from "miniflare";

import { WebsiteRelayMediaType } from "../src/lib/analytics/relay/schemas";
import capture from "./fixtures/posthog-1.438.2-relay.json";
import {
  nativeMcpSessionExports,
  nativeMcpSessionFixture,
} from "./native-mcp.fixture";
import { nativeRateFixture } from "./native-rate.fixture";

const CaptureFixture = Schema.Struct({
  requests: Schema.Array(
    Schema.Struct({
      body: Schema.Uint8ArrayFromBase64,
      mediaType: WebsiteRelayMediaType,
      query: Schema.Literals(["", "retry_count=1"]),
    })
  ),
  sdk: Schema.Literal("posthog-js@1.438.2"),
  sourceTarballSha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u)),
  syntheticOnly: Schema.Literal(true),
});

it.live.each(["off", "invalid", "enabled", "redirect"] as const)(
  "the built Website keeps the relay boundary for %s collection",
  (mode) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = path.resolve("../..");
      const apiOrigin = "http://127.0.0.1:4195";
      const websiteOrigin = "http://127.0.0.1:4196";
      const artifacts = yield* Effect.forEach(
        [
          {
            mainModule: "worker.js",
            modulesRoot: path.join(
              root,
              ".alchemy/native-pair/bundles/TaxKitApi"
            ),
          },
          {
            mainModule: "server.js",
            modulesRoot: path.join(root, "apps/web/dist/server"),
          },
        ],
        (artifact) =>
          Effect.gen(function* () {
            const files = yield* fs.glob("**/*.js", {
              root: artifact.modulesRoot,
            });
            expect(files).toContain(artifact.mainModule);
            const modules = Record.fromEntries(
              yield* Effect.forEach(files, (file) =>
                fs
                  .readFileString(path.join(artifact.modulesRoot, file))
                  .pipe(
                    Effect.map(
                      (contents) =>
                        [file, { contents, type: "esm" as const }] as const
                    )
                  )
              )
            );
            return { ...artifact, modules };
          })
      );
      const apiArtifact = Array.get(artifacts, 0).pipe(
        Option.getOrElse(() => expect.fail("Missing API source artifact"))
      );
      const websiteArtifact = Array.get(artifacts, 1).pipe(
        Option.getOrElse(() => expect.fail("Missing Website source artifact"))
      );
      // Positive source oracle: old deployed artefacts cannot pass this fixture.
      expect(
        Array.some(Record.values(websiteArtifact.modules), (module) =>
          module.contents.includes("WebsiteAnalyticsRelay.handle")
        )
      ).toBe(true);
      const outgoing = yield* Queue.make<Request>();
      const exceptions = yield* Queue.make<string>();
      const host = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new Miniflare({
              cf: false,
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
                    env: {
                      ...nativeMcpSessionFixture("relay-api"),
                      ...nativeRateFixture("10179166"),
                      API_PUBLIC_ORIGIN: { type: "json", value: apiOrigin },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                      WORKER_URL: { type: "json", value: apiOrigin },
                    },
                    exports: nativeMcpSessionExports,
                    manifest: apiArtifact,
                    name: "relay-api",
                  },
                },
                {
                  config: {
                    assets: {
                      directory: path.join(root, "apps/web/dist/client"),
                      hasUserWorker: true,
                      runWorkerFirst: false,
                    },
                    compatibilityDate: "2026-10-04",
                    compatibilityFlags: ["nodejs_compat"],
                    env: {
                      API_PUBLIC_ORIGIN: { type: "json", value: apiOrigin },
                      POSTHOG_CAPTURE_TOKEN: {
                        type: "json",
                        value: "phc_synthetic_taxkit_capture_fixture_only",
                      },
                      POSTHOG_COLLECTION_MODE: {
                        type: "json",
                        value: mode === "off" ? "off" : "controlled-preview",
                      },
                      POSTHOG_PROJECT_ID: {
                        type: "json",
                        value: packEnvValue(79),
                      },
                      POSTHOG_REGION: { type: "json", value: "us" },
                      POSTHOG_STAGE: {
                        type: "json",
                        value: mode === "invalid" ? "prod" : "pr-179",
                      },
                      TAXKIT_API: { type: "worker", worker: "relay-api" },
                      WEBSITE_PUBLIC_ORIGIN: {
                        type: "json",
                        value: websiteOrigin,
                      },
                    },
                    manifest: websiteArtifact,
                    name: "relay-website",
                  },
                  dev: {
                    outboundService: {
                      handler: (request) => {
                        Queue.offerUnsafe(outgoing, request);
                        return mode === "redirect"
                          ? new Response("private-redirect-reply", {
                              headers: {
                                location: "https://foreign.example/redirected",
                              },
                              status: 302,
                            })
                          : new Response("rejected", {
                              headers: {
                                "retry-after": "5",
                                "set-cookie": "PRIVATE9",
                              },
                              status: 429,
                            });
                      },
                      type: "fetcher",
                    },
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
      const website = yield* Effect.promise(() =>
        host.getWorker("relay-website")
      );
      const fixture =
        yield* Schema.decodeUnknownEffect(CaptureFixture)(capture);
      yield* Effect.forEach(fixture.requests, (attempt) =>
        Effect.gen(function* () {
          const reply = yield* Effect.promise(() =>
            website.fetch(
              `${websiteOrigin}/ingest/e/${attempt.query === "" ? "" : `?${attempt.query}`}`,
              {
                body: attempt.body,
                headers: {
                  authorization: "Bearer PRIVATE9",
                  "cf-connecting-ip": "203.0.113.9",
                  "content-type": attempt.mediaType,
                  cookie: "private=PRIVATE9",
                  origin: websiteOrigin,
                  traceparent: "00-private-trace",
                  "x-forwarded-for": "203.0.113.9",
                  "x-taxkit-collection-policy": "allow",
                },
                method: "POST",
              }
            )
          );
          expect(reply.status).toBe(
            Match.value(mode).pipe(
              Match.when("off", () => 404),
              Match.when("invalid", () => 503),
              Match.when("redirect", () => 502),
              Match.when("enabled", () => 429),
              Match.exhaustive
            )
          );
          expect(reply.headers.get("cache-control")).toBe("no-store");
          expect(reply.headers.has("location")).toBe(false);
          expect(reply.headers.has("set-cookie")).toBe(false);
          expect(yield* Effect.promise(() => reply.text())).toBe(
            mode === "enabled" ? "rejected" : ""
          );
          const requests = yield* Queue.clear(outgoing);
          if (mode === "off" || mode === "invalid") {
            expect(requests).toEqual([]);
          } else {
            expect(requests).toHaveLength(1);
            const request = Array.head(requests).pipe(
              Option.getOrElse(() =>
                expect.fail("Missing native outbound request")
              )
            );
            expect(request.url).toBe(
              `https://us.i.posthog.com/e/${attempt.query === "" ? "" : `?${attempt.query}`}`
            );
            expect(
              new Uint8Array(yield* Effect.promise(() => request.arrayBuffer()))
            ).toEqual(attempt.body);
            expect(request.headers.get("content-type")).toBe(attempt.mediaType);
            yield* Effect.forEach(
              [
                "authorization",
                "cookie",
                "cf-connecting-ip",
                "x-forwarded-for",
                "traceparent",
                "tracestate",
                "baggage",
                "origin",
              ],
              (name) =>
                Effect.sync(() =>
                  expect(request.headers.has(name), name).toBe(false)
                )
            );
          }
        })
      );
      const denied = yield* Effect.promise(() =>
        website.fetch(`${websiteOrigin}/ingest/e/`, {
          body: "denied-body",
          headers: {
            "content-type": "text/plain",
            dnt: "1",
            origin: websiteOrigin,
          },
          method: "POST",
        })
      );
      expect(denied.status).toBe(
        Match.value(mode).pipe(
          Match.when("off", () => 404),
          Match.when("invalid", () => 503),
          Match.whenOr("enabled", "redirect", () => 204),
          Match.exhaustive
        )
      );
      expect(yield* Queue.clear(outgoing)).toEqual([]);
      expect(yield* Queue.clear(exceptions)).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer))
);
