import { Schema } from "effect";

export const DependencyRecord = Schema.Record(Schema.String, Schema.String);
export const DependencySectionName = Schema.Literals([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]);
export type DependencySectionName = typeof DependencySectionName.Type;

export const DependencySectionsManifest = Schema.Struct({
  dependencies: Schema.OptionFromOptionalKey(DependencyRecord),
  devDependencies: Schema.OptionFromOptionalKey(DependencyRecord),
  optionalDependencies: Schema.OptionFromOptionalKey(DependencyRecord),
  peerDependencies: Schema.OptionFromOptionalKey(DependencyRecord),
});

export const ConditionalPackageExportTarget = Schema.Struct({
  default: Schema.OptionFromOptionalKey(Schema.String),
  source: Schema.OptionFromOptionalKey(Schema.String),
  types: Schema.OptionFromOptionalKey(Schema.String),
});
const PackageExportTarget = Schema.Union([
  Schema.String,
  ConditionalPackageExportTarget,
]);
const PackageExports = Schema.Record(Schema.String, PackageExportTarget);

// Preserve package metadata that this checker does not interpret, rather than
// decoding the same JSON again as an unchecked dictionary before repacking it.
const RemainingPackageMetadata = Schema.Record(Schema.String, Schema.Unknown);
export const PackedPackageManifest = Schema.StructWithRest(
  Schema.Struct({
    ...DependencySectionsManifest.fields,
    exports: PackageExports,
    files: Schema.Array(Schema.String),
    name: Schema.String,
    publishConfig: Schema.StructWithRest(
      Schema.Struct({ exports: PackageExports }),
      [RemainingPackageMetadata]
    ),
    version: Schema.String,
  }),
  [RemainingPackageMetadata]
);
export type PackedPackageManifest = typeof PackedPackageManifest.Type;

export const RootPackageManifest = Schema.Struct({
  workspaces: Schema.Struct({ catalog: DependencyRecord }),
});
