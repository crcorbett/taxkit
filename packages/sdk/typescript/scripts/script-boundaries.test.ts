import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import {
  Cause,
  Deferred,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Layer,
  Match,
  Option,
  PlatformError,
  Record,
  Ref,
  Result,
  Schema,
  Sink,
  Stream,
} from "effect";
import { ChildProcessSpawner } from "effect/process";

import { checkSdkImportBoundaries } from "./check-import-boundaries.runtime.js";
import { checkPackedArtifact } from "./check-packed-artifact.runtime.js";
import {
  DependencySectionsManifest,
  PackedPackageManifest,
} from "./schemas.js";
import { checkDownstreamConsumer } from "./validate-downstream-consumer.runtime.js";

const nativeFault = PlatformError.badArgument({
  description: "TAXKIT_SECRET_SENTINEL",
  method: "controlled-fixture",
  module: "FileSystem",
});
const packedManifest = `{"dependencies":{"effect":"4.0.0"},"exports":{".":{"default":"./dist/index.js","types":"./dist/index.d.ts"}}}`;
const rootManifest = `{"workspaces":{"catalog":{"effect":"4.0.0","typescript":"7.0.2","@types/bun":"1.4.0"}}}`;
const packedListing = "package/dist/index.js\npackage/dist/index.d.ts\n";

const handleFixture = (
  stdout: Stream.Stream<Uint8Array, PlatformError.PlatformError>,
  mode: string,
  code: number
) =>
  ChildProcessSpawner.makeHandle({
    all: Stream.empty,
    exitCode:
      mode === "exit-read"
        ? Effect.fail(nativeFault)
        : Effect.succeed(ChildProcessSpawner.ExitCode(code)),
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    isRunning: Effect.succeed(false),
    kill: () => Effect.void,
    pid: ChildProcessSpawner.ProcessId(1),
    stderr:
      mode === "stderr"
        ? Stream.fail(nativeFault)
        : Stream.make(new TextEncoder().encode("TAXKIT_SECRET_SENTINEL")),
    stdin: Sink.drain,
    stdout,
    unref: Effect.succeed(Effect.void),
  });

it.effect(
  "round-trips missing dependency keys and uninterpreted metadata once",
  () =>
    Effect.gen(function* () {
      const codec = Schema.fromJsonString(PackedPackageManifest);
      const wire = `{"name":"@taxkit/fixture","version":"1.0.0","files":["dist"],"exports":{".":{"default":"./dist/index.js","types":"./dist/index.d.ts"}},"publishConfig":{"access":"public","exports":{".":{"default":"./dist/index.js","types":"./dist/index.d.ts"}}},"sideEffects":false,"custom":{"retained":true}}`;
      const value = yield* Schema.decodeEffect(codec)(wire);
      expect(Option.isNone(value.dependencies)).toBe(true);
      expect(Record.get(value, "sideEffects")).toEqual(Option.some(false));
      const encoded = yield* Schema.encodeEffect(codec)(value);
      expect(encoded).toContain('"sideEffects":false');
      expect(encoded).toContain('"custom":{"retained":true}');
      expect(encoded).toContain('"access":"public"');
      expect(encoded).not.toContain('"dependencies"');
      expect(encoded).not.toContain('"source"');
    })
);
it.effect(
  "rejects null dependency sections rather than treating them as absent",
  () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeEffect(
        Schema.fromJsonString(DependencySectionsManifest)
      )('{"dependencies":null}').pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
    })
);

describe("SDK direct import command", () => {
  it.effect("accepts the checked direction and closes both searches", () =>
    Effect.gen(function* () {
      const closed = yield* Ref.make(0);
      const handle = handleFixture(Stream.empty, "success", 1);
      const spawner = ChildProcessSpawner.make(() =>
        Effect.acquireRelease(Effect.succeed(handle), () =>
          Ref.update(closed, (n) => n + 1)
        )
      );
      yield* checkSdkImportBoundaries("/fixture/sdk").pipe(
        Effect.scoped,
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              readFileString: (path) =>
                Effect.succeed(
                  Match.value(path).pipe(
                    Match.when(
                      (value) => value.endsWith("/api/http/package.json"),
                      () => '{"dependencies":{"@taxkit/sdk":"workspace:*"}}'
                    ),
                    Match.when(
                      (value) => value.endsWith("package.json"),
                      () => "{}"
                    ),
                    Match.orElse(() => "export {};")
                  )
                ),
            })
          )
        )
      );
      expect(yield* Ref.get(closed)).toBe(2);
    })
  );
  it.effect.each([
    {
      code: 1,
      http: '{"dependencies":{"@taxkit/sdk":"1.0.0"}}',
      name: "blocked metadata",
      sdk: '{"devDependencies":{"@taxkit/api-http":"1.0.0"}}',
      source: "export {};",
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: "{}",
      name: "missing transport direction",
      sdk: "{}",
      source: "export {};",
      tag: "SdkImportPolicyError",
    },
    {
      code: 0,
      http: '{"dependencies":{"@taxkit/sdk":"1.0.0"}}',
      name: "direct HTTP reference",
      sdk: "{}",
      source: "export {};",
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: '{"dependencies":{"@taxkit/sdk":"1.0.0"}}',
      name: "root AU reference",
      sdk: "{}",
      source: 'import "./au";',
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: '{"dependencies":{"@taxkit/sdk":"1.0.0"}}',
      name: "browser server reference",
      sdk: "{}",
      source: 'import "node:fs";',
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: "{}",
      name: "malformed manifest",
      sdk: "TAXKIT_SECRET_SENTINEL",
      source: "",
      tag: "SdkImportReadError",
    },
    {
      code: 2,
      http: '{"dependencies":{"@taxkit/sdk":"1.0.0"}}',
      name: "failed search",
      sdk: "{}",
      source: "",
      tag: "SdkImportReadError",
    },
  ])("fails closed: $name", (fixture) =>
    Effect.gen(function* () {
      const result = yield* checkSdkImportBoundaries("/fixture/sdk").pipe(
        Effect.scoped,
        Effect.provideService(
          ChildProcessSpawner.ChildProcessSpawner,
          ChildProcessSpawner.make(() =>
            Effect.succeed(handleFixture(Stream.empty, "success", fixture.code))
          )
        ),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              readFileString: (path) =>
                Effect.succeed(
                  Match.value(path).pipe(
                    Match.when(
                      (value) => value.endsWith("/api/http/package.json"),
                      () => fixture.http
                    ),
                    Match.when(
                      (value) => value.endsWith("package.json"),
                      () => fixture.sdk
                    ),
                    Match.orElse(() => fixture.source)
                  )
                ),
            })
          )
        ),
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) => {
          expect(error._tag).toBe(fixture.tag);
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.unreachable(),
      });
    })
  );
});

it.effect.each(["start", "stdout", "stderr", "exit-read", "nonzero"] as const)(
  "packed command retains safe failure and cleanup: %s",
  (mode) =>
    Effect.gen(function* () {
      const removed = yield* Ref.make(0);
      const closed = yield* Ref.make(0);
      const handle = handleFixture(
        mode === "stdout"
          ? Stream.fail(nativeFault)
          : Stream.make(new TextEncoder().encode("TAXKIT_SECRET_SENTINEL")),
        mode,
        23
      );
      const spawner = ChildProcessSpawner.make(() =>
        mode === "start"
          ? Effect.fail(nativeFault)
          : Effect.acquireRelease(Effect.succeed(handle), () =>
              Ref.update(closed, (n) => n + 1)
            )
      );
      const result = yield* checkPackedArtifact.pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              makeDirectory: () => Effect.void,
              makeTempDirectory: () => Effect.succeed("/fixture/smoke"),
              remove: () => Ref.update(removed, (n) => n + 1),
            })
          )
        ),
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("PackedArtifactCommandError", (failure) => {
              expect(failure.stage).toBe("pack SDK artifact");
              expect(failure.exitCode).toEqual(
                mode === "nonzero" ? Option.some(23) : Option.none()
              );
              expect(String(failure)).not.toContain("TAXKIT_SECRET_SENTINEL");
            }),
            Match.orElse(() => expect.unreachable())
          ),
        onSuccess: () => expect.unreachable(),
      });
      expect(yield* Ref.get(removed)).toBe(1);
      expect(yield* Ref.get(closed)).toBe(mode === "start" ? 0 : 1);
    })
);

it.effect.each([
  "success",
  "manifest",
  "cleanup",
  "failed-command-and-cleanup",
] as const)("packed scope completes or retains bounded failure: %s", (mode) =>
  Effect.gen(function* () {
    const removed = yield* Ref.make(0);
    const calls = yield* Ref.make(0);
    const closed = yield* Ref.make(0);
    const spawner = ChildProcessSpawner.make(() =>
      Effect.gen(function* () {
        const call = yield* Ref.getAndUpdate(calls, (n) => n + 1);
        expect(yield* Ref.get(closed)).toBe(call);
        return yield* Effect.acquireRelease(
          Effect.succeed(
            handleFixture(
              Stream.make(
                new TextEncoder().encode(
                  Match.value(call).pipe(
                    Match.when(0, () => "/tmp/fixture.tgz"),
                    Match.when(1, () => packedListing),
                    Match.orElse(() => "")
                  )
                )
              ),
              "success",
              mode === "failed-command-and-cleanup" ? 23 : 0
            )
          ),
          () => Ref.update(closed, (n) => n + 1)
        );
      })
    );
    const exit = yield* checkPackedArtifact.pipe(
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      Effect.provide(
        Layer.merge(
          BunServices.layer,
          FileSystem.layerNoop({
            makeDirectory: () => Effect.void,
            makeTempDirectory: () => Effect.succeed("/fixture/smoke"),
            readFileString: () =>
              Effect.succeed(
                mode === "manifest" ? "TAXKIT_SECRET_SENTINEL" : packedManifest
              ),
            remove: () =>
              Ref.update(removed, (n) => n + 1).pipe(
                Effect.andThen(
                  mode === "cleanup" || mode === "failed-command-and-cleanup"
                    ? Effect.fail(nativeFault)
                    : Effect.void
                )
              ),
            writeFileString: () => Effect.void,
          })
        )
      ),
      Effect.exit
    );
    expect(Exit.isSuccess(exit)).toBe(mode === "success");
    expect(yield* Ref.get(removed)).toBe(1);
    expect(yield* Ref.get(closed)).toBe(yield* Ref.get(calls));
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).not.toContain("TAXKIT_SECRET_SENTINEL");
      if (mode === "failed-command-and-cleanup") {
        expect(Cause.pretty(exit.cause)).toContain(
          "PackedArtifactCommandError"
        );
        expect(Cause.pretty(exit.cause)).toContain(
          "Failed to remove the temporary SDK check folder."
        );
      }
    }
  })
);

it.effect.each([
  "root-manifest",
  "build",
  "packed-command",
  "staged-manifest",
] as const)("downstream checker stops safely: %s", (mode) =>
  Effect.gen(function* () {
    const removed = yield* Ref.make(0);
    const calls = yield* Ref.make(0);
    const spawner = ChildProcessSpawner.make(() =>
      Effect.gen(function* () {
        const call = yield* Ref.getAndUpdate(calls, (n) => n + 1);
        const code =
          mode === "build" || (mode === "packed-command" && call === 8)
            ? 23
            : 0;
        return handleFixture(
          Stream.make(
            new TextEncoder().encode(call >= 8 ? "/tmp/fixture.tgz" : "")
          ),
          "success",
          code
        );
      })
    );
    const result = yield* checkDownstreamConsumer.pipe(
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      Effect.provide(
        Layer.merge(
          BunServices.layer,
          FileSystem.layerNoop({
            makeDirectory: () => Effect.void,
            makeTempDirectory: () =>
              Effect.succeed("/tmp/sdk-downstream-fixture"),
            readFileString: (path) =>
              Effect.succeed(
                path.includes("pack-staging") || mode === "root-manifest"
                  ? "TAXKIT_SECRET_SENTINEL"
                  : rootManifest
              ),
            remove: () => Ref.update(removed, (n) => n + 1),
            writeFileString: () => Effect.void,
          })
        )
      ),
      Effect.result
    );
    Result.match(result, {
      onFailure: (error) => {
        expect(error._tag).toBe(
          mode === "build" || mode === "packed-command"
            ? "DownstreamCommandError"
            : "DownstreamValidationError"
        );
        expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
      },
      onSuccess: () => expect.unreachable(),
    });
    expect(yield* Ref.get(removed)).toBe(
      mode === "root-manifest" || mode === "build" ? 0 : 1
    );
  })
);

it.effect(
  "interrupting the packed checker closes its process and temporary folder",
  () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<true>();
      const closed = yield* Ref.make(0);
      const removed = yield* Ref.make(0);
      const handle = handleFixture(
        Stream.fromEffect(
          Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
        ),
        "success",
        0
      );
      const spawner = ChildProcessSpawner.make(() =>
        Effect.acquireRelease(Effect.succeed(handle), () =>
          Ref.update(closed, (n) => n + 1)
        )
      );
      const fiber = yield* checkPackedArtifact.pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              makeDirectory: () => Effect.void,
              makeTempDirectory: () => Effect.succeed("/fixture/smoke"),
              remove: () => Ref.update(removed, (n) => n + 1),
            })
          )
        ),
        Effect.forkChild
      );
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      expect(Exit.isFailure(yield* Fiber.await(fiber))).toBe(true);
      expect(yield* Ref.get(closed)).toBe(1);
      expect(yield* Ref.get(removed)).toBe(1);
    })
);

it.effect.each(["read", "search-start"] as const)(
  "direct import operational failure is bounded: %s",
  (mode) =>
    Effect.gen(function* () {
      const result = yield* checkSdkImportBoundaries("/fixture/sdk").pipe(
        Effect.scoped,
        Effect.provideService(
          ChildProcessSpawner.ChildProcessSpawner,
          ChildProcessSpawner.make(() => Effect.fail(nativeFault))
        ),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              readFileString: (path) =>
                mode === "read"
                  ? Effect.fail(nativeFault)
                  : Effect.succeed(
                      path.endsWith("/api/http/package.json")
                        ? '{"dependencies":{"@taxkit/sdk":"workspace:*"}}'
                        : "{}"
                    ),
            })
          )
        ),
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) => {
          expect(error._tag).toBe("SdkImportReadError");
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.unreachable(),
      });
    })
);

it.effect.each(["start", "stdout", "stderr", "exit-read"] as const)(
  "downstream command operational failure is bounded: %s",
  (mode) =>
    Effect.gen(function* () {
      const closed = yield* Ref.make(0);
      const handle = handleFixture(
        mode === "stdout" ? Stream.fail(nativeFault) : Stream.empty,
        mode,
        0
      );
      const spawner = ChildProcessSpawner.make(() =>
        mode === "start"
          ? Effect.fail(nativeFault)
          : Effect.acquireRelease(Effect.succeed(handle), () =>
              Ref.update(closed, (n) => n + 1)
            )
      );
      const result = yield* checkDownstreamConsumer.pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              readFileString: () => Effect.succeed(rootManifest),
            })
          )
        ),
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("DownstreamCommandError", (failure) => {
              expect(failure.stage).toBe("build @taxkit/core");
              expect(failure.exitCode).toEqual(Option.none());
              expect(String(failure)).not.toContain("TAXKIT_SECRET_SENTINEL");
            }),
            Match.orElse(() => expect.unreachable())
          ),
        onSuccess: () => expect.unreachable(),
      });
      expect(yield* Ref.get(closed)).toBe(mode === "start" ? 0 : 1);
    })
);

it.effect.each(["packed", "downstream"] as const)(
  "bounds stdout and closes a rejected process: %s",
  (owner) =>
    Effect.gen(function* () {
      const closed = yield* Ref.make(0);
      const removed = yield* Ref.make(0);
      const handle = handleFixture(
        Stream.make(new TextEncoder().encode("x".repeat(1_048_577))),
        "success",
        0
      );
      const spawner = ChildProcessSpawner.make(() =>
        Effect.acquireRelease(Effect.succeed(handle), () =>
          Ref.update(closed, (n) => n + 1)
        )
      );
      const error = yield* Effect.gen(function* runBoundedFixture() {
        return yield* owner === "packed"
          ? checkPackedArtifact
          : checkDownstreamConsumer;
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              makeDirectory: () => Effect.void,
              makeTempDirectory: () => Effect.succeed("/fixture/smoke"),
              readFileString: () => Effect.succeed(rootManifest),
              remove: () => Ref.update(removed, (n) => n + 1),
            })
          )
        ),
        Effect.flip
      );
      Match.value(error).pipe(
        Match.tags({
          DownstreamCommandError: (failure) =>
            expect(failure.reason).toBe("output-limit"),
          PackedArtifactCommandError: (failure) =>
            expect(failure.reason).toBe("output-limit"),
        }),
        Match.orElse(() => expect.unreachable())
      );
      expect(yield* Ref.get(closed)).toBe(1);
      expect(yield* Ref.get(removed)).toBe(owner === "packed" ? 1 : 0);
    })
);
