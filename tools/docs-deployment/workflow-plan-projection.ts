import { Effect, Schema } from "effect";

import type { DeploymentPlanProjection } from "./schemas.js";

export const alchemyPlanTextVersion = "2.0.0-beta.79" as const;
export const alchemyPlanSourceCommit =
  "473c39591c7993a708199d0ef8f0d38416885dde" as const;
export const historicalAlchemyPlanTextVersion = "2.0.0-beta.64" as const;
export const historicalAlchemyPlanSourceCommit =
  "31edd3c4b2f0f3310fad07f5423aee20cf72be8d" as const;

const Sha256 = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u));
const GitCommit = Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/u));
const Identifier = Schema.String.check(Schema.isPattern(/^[0-9]+$/u));

const FixtureCaptureBase = {
  artifactId: Identifier,
  artifactName: Schema.NonEmptyString,
  artifactPath: Schema.NonEmptyString,
  candidateCommit: GitCommit,
  capturedAt: Schema.DateTimeUtcFromString,
  expiresAt: Schema.DateTimeUtcFromString,
  finalBytes: Schema.Int.check(Schema.isGreaterThan(0)),
  finalSha256: Sha256,
  rawSha256: Sha256,
  removedLineClasses: Schema.Array(Schema.NonEmptyString),
  stage: Schema.NonEmptyString,
  workflowCommit: GitCommit,
  workflowPath: Schema.NonEmptyString,
  workflowRunId: Identifier,
} as const;

const FixtureCapture = Schema.Union([
  Schema.Struct({
    ...FixtureCaptureBase,
    action: Schema.Literal("create"),
    fixture: Schema.Literal("create.txt"),
    kind: Schema.Literal("deploy"),
    scenario: Schema.Literal("create"),
  }),
  Schema.Struct({
    ...FixtureCaptureBase,
    action: Schema.Literal("update"),
    fixture: Schema.Literal("update.txt"),
    kind: Schema.Literal("deploy"),
    scenario: Schema.Literal("update"),
  }),
  Schema.Struct({
    ...FixtureCaptureBase,
    action: Schema.Literal("noop"),
    fixture: Schema.Literal("no-op.txt"),
    kind: Schema.Literal("deploy"),
    scenario: Schema.Literal("no-op"),
  }),
  Schema.Struct({
    ...FixtureCaptureBase,
    action: Schema.Literal("delete"),
    fixture: Schema.Literal("delete.txt"),
    kind: Schema.Literal("destroy"),
    scenario: Schema.Literal("delete"),
  }),
  Schema.Struct({
    ...FixtureCaptureBase,
    action: Schema.Literal("noop"),
    fixture: Schema.Literal("empty-destroy.txt"),
    kind: Schema.Literal("destroy"),
    scenario: Schema.Literal("empty-destroy"),
  }),
]);

export const AlchemyPlanFixtureManifest = Schema.Struct({
  alchemyVersion: Schema.Literal(historicalAlchemyPlanTextVersion),
  captures: Schema.Array(FixtureCapture).pipe(
    Schema.check(Schema.isLengthBetween(5, 5))
  ),
  sanitisation: Schema.Struct({
    rules: Schema.Tuple([
      Schema.Literal(
        "retain only the Alchemy plan summary and logical-resource lines"
      ),
      Schema.Literal("remove timestamped tool-update warnings"),
      Schema.Literal(
        "reject account IDs, URLs, credential terms and absolute machine paths"
      ),
    ]),
    secretValuesIncluded: Schema.Literal(false),
  }),
  schemaVersion: Schema.Literal(1),
  upstream: Schema.Struct({
    commit: Schema.Literal(historicalAlchemyPlanSourceCommit),
    repository: Schema.Literal("https://github.com/sam-goodwin/alchemy"),
  }),
});

const ResourceAction = Schema.Literals(["create", "update", "noop", "delete"]);
const NativeResource = Schema.Struct({
  action: ResourceAction,
  logicalId: Schema.Literal("DocsWebsite"),
  resourceType: Schema.Literal("Cloudflare.Worker"),
});
type NativeResource = typeof NativeResource.Type;

export const stringifyWorkflowPlanProjection = (
  projection: DeploymentPlanProjection
): string =>
  JSON.stringify({
    candidate: {
      deploymentInputSha256: projection.candidate.deploymentInputSha256,
      exactCommit: projection.candidate.exactCommit,
      lockfileSha256: projection.candidate.lockfileSha256,
    },
    configSha256: projection.configSha256,
    logicalResources: projection.logicalResources,
    redaction: projection.redaction,
    schemaVersion: projection.schemaVersion,
    stack: projection.stack,
    stage: projection.stage,
  });

export const WorkflowPlanProjectionKind = Schema.Literals([
  "deploy",
  "destroy",
]);
export type WorkflowPlanProjectionKind = typeof WorkflowPlanProjectionKind.Type;

export class WorkflowPlanProjectionError extends Schema.TaggedError<WorkflowPlanProjectionError>()(
  "WorkflowPlanProjectionError",
  {
    reason: Schema.NonEmptyString,
  }
) {}

// oxlint-disable-next-line eslint/no-control-regex -- ANSI colour is an explicit Alchemy host-output boundary.
const ansiEscape = /\u001B\[[0-?]*[ -/]*[@-~]/gu;
const timestampLog = /^\[\d{2}:\d{2}:\d{2}(?:\.\d+)?\] [A-Z]+ /u;
const resourceLine = /^\[[^\]]+\] /u;
const nativeResourceLine = /^\[DocsWebsite\] (?:create|update|noop|delete)$/u;
const planSummaryLine = /^Plan: /u;

const fail = (reason: string) =>
  Effect.fail(new WorkflowPlanProjectionError({ reason }));

export const projectAlchemyPlanText = (
  source: string,
  kind: WorkflowPlanProjectionKind
) =>
  Effect.gen(function* () {
    const lines = source
      .replace(ansiEscape, "")
      .split(/\r?\n/u)
      .filter((line) => !timestampLog.test(line));
    const planSummaries = lines.filter((line) => planSummaryLine.test(line));
    if (planSummaries.length !== 1) {
      return yield* fail(
        "beta.79 Alchemy plan output must contain exactly one plan summary"
      );
    }
    if (
      lines.some(
        (line) =>
          line.length > 0 &&
          !planSummaryLine.test(line) &&
          !resourceLine.test(line)
      )
    ) {
      return yield* fail("unsupported beta.79 Alchemy plan output line");
    }

    const resourceLines = lines.filter((line) => resourceLine.test(line));
    const unexpected = resourceLines.filter(
      (line) => !nativeResourceLine.test(line)
    );
    if (unexpected.length > 0) {
      return yield* fail("unsupported beta.79 Alchemy plan resource line");
    }

    const resources = yield* Effect.all(
      resourceLines.map((line) =>
        Schema.decodeUnknownEffect(ResourceAction)(
          line.slice("[DocsWebsite] ".length)
        ).pipe(
          Effect.mapError(
            () =>
              new WorkflowPlanProjectionError({
                reason: "unsupported native Alchemy plan action",
              })
          ),
          Effect.map(
            (action): NativeResource => ({
              action,
              logicalId: "DocsWebsite",
              resourceType: "Cloudflare.Worker",
            })
          )
        )
      )
    );
    if (kind === "deploy" && resources.length !== 1) {
      return yield* fail(
        "a native deployment plan must contain exactly one DocsWebsite action"
      );
    }
    if (
      kind === "deploy" &&
      resources[0] !== undefined &&
      resources[0].action === "delete"
    ) {
      return yield* fail(
        "a native deployment plan cannot delete the DocsWebsite resource"
      );
    }
    if (kind === "destroy" && resources.length > 1) {
      return yield* fail(
        "a native teardown plan must contain at most one DocsWebsite action"
      );
    }
    if (
      kind === "destroy" &&
      resources[0] !== undefined &&
      resources[0].action !== "delete" &&
      resources[0].action !== "noop"
    ) {
      return yield* fail(
        "a native teardown plan may only delete or noop the DocsWebsite resource"
      );
    }

    const expectedSummary =
      resources.length === 0
        ? "Plan: no resources"
        : `Plan: 1 to ${resources[0]?.action}`;
    if (planSummaries[0] !== expectedSummary) {
      return yield* fail(
        "beta.79 Alchemy plan summary does not match its native resource action"
      );
    }

    return resources.length === 0
      ? [
          {
            action: "noop" as const,
            logicalId: "DocsWebsite" as const,
            resourceType: "Cloudflare.Worker" as const,
          },
        ]
      : resources;
  });
