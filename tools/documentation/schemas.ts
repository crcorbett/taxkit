import { Schema } from "effect";

export const DocumentationPathClass = Schema.Literals([
  "maintainer",
  "public",
  "generated",
  "workspace-manifest",
  "authored-sdk",
  "other",
]);
export type DocumentationPathClass = typeof DocumentationPathClass.Type;

export const DocumentationInvariant = Schema.Literals([
  "maintainer-metadata",
  "lifecycle-successor",
  "relative-link",
  "local-bun-command",
  "workspace-readme",
  "generated-source-owner",
  "owner-policy",
]);
export type DocumentationInvariant = typeof DocumentationInvariant.Type;

export class DocumentationDiagnostic extends Schema.TaggedClass<DocumentationDiagnostic>()(
  "DocumentationDiagnostic",
  {
    invariant: DocumentationInvariant,
    owner: Schema.NonEmptyString,
    repair: Schema.NonEmptyString,
    target: Schema.NonEmptyString,
  }
) {}

export class DocumentationReport extends Schema.TaggedClass<DocumentationReport>()(
  "DocumentationReport",
  {
    diagnostics: Schema.Array(DocumentationDiagnostic),
    inspected: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    maintainer: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    public: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }
) {}

export class DocumentationReceipt extends Schema.TaggedClass<DocumentationReceipt>()(
  "DocumentationReceipt",
  {
    diagnostics: Schema.Array(DocumentationDiagnostic),
    inspected: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    maintainer: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    nonClaim: Schema.NonEmptyString,
    ok: Schema.Boolean,
    omittedDiagnostics: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    postcondition: Schema.NonEmptyString,
    public: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    reportPath: Schema.NonEmptyString,
    violationCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }
) {}

export class DocumentationCheckError extends Schema.TaggedErrorClass<DocumentationCheckError>()(
  "DocumentationCheckError",
  { operation: Schema.NonEmptyString }
) {}

export const WorkspacePackageManifest = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

const OwnerBinding = Schema.Struct({
  command: Schema.optional(Schema.String),
  owner: Schema.NonEmptyString,
  path: Schema.NonEmptyString,
});

export const PublicPageAcceptanceRecord = Schema.Struct({
  observedAt: Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u)
  ),
  owner: Schema.NonEmptyString,
  schemaVersion: Schema.Literal(1),
  state: Schema.Literal("accepted"),
  targetPath: Schema.NonEmptyString,
});
export type PublicPageAcceptanceRecord = typeof PublicPageAcceptanceRecord.Type;

export const OwnerPolicy = Schema.Struct({
  fumadocs: Schema.Struct({
    build: OwnerBinding,
    generatedRoot: Schema.NonEmptyString,
    source: OwnerBinding,
  }),
  maintainer: Schema.Struct({
    rootEntrypoints: Schema.Array(Schema.NonEmptyString),
    roots: Schema.Array(Schema.NonEmptyString),
    snapshotExemptions: Schema.Array(
      Schema.Struct({
        documentClass: Schema.Literal("manual-html-snapshot"),
        path: Schema.NonEmptyString,
        reason: Schema.NonEmptyString,
      })
    ),
  }),
  openApi: Schema.Struct({
    liveRoute: OwnerBinding,
    snapshot: OwnerBinding,
    source: OwnerBinding,
    test: OwnerBinding,
  }),
  public: Schema.Struct({
    navigation: OwnerBinding,
    roots: Schema.Array(Schema.NonEmptyString),
    statusDecision: Schema.Struct({
      acceptanceRecords: Schema.Array(
        Schema.Struct({
          path: Schema.NonEmptyString,
          record: Schema.NonEmptyString,
        })
      ),
      owner: Schema.NonEmptyString,
      path: Schema.NonEmptyString,
      semantics: Schema.Literal("accepted-public-lifecycle"),
      statuses: Schema.Struct({
        draft: Schema.Literal("authored-candidate"),
        published: Schema.Literal("accepted-current"),
      }),
    }),
  }),
  sdkDocs: Schema.Struct({
    owner: Schema.NonEmptyString,
    roots: Schema.Array(Schema.NonEmptyString),
  }),
});
export type OwnerPolicy = typeof OwnerPolicy.Type;
