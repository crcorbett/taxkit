import { Array, Effect, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { Hgi206InputError, RelativePath } from "./schemas.js";

const ChangedPaths = Schema.Array(RelativePath);

export const readHgi206Json = <A>(
  repositoryRoot: string,
  target: string,
  schema: Schema.ConstraintDecoder<A>
): Effect.Effect<A, Hgi206InputError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* readHgi206JsonAtBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const source = yield* fileSystem
      .readFileString(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new Hgi206InputError({ target })));

    return yield* Schema.decodeEffect(Schema.fromJsonString(schema), {
      onExcessProperty: "error",
    })(source).pipe(Effect.mapError(() => new Hgi206InputError({ target })));
  });

export const restoreChangedPaths = (bytes: Uint8Array) =>
  Effect.try({
    catch: () => new Hgi206InputError({ target: "git-status-porcelain" }),
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  }).pipe(
    Effect.map((source) =>
      Array.filter(source.split("\0"), (path) => path.length > 0)
    ),
    Effect.flatMap(Schema.decodeEffect(ChangedPaths)),
    Effect.mapError(
      () => new Hgi206InputError({ target: "git-status-porcelain" })
    )
  );

export const repositoryRootFromUrl = (source: URL) =>
  Path.Path.pipe(
    Effect.flatMap((path) => path.fromFileUrl(source)),
    Effect.mapError(() => new Hgi206InputError({ target: "repository-root" }))
  );

export const hashHgi206Text = (source: string) =>
  Effect.tryPromise({
    catch: () => new Hgi206InputError({ target: "sha256-source" }),
    try: () =>
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)),
  }).pipe(
    Effect.map((digest) =>
      Array.map(Array.fromIterable(new Uint8Array(digest)), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("")
    )
  );
