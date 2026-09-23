import { Schema } from "effect";

export const WorkflowArtifactMode = Schema.Literals([
  "preview-plan",
  "preview-provider",
  "preview-teardown",
  "production-plan",
  "production-provider",
]);
export type WorkflowArtifactMode = typeof WorkflowArtifactMode.Type;

export const WorkflowArtifactConfig = Schema.Struct({
  TAXKIT_WORKFLOW_ARTIFACT_MODE: WorkflowArtifactMode,
  TAXKIT_WORKFLOW_ARTIFACT_SOURCE: Schema.NonEmptyString,
  TAXKIT_WORKFLOW_ARTIFACT_UPLOAD: Schema.NonEmptyString,
});

export class WorkflowArtifactPreparationError extends Schema.TaggedError<WorkflowArtifactPreparationError>()(
  "WorkflowArtifactPreparationError",
  {
    path: Schema.NonEmptyString,
    reason: Schema.Literals([
      "config",
      "content",
      "empty",
      "file-read",
      "file-write",
      "path",
      "required-file",
    ]),
  }
) {}
