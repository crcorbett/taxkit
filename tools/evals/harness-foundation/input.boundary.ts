import { Array, Effect, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { EpochInputError } from "./schemas.js";

const ChangedPaths = Schema.Array(Schema.NonEmptyString);

export const readEpochJson = <A>(
  repositoryRoot: string,
  target: string,
  schema: Schema.ConstraintDecoder<A>
): Effect.Effect<A, EpochInputError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* readEpochJsonAtBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const source = yield* fileSystem
      .readFileString(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new EpochInputError({ target })));
    return yield* Schema.decodeEffect(Schema.fromJsonString(schema), {
      onExcessProperty: "error",
    })(source).pipe(Effect.mapError(() => new EpochInputError({ target })));
  });

export const restoreChangedPaths = (bytes: Uint8Array) =>
  Effect.try({
    catch: () => new EpochInputError({ target: "git-changed-paths" }),
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  }).pipe(
    Effect.map((source) =>
      Array.filter(source.split("\0"), (entry) => entry.length > 0)
    ),
    Effect.flatMap(Schema.decodeEffect(ChangedPaths)),
    Effect.mapError(() => new EpochInputError({ target: "git-changed-paths" }))
  );

export const decodeGitText = (target: string, bytes: Uint8Array) =>
  Effect.try({
    catch: () => new EpochInputError({ target }),
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim(),
  });

export const repositoryRootFromUrl = (source: URL) =>
  Path.Path.pipe(
    Effect.flatMap((path) => path.fromFileUrl(source)),
    Effect.mapError(() => new EpochInputError({ target: "repository-root" }))
  );

export const hashEpochBytes = (source: Uint8Array) =>
  Effect.tryPromise({
    catch: () => new EpochInputError({ target: "sha256-source" }),
    try: () => crypto.subtle.digest("SHA-256", new Uint8Array(source)),
  }).pipe(
    Effect.map((digest) =>
      Array.map(Array.fromIterable(new Uint8Array(digest)), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("")
    )
  );
