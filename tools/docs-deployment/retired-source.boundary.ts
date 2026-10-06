import { Array, Crypto, Effect, HashSet, Schema } from "effect";
import { Hex } from "effect/encoding";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import {
  RetiredDocsSourceBundle,
  RetiredDocsSourceError,
  retiredDocsSourceBundleByteLimit,
  retiredDocsSourceBundlePath,
  retiredDocsSourceBundleSha256,
} from "./retired-source.schemas.js";

// Read historical data only. Never execute, import or restore archived source.
export const readRetiredDocsSourceBundle = Effect.fn(
  "readRetiredDocsSourceBundle"
)(function* (repositoryRoot: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const crypto = yield* Crypto.Crypto;
  const target = path.join(repositoryRoot, retiredDocsSourceBundlePath);
  const stat = yield* fileSystem
    .stat(target)
    .pipe(
      Effect.mapError(
        () => new RetiredDocsSourceError({ operation: "read-bundle" })
      )
    );
  if (stat.size > retiredDocsSourceBundleByteLimit) {
    return yield* new RetiredDocsSourceError({ operation: "verify-bundle" });
  }
  const bytes = yield* fileSystem
    .readFile(target)
    .pipe(
      Effect.mapError(
        () => new RetiredDocsSourceError({ operation: "read-bundle" })
      )
    );
  const digest = yield* crypto
    .digest("SHA-256", bytes)
    .pipe(
      Effect.mapError(
        () => new RetiredDocsSourceError({ operation: "verify-bundle" })
      )
    );
  if (
    bytes.length > retiredDocsSourceBundleByteLimit ||
    Hex.encode(digest) !== retiredDocsSourceBundleSha256
  ) {
    return yield* new RetiredDocsSourceError({ operation: "verify-bundle" });
  }
  const text = yield* Effect.try({
    catch: () => new RetiredDocsSourceError({ operation: "decode-bundle" }),
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  });
  const bundle = yield* Schema.decodeEffect(
    Schema.fromJsonString(RetiredDocsSourceBundle),
    { onExcessProperty: "error" }
  )(text).pipe(
    Effect.mapError(
      () => new RetiredDocsSourceError({ operation: "decode-bundle" })
    )
  );
  if (
    HashSet.size(
      HashSet.fromIterable(
        Array.map(bundle.sourceFiles, (source) => source.path)
      )
    ) !== 49
  ) {
    return yield* new RetiredDocsSourceError({ operation: "verify-source" });
  }
  yield* Effect.forEach(bundle.sourceFiles, (source) =>
    Effect.gen(function* verifyRetiredDocsSource() {
      const sourceBytes = new TextEncoder().encode(source.text);
      const sourceDigest = yield* crypto
        .digest("SHA-256", sourceBytes)
        .pipe(
          Effect.mapError(
            () => new RetiredDocsSourceError({ operation: "verify-source" })
          )
        );
      if (
        sourceBytes.length !== source.bytes ||
        Hex.encode(sourceDigest) !== source.sha256
      ) {
        return yield* new RetiredDocsSourceError({
          operation: "verify-source",
        });
      }
    })
  );
  return bundle;
});
