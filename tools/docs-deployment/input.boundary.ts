import { Crypto, Effect, Schema } from "effect";
import { Hex } from "effect/encoding";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { DocsDeploymentInputError } from "./schemas.js";

export const readDeploymentJson = <A>(
  repositoryRoot: string,
  target: string,
  schema: Schema.ConstraintDecoder<A>
): Effect.Effect<
  A,
  DocsDeploymentInputError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* readDeploymentJsonAtBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const source = yield* fileSystem
      .readFileString(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new DocsDeploymentInputError({ target })));

    return yield* Schema.decodeEffect(Schema.fromJsonString(schema), {
      onExcessProperty: "error",
    })(source).pipe(
      Effect.mapError(() => new DocsDeploymentInputError({ target }))
    );
  });

export const readDeploymentSha256 = (
  repositoryRoot: string,
  target: string
): Effect.Effect<
  string,
  DocsDeploymentInputError,
  Crypto.Crypto | FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* readDeploymentSha256AtBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const bytes = yield* fileSystem
      .readFile(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new DocsDeploymentInputError({ target })));
    const crypto = yield* Crypto.Crypto;
    const digest = yield* crypto
      .digest("SHA-256", bytes)
      .pipe(Effect.mapError(() => new DocsDeploymentInputError({ target })));
    return Hex.encode(digest).toLowerCase();
  });
