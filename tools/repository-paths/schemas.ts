import { Schema } from "effect";

export const RepositoryPathCategory = Schema.Literals([
  "checkout-directory-path",
  "home-file-url",
  "posix-home-path",
  "tilde-checkout-path",
  "windows-home-path",
]);
export type RepositoryPathCategory = typeof RepositoryPathCategory.Type;

export const RepositoryRelativeFile = Schema.NonEmptyString.pipe(
  Schema.check(
    Schema.isPattern(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/u),
    Schema.isPattern(/^[^\p{C}\p{Zl}\p{Zp}]+$/u)
  ),
  Schema.brand("taxkit/RepositoryRelativeFile")
);
export type RepositoryRelativeFile = typeof RepositoryRelativeFile.Type;

const RepositoryPathLine = Schema.Int.check(Schema.isGreaterThan(0));

export class RepositoryPathFinding extends Schema.TaggedClass<RepositoryPathFinding>()(
  "RepositoryPathFinding",
  {
    category: RepositoryPathCategory,
    file: RepositoryRelativeFile,
    line: RepositoryPathLine,
  }
) {}

export class RepositoryPathReport extends Schema.TaggedClass<RepositoryPathReport>()(
  "RepositoryPathReport",
  {
    binaryFiles: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    findings: Schema.Array(RepositoryPathFinding),
    textFiles: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    trackedFiles: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }
) {}

export class RepositoryPolicyViolationError extends Schema.TaggedErrorClass<RepositoryPolicyViolationError>()(
  "RepositoryPolicyViolationError",
  {
    report: RepositoryPathReport,
  }
) {}

const RepositoryInventoryOperation = Schema.Literals([
  "decode-tracked-files",
  "list-tracked-files",
  "resolve-repository-root",
]);

export class RepositoryInventoryError extends Schema.TaggedErrorClass<RepositoryInventoryError>()(
  "RepositoryInventoryError",
  {
    exitCode: Schema.optional(Schema.Int),
    operation: RepositoryInventoryOperation,
  }
) {}

export class RepositoryFileReadError extends Schema.TaggedErrorClass<RepositoryFileReadError>()(
  "RepositoryFileReadError",
  {
    file: RepositoryRelativeFile,
  }
) {}
