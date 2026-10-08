import { Array as EffectArray, Order, Record as EffectRecord } from "effect";
import * as Effect from "effect/Effect";
import { forEach } from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as HashSet from "effect/HashSet";
import * as Path from "effect/Path";

import type { WorkflowArtifactMode } from "./workflow-artifact.schemas.js";
import { WorkflowArtifactPreparationError } from "./workflow-artifact.schemas.js";

const commonPlanFiles = [
  "bootstrap.json",
  "identity.json",
  "plan.json",
  "projection.json",
  "replan-identity.json",
  "replan-projection.json",
  "workflow-input.json",
] as const;

const allowedFiles = {
  "preview-plan": HashSet.fromIterable(commonPlanFiles),
  "preview-provider": HashSet.make(
    "hosted-proof.json",
    "provider-readback.json",
    "workflow-input.json"
  ),
  "preview-teardown": HashSet.make(
    "bootstrap.json",
    "destroy-plan.json",
    "destroy-two-projection.json",
    "projection.json",
    "provider-readback.json",
    "workflow-input.json"
  ),
  "production-plan": HashSet.fromIterable(commonPlanFiles),
  "production-provider": HashSet.make(
    "hosted-proof.json",
    "provider-readback.json",
    "workflow-input.json"
  ),
} satisfies Record<WorkflowArtifactMode, HashSet.HashSet<string>>;

const requiredFiles = {
  "preview-plan": ["workflow-input.json"],
  "preview-provider": [
    "hosted-proof.json",
    "provider-readback.json",
    "workflow-input.json",
  ],
  "preview-teardown": [
    "destroy-plan.json",
    "provider-readback.json",
    "workflow-input.json",
  ],
  "production-plan": ["workflow-input.json"],
  "production-provider": [
    "hosted-proof.json",
    "provider-readback.json",
    "workflow-input.json",
  ],
} satisfies Record<WorkflowArtifactMode, readonly string[]>;

const forbiddenText = [
  /TAXKIT_SECRET_SENTINEL/iu,
  /\bdp\.(?:ct|pt|sa|st)\.[A-Za-z0-9._-]+/u,
  /\bBearer\s+[A-Za-z0-9._-]+/iu,
  /CLOUDFLARE_API_TOKEN/iu,
  /DOPPLER_(?:CI|PROVIDER)_TOKEN/iu,
] as const;

const screenshotPrefix = "docs/evidence/deployments/";
const screenshotFile = /\.(?:json|png)$/iu;

const isProviderMode = (mode: WorkflowArtifactMode) =>
  mode === "preview-provider" || mode === "production-provider";

const isAllowed = (
  mode: WorkflowArtifactMode,
  selectedFiles: HashSet.HashSet<string>,
  relativePath: string
) =>
  HashSet.has(selectedFiles, relativePath) ||
  (isProviderMode(mode) &&
    relativePath.startsWith(screenshotPrefix) &&
    screenshotFile.test(relativePath));

const isTextFile = (relativePath: string) => relativePath.endsWith(".json");

const fail = (
  path: string,
  reason: WorkflowArtifactPreparationError["reason"]
) => new WorkflowArtifactPreparationError({ path, reason });

export const prepareWorkflowArtifact = (
  mode: WorkflowArtifactMode,
  sourceDirectory: string,
  uploadDirectory: string
) =>
  Effect.gen(function* workflowArtifactPreparation() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const sourceRoot = path.resolve(sourceDirectory);
    const uploadRoot = path.resolve(uploadDirectory);
    if (
      sourceRoot === uploadRoot ||
      sourceRoot.startsWith(`${uploadRoot}${path.sep}`) ||
      uploadRoot.startsWith(`${sourceRoot}${path.sep}`)
    ) {
      return yield* fail("artifact-directories", "path");
    }
    const realSourceRoot = yield* fileSystem
      .realPath(sourceRoot)
      .pipe(Effect.mapError(() => fail("artifact-source", "file-read")));
    const members = yield* fileSystem
      .readDirectory(sourceRoot, { recursive: true })
      .pipe(Effect.mapError(() => fail("artifact-source", "file-read")));
    const selectedFiles = yield* EffectRecord.get(allowedFiles, mode).pipe(
      Effect.fromOption,
      Effect.mapError(() => fail("artifact-mode", "config"))
    );
    const required = yield* EffectRecord.get(requiredFiles, mode).pipe(
      Effect.fromOption,
      Effect.mapError(() => fail("artifact-mode", "config"))
    );
    const inspected = yield* forEach(
      EffectArray.sort(members, Order.String),
      (member) =>
        fileSystem.stat(path.join(sourceRoot, member)).pipe(
          Effect.map((info) => (info.type === "File" ? [member] : [])),
          Effect.mapError(() => fail(member, "file-read"))
        ),
      { concurrency: 1 }
    );
    const admitted = EffectArray.filter(
      EffectArray.flatten(inspected),
      (member) => isAllowed(mode, selectedFiles, member)
    );
    yield* forEach(
      required,
      (member) =>
        EffectArray.contains(admitted, member)
          ? Effect.void
          : Effect.fail(fail(member, "required-file")),
      { concurrency: 1 }
    );
    if (admitted.length === 0) {
      return yield* fail("artifact-upload", "empty");
    }
    yield* fileSystem
      .remove(uploadRoot, { force: true, recursive: true })
      .pipe(Effect.mapError(() => fail("artifact-upload", "file-write")));
    yield* fileSystem
      .makeDirectory(uploadRoot, { recursive: true })
      .pipe(Effect.mapError(() => fail("artifact-upload", "file-write")));
    yield* forEach(
      admitted,
      (relativePath) =>
        Effect.gen(function* copyAdmittedArtifact() {
          const sourcePath = path.join(sourceRoot, relativePath);
          const realSourcePath = yield* fileSystem
            .realPath(sourcePath)
            .pipe(Effect.mapError(() => fail(relativePath, "file-read")));
          if (!realSourcePath.startsWith(`${realSourceRoot}${path.sep}`)) {
            return yield* fail(relativePath, "path");
          }
          if (isTextFile(relativePath)) {
            const contents = yield* fileSystem
              .readFileString(realSourcePath)
              .pipe(Effect.mapError(() => fail(relativePath, "file-read")));
            if (
              EffectArray.some(forbiddenText, (pattern) =>
                pattern.test(contents)
              )
            ) {
              return yield* fail(relativePath, "content");
            }
          }
          const bytes = yield* fileSystem
            .readFile(realSourcePath)
            .pipe(Effect.mapError(() => fail(relativePath, "file-read")));
          const destination = path.join(uploadRoot, relativePath);
          yield* fileSystem
            .makeDirectory(path.dirname(destination), { recursive: true })
            .pipe(Effect.mapError(() => fail(relativePath, "file-write")));
          yield* fileSystem
            .writeFile(destination, bytes)
            .pipe(Effect.mapError(() => fail(relativePath, "file-write")));
        }),
      { concurrency: 1 }
    );
  });
