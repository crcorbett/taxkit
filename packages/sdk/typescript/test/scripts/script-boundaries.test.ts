import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import {
  Predicate,
  Function as EffectFunction,
  Array,
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
  Boolean as EffectBoolean,
} from "effect";
import { ChildProcessSpawner } from "effect/process";

import { checkSdkImportBoundaries } from "../../scripts/check-import-boundaries.runtime.js";
import { checkPackedArtifact } from "../../scripts/check-packed-artifact.runtime.js";
import { checkDownstreamConsumer } from "../../scripts/validate-downstream-consumer.runtime.js";
import {
  DependencySectionsManifest,
  PackedPackageManifest,
} from "../../src/internal/artifact-schemas.js";

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
    exitCode: Match.value(mode).pipe(
      Match.when("exit-read", () => Effect.fail(nativeFault)),
      Match.orElse(() => Effect.succeed(ChildProcessSpawner.ExitCode(code)))
    ),
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    isRunning: Effect.succeed(false),
    kill: () => Effect.void,
    pid: ChildProcessSpawner.ProcessId(1),
    stderr: Match.value(mode).pipe(
      Match.when("stderr", () => Stream.fail(nativeFault)),
      Match.orElse(() =>
        Stream.make(new TextEncoder().encode("TAXKIT_SECRET_SENTINEL"))
      )
    ),
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
      EffectFunction.pipe(Option.isNone(value.dependencies), (actual) => {
        expect(actual).toBeTruthy();
      });
      EffectFunction.pipe(Record.get(value, "sideEffects"), (actual) => {
        expect(actual).toStrictEqual(Option.some(false));
      });
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
      EffectFunction.pipe(Result.isFailure(result), (actual) => {
        expect(actual).toBeTruthy();
      });
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
      yield* checkSdkImportBoundaries({
        sdkRoot: "/fixture/sdk",
      }).pipe(
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
                      (): "{}" => "{}"
                    ),
                    Match.when(
                      (value) => value.endsWith("package.json"),
                      (): "{}" => "{}"
                    ),
                    Match.orElse((): "export {};" => "export {};")
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
      http: "{}",
      name: "blocked metadata",
      sdk: '{"dependencies":{"@taxkit/core":"1.0.0"}}',
      source: "export {};",
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: '{"devDependencies":{"taxkit":"workspace:*"}}',
      name: "reverse transport dependency",
      sdk: "{}",
      source: "export {};",
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: '{"devDependencies":{"@taxkit/sdk":"2.1.0"}}',
      name: "reverse transport dependency on the previous package name",
      sdk: "{}",
      source: "export {};",
      tag: "SdkImportPolicyError",
    },
    {
      code: 0,
      http: "{}",
      name: "direct HTTP reference",
      sdk: "{}",
      source: "export {};",
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: "{}",
      name: "root AU reference",
      sdk: "{}",
      source: 'import "./au";',
      tag: "SdkImportPolicyError",
    },
    {
      code: 1,
      http: "{}",
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
      http: "{}",
      name: "failed search",
      sdk: "{}",
      source: "",
      tag: "SdkImportReadError",
    },
  ])("fails closed: $name", (fixture) =>
    Effect.gen(function* () {
      const result = yield* checkSdkImportBoundaries({
        sdkRoot: "/fixture/sdk",
      }).pipe(
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
          EffectFunction.pipe(
            Predicate.isTagged(error, fixture.tag),
            (matches) => {
              expect(matches).toBeTruthy();
            }
          );
          EffectFunction.pipe(String(error), (actual) => {
            expect(actual).not.toContain("TAXKIT_SECRET_SENTINEL");
          });
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
      const stdout = Match.value(mode).pipe(
        Match.when("stdout", () => Stream.fail(nativeFault)),
        Match.orElse(() =>
          Stream.make(new TextEncoder().encode("TAXKIT_SECRET_SENTINEL"))
        )
      );
      const handle = handleFixture(stdout, mode, 23);
      const spawner = ChildProcessSpawner.make(() =>
        Match.value(mode).pipe(
          Match.when("start", () => Effect.fail(nativeFault)),
          Match.orElse(() =>
            Effect.acquireRelease(Effect.succeed(handle), () =>
              Ref.update(closed, (n) => n + 1)
            )
          )
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
        onFailure: (error) => {
          Match.value(error).pipe(
            Match.tag("PackedArtifactCommandError", (failure) => {
              expect(failure.stage).toBe("pack SDK artifact");
              expect(failure.exitCode).toStrictEqual(
                Match.value(mode).pipe(
                  Match.when("nonzero", () => Option.some(23)),
                  Match.orElse(() => Option.none())
                )
              );
              EffectFunction.pipe(String(failure), (actual) => {
                expect(actual).not.toContain("TAXKIT_SECRET_SENTINEL");
              });
            }),
            // oxlint-disable-next-line typescript/strict-void-return -- Effect Match terminal preserves the assertion callbacks; its generic host signature uses any.
            Match.orElse(() => expect.unreachable())
          );
        },
        onSuccess: () => expect.unreachable(),
      });
      expect(yield* Ref.get(removed)).toBe(1);
      expect(yield* Ref.get(closed)).toBe(
        Match.value(mode).pipe(
          Match.when("start", (): 0 => 0),
          Match.orElse((): 1 => 1)
        )
      );
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
            EffectFunction.pipe(
              Stream.make(
                new TextEncoder().encode(
                  Match.value(call).pipe(
                    Match.when(0, (): "/tmp/fixture.tgz" => "/tmp/fixture.tgz"),
                    Match.when(1, () => packedListing),
                    Match.orElse((): "" => "")
                  )
                )
              ),
              (argument1) =>
                EffectFunction.pipe("success", (argument2) =>
                  EffectFunction.pipe(
                    Match.value(mode).pipe(
                      Match.when("failed-command-and-cleanup", (): 23 => 23),
                      Match.orElse((): 0 => 0)
                    ),
                    (argument3) =>
                      handleFixture(argument1, argument2, argument3)
                  )
                )
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
                Match.value(mode).pipe(
                  Match.when(
                    "manifest",
                    (): "TAXKIT_SECRET_SENTINEL" => "TAXKIT_SECRET_SENTINEL"
                  ),
                  Match.orElse(() => packedManifest)
                )
              ),
            remove: () =>
              Ref.update(removed, (n) => n + 1).pipe(
                Effect.andThen(
                  EffectBoolean.match(
                    mode === "cleanup" || mode === "failed-command-and-cleanup",
                    {
                      onFalse: () => Effect.void,
                      onTrue: () => Effect.fail(nativeFault),
                    }
                  )
                )
              ),
            writeFileString: () => Effect.void,
          })
        )
      ),
      Effect.exit
    );
    EffectFunction.pipe(Exit.isSuccess(exit), (actual) => {
      expect(actual).toBe(mode === "success");
    });
    expect(yield* Ref.get(removed)).toBe(1);
    expect(yield* Ref.get(closed)).toBe(yield* Ref.get(calls));
    if (Exit.isFailure(exit)) {
      EffectFunction.pipe(Cause.pretty(exit.cause), (actual) => {
        expect(actual).not.toContain("TAXKIT_SECRET_SENTINEL");
      });
      if (mode === "failed-command-and-cleanup") {
        EffectFunction.pipe(Cause.pretty(exit.cause), (actual) => {
          expect(actual).toContain("PackedArtifactCommandError");
        });
        EffectFunction.pipe(Cause.pretty(exit.cause), (actual) => {
          expect(actual).toContain(
            "Failed to remove the temporary SDK check folder."
          );
        });
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
    const spawner = ChildProcessSpawner.make((command) =>
      Effect.sync(() => {
        const packing = Match.value(command).pipe(
          Match.tag(
            "StandardCommand",
            (value) =>
              value.command === "bun" && Array.contains(value.args, "pack")
          ),
          Match.tag("PipedCommand", () => expect.unreachable()),
          Match.exhaustive
        );
        const code = EffectBoolean.match(
          mode === "build" || (mode === "packed-command" && packing),
          {
            onFalse: (): 0 => 0,
            onTrue: (): 23 => 23,
          }
        );
        return EffectFunction.pipe(
          Stream.make(
            new TextEncoder().encode(
              EffectBoolean.match(packing, {
                onFalse: (): "" => "",
                onTrue: (): "/tmp/fixture.tgz" => "/tmp/fixture.tgz",
              })
            )
          ),
          (argument4) =>
            EffectFunction.pipe("success", (argument5) =>
              EffectFunction.pipe(code, (argument6) =>
                handleFixture(argument4, argument5, argument6)
              )
            )
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
                EffectBoolean.match(
                  path.includes("pack-staging") || mode === "root-manifest",
                  {
                    onFalse: () => rootManifest,
                    onTrue: (): "TAXKIT_SECRET_SENTINEL" =>
                      "TAXKIT_SECRET_SENTINEL",
                  }
                )
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
        EffectFunction.pipe(
          Predicate.isTagged(
            error,
            EffectBoolean.match(mode === "build" || mode === "packed-command", {
              onFalse: (): "DownstreamValidationError" =>
                "DownstreamValidationError",
              onTrue: (): "DownstreamCommandError" => "DownstreamCommandError",
            })
          ),
          (matches) => {
            expect(matches).toBeTruthy();
          }
        );
        Match.value(error).pipe(
          Match.tag("DownstreamCommandError", (failure) => {
            expect(failure.stage).toBe(
              Match.value(mode).pipe(
                Match.when("build", (): "build taxkit" => "build taxkit"),
                Match.orElse(
                  (): "pack workspace manifest for taxkit" =>
                    "pack workspace manifest for taxkit"
                )
              )
            );
            expect(failure.exitCode).toStrictEqual(Option.some(23));
          }),
          // oxlint-disable-next-line typescript/strict-void-return -- Effect Match terminal preserves the assertion callbacks; its generic host signature uses any.
          Match.orElse(() => {
            expect(["root-manifest", "staged-manifest"]).toContain(mode);
          })
        );
        EffectFunction.pipe(String(error), (actual) => {
          expect(actual).not.toContain("TAXKIT_SECRET_SENTINEL");
        });
      },
      onSuccess: () => expect.unreachable(),
    });
    expect(yield* Ref.get(removed)).toBe(
      EffectBoolean.match(mode === "root-manifest" || mode === "build", {
        onFalse: (): 1 => 1,
        onTrue: (): 0 => 0,
      })
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
      const handle = EffectFunction.pipe(
        Stream.fromEffect(
          Deferred.succeed(started, true).pipe(Effect.andThen(Effect.never))
        ),
        (argument7) =>
          EffectFunction.pipe("success", (argument8) =>
            EffectFunction.pipe(0, (argument9) =>
              handleFixture(argument7, argument8, argument9)
            )
          )
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
      EffectFunction.pipe(
        Exit.isFailure(yield* Fiber.await(fiber)),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
      expect(yield* Ref.get(closed)).toBe(1);
      expect(yield* Ref.get(removed)).toBe(1);
    })
);
it.effect.each(["read", "search-start"] as const)(
  "direct import operational failure is bounded: %s",
  (mode) =>
    Effect.gen(function* () {
      const result = yield* checkSdkImportBoundaries({
        sdkRoot: "/fixture/sdk",
      }).pipe(
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
                Match.value(mode).pipe(
                  Match.when("read", () => Effect.fail(nativeFault)),
                  Match.orElse(() =>
                    Effect.succeed(
                      EffectBoolean.match(
                        path.endsWith("/api/http/package.json"),
                        {
                          onFalse: (): "{}" => "{}",
                          onTrue: (): "{}" => "{}",
                        }
                      )
                    )
                  )
                ),
            })
          )
        ),
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) => {
          EffectFunction.pipe(
            Predicate.isTagged(error, "SdkImportReadError"),
            (matches) => {
              expect(matches).toBeTruthy();
            }
          );
          EffectFunction.pipe(String(error), (actual) => {
            expect(actual).not.toContain("TAXKIT_SECRET_SENTINEL");
          });
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
      const stdout = Match.value(mode).pipe(
        Match.when("stdout", () => Stream.fail(nativeFault)),
        Match.orElse(() => Stream.empty)
      );
      const handle = handleFixture(stdout, mode, 0);
      const spawner = ChildProcessSpawner.make(() =>
        Match.value(mode).pipe(
          Match.when("start", () => Effect.fail(nativeFault)),
          Match.orElse(() =>
            Effect.acquireRelease(Effect.succeed(handle), () =>
              Ref.update(closed, (n) => n + 1)
            )
          )
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
        onFailure: (error) => {
          Match.value(error).pipe(
            Match.tag("DownstreamCommandError", (failure) => {
              expect(failure.stage).toBe("build taxkit");
              expect(failure.exitCode).toStrictEqual(Option.none());
              EffectFunction.pipe(String(failure), (actual) => {
                expect(actual).not.toContain("TAXKIT_SECRET_SENTINEL");
              });
            }),
            // oxlint-disable-next-line typescript/strict-void-return -- Effect Match terminal preserves the assertion callbacks; its generic host signature uses any.
            Match.orElse(() => expect.unreachable())
          );
        },
        onSuccess: () => expect.unreachable(),
      });
      expect(yield* Ref.get(closed)).toBe(
        Match.value(mode).pipe(
          Match.when("start", (): 0 => 0),
          Match.orElse((): 1 => 1)
        )
      );
    })
);
it.effect.each(["packed", "downstream"] as const)(
  "bounds stdout and closes a rejected process: %s",
  (owner) =>
    Effect.gen(function* () {
      const closed = yield* Ref.make(0);
      const removed = yield* Ref.make(0);
      const handle = EffectFunction.pipe(
        Stream.make(new TextEncoder().encode("x".repeat(1_048_577))),
        (argument10) =>
          EffectFunction.pipe("success", (argument11) =>
            EffectFunction.pipe(0, (argument12) =>
              handleFixture(argument10, argument11, argument12)
            )
          )
      );
      const spawner = ChildProcessSpawner.make(() =>
        Effect.acquireRelease(Effect.succeed(handle), () =>
          Ref.update(closed, (n) => n + 1)
        )
      );
      const error = yield* Effect.gen(function* runBoundedFixture() {
        return yield* Match.value(owner).pipe(
          Match.when("packed", () => checkPackedArtifact),
          Match.orElse(() => checkDownstreamConsumer)
        );
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
          DownstreamCommandError: (failure) => {
            expect(failure.reason).toBe("output-limit");
          },
          PackedArtifactCommandError: (failure) => {
            expect(failure.reason).toBe("output-limit");
          },
        }),
        // oxlint-disable-next-line typescript/strict-void-return -- Effect Match terminal preserves the assertion callbacks; its generic host signature uses any.
        Match.orElse(() => expect.unreachable())
      );
      expect(yield* Ref.get(closed)).toBe(1);
      expect(yield* Ref.get(removed)).toBe(
        Match.value(owner).pipe(
          Match.when("packed", (): 1 => 1),
          Match.orElse((): 0 => 0)
        )
      );
    })
);
