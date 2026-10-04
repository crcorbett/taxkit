import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { DocsContentService } from "@taxkit/docs-content/service";
import { Effect, Exit, FileSystem, Layer, Path, Ref } from "effect";

import {
  createDocsRuntime,
  createDocsRuntimeProbeLayer,
  readDocsRuntimeProbe,
} from "./runtime-factory.server";

const contentService = DocsContentService.of({
  getNavigation: () => Effect.die("not used"),
  getPage: () => Effect.die("not used"),
  listPages: () => Effect.die("not used"),
  validateContent: () => Effect.die("not used"),
});

describe("docs server runtime ownership", () => {
  test.effect(
    "owns content and deterministic proof state for the managed lifetime",
    () =>
      Effect.gen(function* () {
        const constructions = yield* Ref.make(0);
        const releases = yield* Ref.make(0);
        yield* Effect.gen(function* () {
          const runtime = yield* Effect.acquireRelease(
            Effect.sync(() =>
              createDocsRuntime(
                Layer.effect(
                  DocsContentService,
                  Effect.acquireRelease(
                    Ref.update(constructions, (count) => count + 1).pipe(
                      Effect.as(contentService)
                    ),
                    () => Ref.update(releases, (count) => count + 1)
                  )
                ),
                createDocsRuntimeProbeLayer(
                  Effect.succeed("deterministic-test-isolate")
                )
              )
            ),
            (ownedRuntime) => ownedRuntime.disposeEffect
          );
          const contexts = yield* Effect.all(
            [runtime.contextEffect, runtime.contextEffect],
            { concurrency: 2 }
          );
          yield* Effect.forEach(contexts, (context) =>
            Effect.gen(function* () {
              const service = yield* DocsContentService;
              const probe = yield* readDocsRuntimeProbe;
              expect(service).toBe(contentService);
              expect(probe).toEqual({
                constructions: 1,
                isolateId: "deterministic-test-isolate",
              });
            }).pipe(Effect.provideContext(context))
          );
          expect(yield* Ref.get(constructions)).toBe(1);
          expect(yield* Ref.get(releases)).toBe(0);
        }).pipe(Effect.scoped);
        expect(yield* Ref.get(releases)).toBe(1);
      })
  );

  test.effect.each([
    { name: "fails", program: Effect.fail("request failed") },
    { name: "is interrupted", program: Effect.interrupt },
  ])("releases the managed content when the request $name", ({ program }) =>
    Effect.gen(function* () {
      const releases = yield* Ref.make(0);
      const exit = yield* Effect.gen(function* () {
        const runtime = yield* Effect.acquireRelease(
          Effect.sync(() =>
            createDocsRuntime(
              Layer.effect(
                DocsContentService,
                Effect.acquireRelease(Effect.succeed(contentService), () =>
                  Ref.update(releases, (count) => count + 1)
                )
              ),
              createDocsRuntimeProbeLayer(
                Effect.succeed("failed-request-isolate")
              )
            )
          ),
          (ownedRuntime) => ownedRuntime.disposeEffect
        );
        yield* runtime.contextEffect;
        return yield* program;
      }).pipe(Effect.scoped, Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
      expect(yield* Ref.get(releases)).toBe(1);
    })
  );

  test.effect(
    "owns one production runtime and one managed probe Layer at module scope",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const file = yield* path.fromFileUrl(
          new URL("runtime.server.ts", import.meta.url)
        );
        const runtimeSource = yield* fs.readFileString(file);
        expect(runtimeSource).toMatch(
          /export const docsRuntime = createDocsRuntime\(/u
        );
        expect(runtimeSource.match(/createDocsRuntime\(/gu)).toHaveLength(1);
        expect(
          runtimeSource.match(/createDocsRuntimeProbeLayer\(/gu)
        ).toHaveLength(1);
        expect(runtimeSource).toContain("Random.nextIntBetween");
        expect(runtimeSource).not.toContain("globalThis.crypto");
        expect(runtimeSource).not.toContain("Math.random");
      }).pipe(Effect.provide(BunServices.layer))
  );
});
