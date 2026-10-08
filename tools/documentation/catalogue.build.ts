import { createHash } from "node:crypto";

import {
  DocsAcceptedSourceDigest,
  DocsPublicCatalogue,
  PublicPageAcceptanceRecordV2,
} from "@taxkit/content/schemas";
import { DocsContentService } from "@taxkit/docs-content/service";
import { Array, Effect, FileSystem, HashSet, Path, Schema } from "effect";

import { projectPublicCatalogue } from "./catalogue.policy.js";
import {
  DocsCatalogueBuildError,
  DocumentationRepositoryPath,
  OwnerPolicy,
} from "./schemas.js";

// Check real paths as well as representation paths, so a checked relative path
// cannot follow a symlink outside this checkout.
const containedFile = Effect.fn("DocsCatalogue.containedFile")(
  function* (repositoryRoot: string, relativePath: string) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const checked = yield* DocumentationRepositoryPath.makeEffect(relativePath);
    const root = yield* fs.realPath(repositoryRoot);
    const file = yield* fs.realPath(path.join(root, checked));
    const relative = path.relative(root, file);
    if (
      path.isAbsolute(relative) ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`)
    ) {
      return yield* new DocsCatalogueBuildError({ operation: "verify-source" });
    }
    return file;
  },
  Effect.mapError(
    () => new DocsCatalogueBuildError({ operation: "verify-source" })
  )
);

export const verifyAcceptedSource = Effect.fn("DocsCatalogue.verifySource")(
  function* (repositoryRoot: string, record: PublicPageAcceptanceRecordV2) {
    const fs = yield* FileSystem.FileSystem;
    const file = yield* containedFile(repositoryRoot, record.targetPath);
    const bytes = yield* fs.readFile(file);
    const digest = yield* Effect.try({
      catch: () => new DocsCatalogueBuildError({ operation: "verify-source" }),
      try: () => createHash("sha256").update(bytes).digest("hex"),
    }).pipe(Effect.flatMap(DocsAcceptedSourceDigest.makeEffect));
    if (digest !== record.sourceSha256) {
      return yield* new DocsCatalogueBuildError({ operation: "verify-source" });
    }
  },
  Effect.mapError(
    () => new DocsCatalogueBuildError({ operation: "verify-source" })
  )
);

export const readCatalogueAcceptance = Effect.fn(
  "DocsCatalogue.readAcceptance"
)(
  function* (repositoryRoot: string) {
    const fs = yield* FileSystem.FileSystem;
    const policyFile = yield* containedFile(
      repositoryRoot,
      "tools/documentation/owner-policy.json"
    );
    const policy = yield* fs.readFileString(policyFile).pipe(
      Effect.flatMap(
        Schema.decodeEffect(Schema.fromJsonString(OwnerPolicy), {
          onExcessProperty: "error",
        })
      )
    );
    const bindings = policy.public.statusDecision.acceptanceRecords;
    if (
      HashSet.size(
        HashSet.fromIterable(Array.map(bindings, (binding) => binding.path))
      ) !== bindings.length ||
      HashSet.size(
        HashSet.fromIterable(Array.map(bindings, (binding) => binding.record))
      ) !== bindings.length
    ) {
      return yield* new DocsCatalogueBuildError({
        operation: "read-acceptance",
      });
    }
    return yield* Effect.forEach(bindings, (binding) =>
      Effect.gen(function* () {
        if (
          binding.path !== "packages/docs-content/navigation.json" &&
          !/^packages\/docs-content\/content\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.mdx$/u.test(
            binding.path
          )
        ) {
          return yield* new DocsCatalogueBuildError({
            operation: "read-acceptance",
          });
        }
        const file = yield* containedFile(repositoryRoot, binding.record);
        const record = yield* fs
          .readFileString(file)
          .pipe(
            Effect.flatMap(
              Schema.decodeEffect(
                Schema.fromJsonString(PublicPageAcceptanceRecordV2),
                { onExcessProperty: "error" }
              )
            )
          );
        if (
          record.targetPath !== binding.path ||
          record.owner !== policy.public.statusDecision.owner
        ) {
          return yield* new DocsCatalogueBuildError({
            operation: "read-acceptance",
          });
        }
        yield* verifyAcceptedSource(repositoryRoot, record);
        return record;
      })
    );
  },
  Effect.mapError(
    () => new DocsCatalogueBuildError({ operation: "read-acceptance" })
  )
);

export const buildPublicCatalogue = Effect.fn("DocsCatalogue.build")(function* (
  repositoryRoot: string,
  records: readonly PublicPageAcceptanceRecordV2[]
) {
  const content = yield* DocsContentService;
  const pages = yield* content.listPages();
  const navigation = yield* content.getNavigation();
  const catalogue = yield* projectPublicCatalogue(pages, navigation, records);
  // Reject edits made while the compiler was running, before encoding output.
  yield* Effect.forEach(records, (record) =>
    verifyAcceptedSource(repositoryRoot, record)
  );
  const currentRecords = yield* readCatalogueAcceptance(repositoryRoot);
  if (
    !Schema.toEquivalence(Schema.Array(PublicPageAcceptanceRecordV2))(
      records,
      currentRecords
    )
  ) {
    return yield* new DocsCatalogueBuildError({ operation: "read-acceptance" });
  }
  return catalogue;
});

export const writePublicCatalogue = Effect.fn("DocsCatalogue.write")(function* (
  repositoryRoot: string,
  catalogue: DocsPublicCatalogue
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const json = yield* Schema.encodeEffect(
    Schema.fromJsonString(DocsPublicCatalogue)
  )(catalogue).pipe(
    Effect.mapError(() => new DocsCatalogueBuildError({ operation: "encode" }))
  );
  // This path belongs to the generated-source owner and is never read from
  // acceptance records or public request input.
  yield* fs
    .writeFileString(
      path.join(
        repositoryRoot,
        "packages/docs-content/.source/public-catalogue.json"
      ),
      json
    )
    .pipe(
      Effect.mapError(() => new DocsCatalogueBuildError({ operation: "write" }))
    );
});
