import { CaptureToken, PostHogProjectId } from "@taxkit/analytics/schemas";
import { Schema } from "effect";

export const PostHogOrganisationId = Schema.String.check(Schema.isGUID()).pipe(
  Schema.brand("taxkit/PostHogOrganisationId")
);
export const PostHogManagedName = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(120)
).pipe(Schema.brand("taxkit/PostHogManagedName"));
const PostHogProjectMarker = Schema.Literal("taxkit:posthog:shared:v1");
export const ProjectDefinition = Schema.Struct({
  marker: PostHogProjectMarker,
  name: PostHogManagedName,
  organisation: PostHogOrganisationId,
  region: Schema.Literal("us"),
});
export type ProjectDefinition = typeof ProjectDefinition.Type;
export const ProjectLookup = Schema.Struct({
  definition: ProjectDefinition,
  id: PostHogProjectId,
});
export type ProjectLookup = typeof ProjectLookup.Type;

// These are actual supported management fields, independent of the browser
// sender choice. Missing provider settings are invalid rather than invented.
export const ProjectPrivacy = Schema.Struct({
  anonymize_ips: Schema.Boolean,
  autocapture_exceptions_opt_in: Schema.Boolean,
  autocapture_opt_out: Schema.Boolean,
  autocapture_web_vitals_opt_in: Schema.Boolean,
  capture_console_log_opt_in: Schema.Boolean,
  capture_performance_opt_in: Schema.Boolean,
  heatmaps_opt_in: Schema.Boolean,
  inject_web_apps: Schema.Boolean,
  session_recording_opt_in: Schema.Boolean,
  surveys_opt_in: Schema.Boolean,
});
export const desiredProjectPrivacy = ProjectPrivacy.make({
  anonymize_ips: true,
  autocapture_exceptions_opt_in: false,
  autocapture_opt_out: true,
  autocapture_web_vitals_opt_in: false,
  capture_console_log_opt_in: false,
  capture_performance_opt_in: false,
  heatmaps_opt_in: false,
  inject_web_apps: false,
  session_recording_opt_in: false,
  surveys_opt_in: false,
});
export const ManagedProject = Schema.Struct({
  ...ProjectDefinition.fields,
  id: PostHogProjectId,
  privacy: ProjectPrivacy,
  token: Schema.Redacted(CaptureToken),
});
export type ManagedProject = typeof ManagedProject.Type;

export const PostHogManagementKey = Schema.String.check(
  Schema.isPattern(/^phx_[A-Za-z0-9_-]{20,200}$/u)
).pipe(Schema.brand("taxkit/PostHogManagementKey"));
