import { BunServices } from "@effect/platform-bun";
import { assert, describe, it } from "@effect/vitest";
import {
  DocsAcceptedSourceDigest,
  PublicPageAcceptanceRecordV2,
} from "@taxkit/content/schemas";
import { Effect, FileSystem, Path, Schema } from "effect";

import {
  readCatalogueAcceptance,
  verifyAcceptedSource,
} from "./catalogue.build.js";
import { OwnerPolicy } from "./schemas.js";

describe("accepted source bytes", () => {
  it.effect(
    "reads only matching owner bindings and rejects duplicate or changed acceptance records",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({
          prefix: "taxkit-catalogue-records-",
        });
        const policySource = yield* path.fromFileUrl(
          new URL("owner-policy.json", import.meta.url)
        );
        const original = yield* fs
          .readFileString(policySource)
          .pipe(
            Effect.flatMap(
              Schema.decodeEffect(Schema.fromJsonString(OwnerPolicy))
            )
          );
        const targetPath = "packages/docs-content/content/start/overview.mdx";
        const record = yield* PublicPageAcceptanceRecordV2.makeEffect({
          observedAt: "2026-10-06T00:00:00Z",
          owner: "test-owner",
          schemaVersion: 2,
          sourceSha256: yield* DocsAcceptedSourceDigest.makeEffect(
            "2b344bace0ff229e18a88d0fde54268b3d079a2f3a2875bb42fd8e4d67cfb589"
          ),
          state: "accepted",
          targetPath,
        });
        const binding = { path: targetPath, record: "accepted.json" };
        const policy = {
          ...original,
          public: {
            ...original.public,
            statusDecision: {
              ...original.public.statusDecision,
              acceptanceRecords: [binding],
              owner: "test-owner",
            },
          },
        };
        yield* fs.makeDirectory(path.join(root, "tools/documentation"), {
          recursive: true,
        });
        yield* fs.makeDirectory(path.dirname(path.join(root, targetPath)), {
          recursive: true,
        });
        const policyFile = path.join(
          root,
          "tools/documentation/owner-policy.json"
        );
        const recordFile = path.join(root, binding.record);
        yield* fs.writeFileString(
          path.join(root, targetPath),
          "reviewed source"
        );
        yield* Schema.encodeEffect(Schema.fromJsonString(OwnerPolicy))(
          policy
        ).pipe(Effect.flatMap((json) => fs.writeFileString(policyFile, json)));
        const recordJson = yield* Schema.encodeEffect(
          Schema.fromJsonString(PublicPageAcceptanceRecordV2)
        )(record);
        yield* fs.writeFileString(recordFile, recordJson);
        assert.deepEqual(yield* readCatalogueAcceptance(root), [record]);
        yield* fs.writeFileString(
          recordFile,
          recordJson.replace('"test-owner"', '"wrong-owner"')
        );
        const wrongOwner = yield* readCatalogueAcceptance(root).pipe(
          Effect.flip
        );
        assert.equal(wrongOwner.operation, "read-acceptance");
        yield* fs.writeFileString(recordFile, recordJson);
        const duplicatePolicy = {
          ...policy,
          public: {
            ...policy.public,
            statusDecision: {
              ...policy.public.statusDecision,
              acceptanceRecords: [binding, binding],
            },
          },
        };
        yield* Schema.encodeEffect(Schema.fromJsonString(OwnerPolicy))(
          duplicatePolicy
        ).pipe(Effect.flatMap((json) => fs.writeFileString(policyFile, json)));
        const duplicate = yield* readCatalogueAcceptance(root).pipe(
          Effect.flip
        );
        assert.equal(duplicate.operation, "read-acceptance");
      }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "rejects a changed file, traversal and a symlink outside the checkout",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({
          prefix: "taxkit-catalogue-checkout-",
        });
        const outside = yield* fs.makeTempDirectoryScoped({
          prefix: "taxkit-catalogue-outside-",
        });
        const file = path.join(root, "page.mdx");
        yield* fs.writeFileString(file, "reviewed source");
        const record = yield* PublicPageAcceptanceRecordV2.makeEffect({
          observedAt: "2026-10-06T00:00:00Z",
          owner: "test-owner",
          schemaVersion: 2,
          sourceSha256: yield* DocsAcceptedSourceDigest.makeEffect(
            "2b344bace0ff229e18a88d0fde54268b3d079a2f3a2875bb42fd8e4d67cfb589"
          ),
          state: "accepted",
          targetPath: "page.mdx",
        });
        yield* verifyAcceptedSource(root, record);
        yield* fs.writeFileString(file, "unreviewed change");
        const changed = yield* verifyAcceptedSource(root, record).pipe(
          Effect.flip
        );
        assert.equal(changed.operation, "verify-source");
        const outsideFile = path.join(outside, "page.mdx");
        yield* fs.writeFileString(outsideFile, "reviewed source");
        yield* fs.symlink(outsideFile, path.join(root, "outside.mdx"));
        yield* Effect.forEach(
          ["../page.mdx", outsideFile, "outside.mdx"],
          (targetPath) =>
            verifyAcceptedSource(root, { ...record, targetPath }).pipe(
              Effect.flip,
              Effect.tap((error) =>
                Effect.sync(() =>
                  assert.equal(error.operation, "verify-source")
                )
              )
            )
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
});
