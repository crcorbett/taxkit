import { Array, Schema } from "effect";

export const ReleaseCheckId = Schema.Literals([
  "verification",
  "test",
  "build",
  "docs-validation",
  "packed-artifact",
  "downstream-consumer",
  "api-smoke",
  "docs-browser",
  "changeset-status",
]);
export type ReleaseCheckId = typeof ReleaseCheckId.Type;

export class ReleaseCheck extends Schema.TaggedClass<ReleaseCheck>()(
  "ReleaseCheck",
  {
    args: Schema.Array(Schema.String),
    command: Schema.NonEmptyString,
    cwd: Schema.NonEmptyString,
    id: ReleaseCheckId,
    label: Schema.NonEmptyString,
  }
) {}

export class ReleaseCommandOutcome extends Schema.TaggedClass<ReleaseCommandOutcome>()(
  "ReleaseCommandOutcome",
  {
    check: ReleaseCheck,
    exitCode: Schema.Int,
    stderr: Schema.String,
    stdout: Schema.String,
  }
) {}

export class ReleaseReadinessReport extends Schema.TaggedClass<ReleaseReadinessReport>()(
  "ReleaseReadinessReport",
  {
    outcomes: Schema.Array(ReleaseCommandOutcome),
  }
) {}

export const makeReleaseReadinessPlan = (
  workspaceRoot: string
): readonly ReleaseCheck[] => [
  new ReleaseCheck({
    args: ["run", "verification"],
    command: "bun",
    cwd: workspaceRoot,
    id: "verification",
    label: "Canonical repository verification",
  }),
  new ReleaseCheck({
    args: ["run", "test"],
    command: "bun",
    cwd: workspaceRoot,
    id: "test",
    label: "Workspace tests",
  }),
  new ReleaseCheck({
    args: ["run", "build"],
    command: "bun",
    cwd: workspaceRoot,
    id: "build",
    label: "Workspace production builds",
  }),
  new ReleaseCheck({
    args: ["run", "docs:validate"],
    command: "bun",
    cwd: workspaceRoot,
    id: "docs-validation",
    label: "Documentation content validation",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=@taxkit/sdk", "check-packed-artifact"],
    command: "bun",
    cwd: workspaceRoot,
    id: "packed-artifact",
    label: "Focused SDK packed artifact proof",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=@taxkit/sdk", "validate:downstream"],
    command: "bun",
    cwd: workspaceRoot,
    id: "downstream-consumer",
    label: "Strict downstream package proof",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=api", "smoke"],
    command: "bun",
    cwd: workspaceRoot,
    id: "api-smoke",
    label: "Public API smoke evidence",
  }),
  new ReleaseCheck({
    args: ["run", "--filter=docs", "test:browser"],
    command: "bun",
    cwd: workspaceRoot,
    id: "docs-browser",
    label: "Documentation browser evidence",
  }),
  new ReleaseCheck({
    args: ["run", "changeset", "status", "--verbose"],
    command: "bun",
    cwd: workspaceRoot,
    id: "changeset-status",
    label: "Pending release train status",
  }),
];

export const renderReleaseReadinessReport = (
  report: ReleaseReadinessReport
): string =>
  Array.prepend(
    Array.map(
      report.outcomes,
      (outcome) =>
        `PASS [${outcome.check.id}] ${outcome.check.command} ${outcome.check.args.join(" ")} (cwd: ${outcome.check.cwd})`
    ),
    `Release readiness passed ${report.outcomes.length} ordered checks.`
  ).join("\n");
