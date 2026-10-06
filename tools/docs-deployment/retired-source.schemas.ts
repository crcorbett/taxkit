import { Schema } from "effect";

export const retiredDocsSourceBundlePath =
  "docs/evidence/deployments/retired-docs-source-5d5544d0.json";
export const retiredDocsSourceBundleSha256 =
  "2c75e33caf57be0aba650c7b48107058fe5a6e7d60c269b18eacccd74f6b525c";
export const retiredDocsSourceBundleByteLimit = 350_000;

const RetiredDocsSourcePath = Schema.String.check(
  Schema.isPattern(
    /^apps\/docs\/(?:[A-Za-z0-9_$][A-Za-z0-9_$.-]*\/)*[A-Za-z0-9_$][A-Za-z0-9_$.-]*$/u
  )
).pipe(Schema.brand("RetiredDocsSourcePath"));

export const RetiredDocsSourceBundle = Schema.Struct({
  authority: Schema.Literal("supporting"),
  documentType: Schema.Literal("retained-source-bundle"),
  lifecycle: Schema.Literal("historical"),
  nonClaim: Schema.Literal(
    "Source addressability only; this is not an active app, complete rebuild checkout, deployment approval or provider recovery operation."
  ),
  owner: Schema.Literal("taxkit-documentation-owner"),
  schemaVersion: Schema.Literal(1),
  sourceCommit: Schema.Literal("5d5544d0af639b430d53536c9bfbbbf9e37e8516"),
  sourceFiles: Schema.Array(
    Schema.Struct({
      bytes: Schema.Int.check(
        Schema.isBetween({ maximum: 100_000, minimum: 0 })
      ),
      path: RetiredDocsSourcePath,
      sha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u)),
      text: Schema.String.check(Schema.isMaxLength(100_000)),
    })
  ).check(Schema.isBetweenLength(49, 49)),
  sourceRoot: Schema.Literal("apps/docs"),
});
export type RetiredDocsSourceBundle = typeof RetiredDocsSourceBundle.Type;

export class RetiredDocsSourceError extends Schema.TaggedError<RetiredDocsSourceError>()(
  "RetiredDocsSourceError",
  {
    operation: Schema.Literals([
      "read-bundle",
      "verify-bundle",
      "decode-bundle",
      "verify-source",
    ]),
  }
) {}
