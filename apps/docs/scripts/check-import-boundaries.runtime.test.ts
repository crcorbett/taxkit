import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  ByteSize,
  Cause,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Option,
  PlatformError,
  Ref,
} from "effect";

import { checkDocsImportBoundaries } from "./check-import-boundaries.runtime.js";

const fault = PlatformError.badArgument({
  description: "TAXKIT_SECRET_SENTINEL",
  method: "controlled-fixture",
  module: "FileSystem",
});

// This fixture implements the native file-information contract, not a second DTO.
const fileInfo: FileSystem.File.Info = {
  atime: Option.none(),
  birthtime: Option.none(),
  blksize: Option.none(),
  blocks: Option.none(),
  dev: 0,
  gid: Option.none(),
  ino: Option.none(),
  mode: 0o644,
  mtime: Option.none(),
  nlink: Option.some(1),
  rdev: Option.none(),
  size: ByteSize.bytes(0),
  type: "File",
  uid: Option.none(),
};

it.effect(
  "keeps browser-safe imports and excludes server, test and generated owners",
  () =>
    Effect.gen(function* () {
      const reads = yield* Ref.make<readonly string[]>([]);
      yield* checkDocsImportBoundaries("/fixture/docs").pipe(
        Effect.provide(
          Layer.merge(
            BunServices.layer,
            FileSystem.layerNoop({
              exists: () => Effect.succeed(false),
              readDirectory: () =>
                Effect.succeed([
                  "lib/browser.ts",
                  "lib/source.server.ts",
                  "lib/source.server.tsx",
                  "lib/source.test.ts",
                  "server.ts",
                  "routeTree.gen.ts",
                  "asset.svg",
                  "subfolder",
                  "directory.ts",
                  ".hidden.ts",
                  "lib/.private/source.ts",
                ]),
              readFileString: (path) =>
                Ref.update(reads, (paths) => [...paths, path]).pipe(
                  Effect.as(
                    'export { DocsPagePath } from "@taxkit/docs-content/schemas";'
                  )
                ),
              stat: (path) =>
                Effect.succeed(
                  path.endsWith("directory.ts")
                    ? { ...fileInfo, type: "Directory" }
                    : fileInfo
                ),
            })
          )
        )
      );
      expect(yield* Ref.get(reads)).toEqual([
        "/fixture/docs/src/lib/browser.ts",
      ]);
    })
);

it.effect.each([
  'import { service } from "@taxkit/docs-content/service";',
  'export { live } from "@taxkit/docs-fumadocs/live";',
  'import { runtime } from "#/lib/runtime.server";',
  'import { runtime } from "./runtime.server";',
  "Effect.runPromise(program);",
  "ManagedRuntime.make(layer);",
])("rejects a direct browser reference: %s", (source) =>
  Effect.gen(function* () {
    const exit = yield* checkDocsImportBoundaries("/fixture/docs").pipe(
      Effect.provide(
        Layer.merge(
          BunServices.layer,
          FileSystem.layerNoop({
            exists: () => Effect.succeed(false),
            readDirectory: () => Effect.succeed(["lib/browser.ts"]),
            readFileString: () => Effect.succeed(source),
            stat: () => Effect.succeed(fileInfo),
          })
        )
      ),
      Effect.exit
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain("DocsImportPolicyError");
    }
  })
);

it.effect("rejects a browser runtime file even if it is empty", () =>
  Effect.gen(function* () {
    const exit = yield* checkDocsImportBoundaries("/fixture/docs").pipe(
      Effect.provide(
        Layer.merge(
          BunServices.layer,
          FileSystem.layerNoop({
            exists: () => Effect.succeed(true),
            readDirectory: () => Effect.succeed([]),
            stat: () => Effect.succeed(fileInfo),
          })
        )
      ),
      Effect.exit
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain("DocsImportPolicyError");
    }
  })
);

it.effect.each([
  "source-list",
  "source-stat",
  "source-file",
  "browser-runtime",
])("fails closed and hides native source details: %s", (operation) =>
  Effect.gen(function* () {
    const exit = yield* checkDocsImportBoundaries("/fixture/docs").pipe(
      Effect.provide(
        Layer.merge(
          BunServices.layer,
          FileSystem.layerNoop({
            exists: () =>
              operation === "browser-runtime"
                ? Effect.fail(fault)
                : Effect.succeed(false),
            readDirectory: () =>
              operation === "source-list"
                ? Effect.fail(fault)
                : Effect.succeed(["lib/browser.ts"]),
            readFileString: () =>
              operation === "source-file"
                ? Effect.fail(fault)
                : Effect.succeed("export {};"),
            stat: () =>
              operation === "source-stat"
                ? Effect.fail(fault)
                : Effect.succeed(fileInfo),
          })
        )
      ),
      Effect.exit
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain("DocsImportReadError");
      expect(Cause.pretty(exit.cause)).not.toContain("TAXKIT_SECRET_SENTINEL");
      expect(Cause.findErrorOption(exit.cause)).toMatchObject({
        value: { operation },
      });
    }
  })
);
