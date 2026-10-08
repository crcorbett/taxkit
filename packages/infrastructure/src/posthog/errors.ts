import { Schema } from "effect";

export const PostHogManagementOperation = Schema.Literals([
  "configure",
  "find-project",
  "read-project",
  "create-project",
  "update-project",
  "project-lifecycle",
]);
const PostHogManagementReason = Schema.Literals([
  "invalid-configuration",
  "invalid-response",
  "permission-refused",
  "request-refused",
  "provider-failure",
  "deadline",
  "incomplete-inventory",
  "ambiguous-ownership",
  "foreign-resource",
  "replacement-refused",
  "retained-project-missing",
  "retained-project",
  "uncertain-create",
  "write-not-converged",
]);
export class PostHogManagementError extends Schema.TaggedError<PostHogManagementError>()(
  "PostHogManagementError",
  {
    operation: PostHogManagementOperation,
    reason: PostHogManagementReason,
  }
) {}
