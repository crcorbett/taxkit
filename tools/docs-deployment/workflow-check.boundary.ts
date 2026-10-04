import { Crypto, Effect, Schema } from "effect";
import { Hex } from "effect/encoding";
import * as FileSystem from "effect/FileSystem";

import {
  WorkflowCheckInputError,
  WorkflowCheckReadError,
} from "./workflow-check.schemas.js";
import type { WorkflowCheckName } from "./workflow-check.schemas.js";

export const readWorkflowReceipt = <A>(
  check: WorkflowCheckName,
  path: string,
  target: string,
  schema: Schema.ConstraintDecoder<A>
): Effect.Effect<
  A,
  WorkflowCheckInputError | WorkflowCheckReadError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* readWorkflowReceiptAtBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const source = yield* fileSystem.readFileString(path).pipe(
      Effect.mapError(
        () =>
          new WorkflowCheckReadError({
            check,
            operation: `read-${target}`,
          })
      )
    );

    return yield* Schema.decodeEffect(Schema.fromJsonString(schema), {
      onExcessProperty: "error",
    })(source).pipe(
      Effect.mapError(
        () =>
          new WorkflowCheckInputError({
            check,
            target,
          })
      )
    );
  });

export const readWorkflowSha256 = (
  check: WorkflowCheckName,
  path: string,
  target: string
): Effect.Effect<
  string,
  WorkflowCheckReadError,
  Crypto.Crypto | FileSystem.FileSystem
> =>
  Effect.gen(function* readWorkflowSha256AtBoundary() {
    const crypto = yield* Crypto.Crypto;
    const fileSystem = yield* FileSystem.FileSystem;
    const bytes = yield* fileSystem.readFile(path).pipe(
      Effect.mapError(
        () =>
          new WorkflowCheckReadError({
            check,
            operation: `read-${target}`,
          })
      )
    );
    const digest = yield* crypto.digest("SHA-256", bytes).pipe(
      Effect.mapError(
        () =>
          new WorkflowCheckReadError({
            check,
            operation: `digest-${target}`,
          })
      )
    );
    return Hex.encode(digest).toLowerCase();
  });

export const workflowSha256 = (
  check: WorkflowCheckName,
  value: string
): Effect.Effect<string, WorkflowCheckReadError, Crypto.Crypto> =>
  Effect.gen(function* workflowSha256AtBoundary() {
    const crypto = yield* Crypto.Crypto;
    const digest = yield* crypto
      .digest("SHA-256", new TextEncoder().encode(value))
      .pipe(
        Effect.mapError(
          () =>
            new WorkflowCheckReadError({
              check,
              operation: "digest-canonical-projection",
            })
        )
      );
    return Hex.encode(digest).toLowerCase();
  });
