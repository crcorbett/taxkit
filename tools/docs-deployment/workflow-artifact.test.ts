import { describe, expect, test } from "bun:test";

import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Array,
  Effect,
  FileSystem,
  Path,
  Record,
} from "effect";

import { prepareWorkflowArtifact } from "./workflow-artifact.js";

const runFixture = (
  files: Readonly<Record<string, string>>,
  mode: Parameters<typeof prepareWorkflowArtifact>[0]
) =>
  Effect.gen(function* workflowArtifactFixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-workflow-artifact-",
    });
    const source = path.join(directory, "source");
    const upload = path.join(directory, "upload");
    yield* fileSystem.makeDirectory(source);
    for (const [relativePath, contents] of Record.toEntries(files)) {
      const target = path.join(source, relativePath);
      yield* fileSystem.makeDirectory(path.dirname(target), {
        recursive: true,
      });
      yield* fileSystem.writeFileString(target, contents);
    }
    const result = yield* Effect.exit(
      prepareWorkflowArtifact(mode, source, upload)
    );
    const uploadedMembers = yield* fileSystem
      .readDirectory(upload, { recursive: true })
      .pipe(Effect.orElseSucceed(() => []));
    const inspected = yield* Effect.all(
      EffectArray.map(uploadedMembers, (member) =>
        fileSystem
          .stat(path.join(upload, member))
          .pipe(Effect.map((info) => (info.type === "File" ? member : null)))
      ),
      { concurrency: 1 }
    );
    const uploaded = Array.filter(
      inspected,
      (member): member is string => member !== null
    );
    return { result, uploaded: uploaded.toSorted() };
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer));

describe("workflow artifact preparation", () => {
  test("copies only the Preview plan allowlist and leaves raw output local", () =>
    Effect.gen(function* () {
      const { result, uploaded } = yield* runFixture(
        {
          "alchemy-plan.txt": "raw provider output",
          "plan.json": '{"schemaVersion":2}',
          "provider-readback.json": '{"schemaVersion":3}',
          "workflow-input.json": '{"schemaVersion":1}',
        },
        "preview-plan"
      );
      expect(result._tag).toBe("Success");
      expect(uploaded).toEqual(["plan.json", "workflow-input.json"]);
    }).pipe(Effect.runPromise));

  test("rejects an admitted file containing a deterministic secret sentinel", () =>
    Effect.gen(function* () {
      const { result, uploaded } = yield* runFixture(
        {
          "plan.json":
            '{"unsafe":"TAXKIT_SECRET_SENTINEL_VALUE_MUST_NOT_UPLOAD"}',
          "workflow-input.json": '{"schemaVersion":1}',
        },
        "preview-plan"
      );
      expect(result._tag).toBe("Failure");
      expect(String(result)).not.toContain("VALUE_MUST_NOT_UPLOAD");
      expect(uploaded).toEqual([]);
    }).pipe(Effect.runPromise));

  test("keeps provider output out of a plan artifact", () =>
    Effect.gen(function* () {
      const { result, uploaded } = yield* runFixture(
        {
          "hosted-proof.json": '{"schemaVersion":1}',
          "provider-readback.json": '{"schemaVersion":3}',
          "workflow-input.json": '{"schemaVersion":1}',
        },
        "preview-plan"
      );
      expect(result._tag).toBe("Success");
      expect(uploaded).toEqual(["workflow-input.json"]);
    }).pipe(Effect.runPromise));

  test("requires the complete provider proof set", () =>
    Effect.gen(function* () {
      const { result } = yield* runFixture(
        {
          "provider-readback.json": '{"schemaVersion":3}',
          "workflow-input.json": '{"schemaVersion":1}',
        },
        "preview-provider"
      );
      expect(result._tag).toBe("Failure");
    }).pipe(Effect.runPromise));

  test("copies only the safe teardown proof set", () =>
    Effect.gen(function* () {
      const { result, uploaded } = yield* runFixture(
        {
          "destroy-one.stderr.txt": "raw error output",
          "destroy-plan.json": '{"schemaVersion":2}',
          "provider-inventory-pre-destroy.json": '{"schemaVersion":1}',
          "provider-readback.json": '{"schemaVersion":3}',
          "workflow-input.json": '{"schemaVersion":1}',
        },
        "preview-teardown"
      );
      expect(result._tag).toBe("Success");
      expect(uploaded).toEqual([
        "destroy-plan.json",
        "provider-readback.json",
        "workflow-input.json",
      ]);
    }).pipe(Effect.runPromise));

  test("rejects a token-shaped admitted value without returning it", () =>
    Effect.gen(function* () {
      const { result } = yield* runFixture(
        {
          "hosted-proof.json": '{"unsafe":"dp.st.this-must-not-escape"}',
          "provider-readback.json": '{"schemaVersion":3}',
          "workflow-input.json": '{"schemaVersion":1}',
        },
        "preview-provider"
      );
      expect(result._tag).toBe("Failure");
      expect(String(result)).not.toContain("this-must-not-escape");
    }).pipe(Effect.runPromise));

  test("uses the same strict allowlist for Production provider proof", () =>
    Effect.gen(function* () {
      const { result, uploaded } = yield* runFixture(
        {
          "docs/evidence/deployments/production/desktop.png": "safe-image",
          "hosted-proof.json": '{"schemaVersion":1}',
          "hosted-proof.raw.json": '{"unsafe":"raw"}',
          "provider-inventory-before.json": '{"schemaVersion":1}',
          "provider-readback.json": '{"schemaVersion":3}',
          "workflow-input.json": '{"schemaVersion":1}',
        },
        "production-provider"
      );
      expect(result._tag).toBe("Success");
      expect(uploaded).toEqual([
        "docs/evidence/deployments/production/desktop.png",
        "hosted-proof.json",
        "provider-readback.json",
        "workflow-input.json",
      ]);
    }).pipe(Effect.runPromise));
});
