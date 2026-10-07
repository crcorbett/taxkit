import {
  Array as EffectArray,
  Effect,
  Equivalence,
  HashSet,
  Match,
  Option,
  Order,
  Record,
  Schema,
} from "effect";

import {
  DeploymentPlanProjection,
  NativeAppsPlanAction,
  NativeAppsPlanBinding,
  NativeAppsPlanProjection,
  NativeAppsPlanResource,
} from "./schemas.js";

export const alchemyPlanTextVersion = "2.0.0-beta.80" as const;
export const alchemyPlanSourceCommit =
  "ef7d3077a7d196edf26fa1f3bb8bc9b0ef9fef04" as const;
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
    Schema.check(Schema.isBetweenLength(5, 5))
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

// Keep the accepted receipt digest's field order while reusing its owning Schemas.
const WorkflowPlanProjectionJson = Schema.fromJsonString(
  Schema.Struct({
    candidate: DeploymentPlanProjection.fields.candidate,
    configSha256: DeploymentPlanProjection.fields.configSha256,
    logicalResources: DeploymentPlanProjection.fields.logicalResources,
    redaction: DeploymentPlanProjection.fields.redaction,
    schemaVersion: DeploymentPlanProjection.fields.schemaVersion,
    stack: DeploymentPlanProjection.fields.stack,
    stage: DeploymentPlanProjection.fields.stage,
  })
);

export const WorkflowPlanProjectionKind = Schema.Literals([
  "deploy",
  "destroy",
]);
export type WorkflowPlanProjectionKind = typeof WorkflowPlanProjectionKind.Type;

export const WorkflowPlanProjectionReason = Schema.Literals([
  "could not encode the workflow plan projection",
  "could not write the workflow plan projection",
  "could not decode the workflow plan projection",
  "workflow plan projection requires the candidate, digest, stage and plan paths",
  "could not read the beta.80 Alchemy plan output",
  "beta.80 Alchemy plan output must contain exactly one plan summary",
  "unsupported beta.80 Alchemy plan output line",
  "unsupported beta.80 Alchemy plan resource line",
  "unsupported native Alchemy plan action",
  "a native deployment plan must contain exactly one DocsWebsite action",
  "a native deployment plan cannot delete the DocsWebsite resource",
  "a native teardown plan must contain at most one DocsWebsite action",
  "a native teardown plan may only delete or noop the DocsWebsite resource",
  "beta.80 Alchemy plan summary does not match its native resource action",
  "native app plan requires the exact account, stage, zone and patch identity",
  "native app plan contains an unsupported or repeated resource or binding",
  "native app plan resources do not match its stage",
  "native app plan summary does not match its resources and bindings",
  "native app plan cannot be used for teardown",
]);

export class WorkflowPlanProjectionError extends Schema.TaggedError<WorkflowPlanProjectionError>()(
  "WorkflowPlanProjectionError",
  {
    reason: WorkflowPlanProjectionReason,
  }
) {}

export const stringifyWorkflowPlanProjection = (
  projection: DeploymentPlanProjection
) =>
  Schema.encodeEffect(WorkflowPlanProjectionJson)(projection).pipe(
    Effect.mapError(
      () =>
        new WorkflowPlanProjectionError({
          reason: "could not encode the workflow plan projection",
        })
    )
  );

export const stringifyNativeAppsPlanProjection = (
  projection: NativeAppsPlanProjection
) =>
  Schema.encodeEffect(Schema.fromJsonString(NativeAppsPlanProjection))(
    projection
  ).pipe(
    Effect.mapError(
      () =>
        new WorkflowPlanProjectionError({
          reason: "could not encode the workflow plan projection",
        })
    )
  );

// oxlint-disable-next-line eslint/no-control-regex -- ANSI colour is an explicit Alchemy host-output boundary.
const ansiEscape = /\u001B\[[0-?]*[ -/]*[@-~]/gu;
const timestampLog = /^\[\d{2}:\d{2}:\d{2}(?:\.\d+)?\] [A-Z]+ /u;
const timestampedPlanLine =
  /^\[\d{2}:\d{2}:\d{2}(?:\.\d+)?\] INFO \(#\d+\): (?<planLine>Plan: .+|\[[^\]]+\] .+)$/u;
const resourceLine = /^\[[^\]]+\] /u;
const nativeResourceLine = /^\[DocsWebsite\] (?:create|update|noop|delete)$/u;
const planSummaryLine = /^Plan: /u;

const fail = (reason: typeof WorkflowPlanProjectionReason.Type) =>
  Effect.fail(new WorkflowPlanProjectionError({ reason }));

const nativeAppLine = /^\[(?<logicalId>[^\]]+)\] (?<action>[a-z]+)$/u;

// This is a text ingress adapter for the installed non-detailed formatter.
// It validates resource and binding lines; it grants no provider authority.
export const projectNativeAppsPlanText = (
  source: string,
  stage: NativeAppsPlanProjection["stage"]
) =>
  Effect.gen(function* () {
    const lines = EffectArray.filter(
      EffectArray.flatMap(
        source.replace(ansiEscape, "").split(/\r?\n/u),
        (line) =>
          Option.fromNullishOr(timestampedPlanLine.exec(line)).pipe(
            Option.flatMap((match) => Option.fromNullishOr(match.groups)),
            Option.flatMap((groups) => Record.get(groups, "planLine")),
            Option.flatMap(Option.fromNullishOr),
            Option.match({
              onNone: () => (timestampLog.test(line) ? [] : [line]),
              onSome: (planLine) => [planLine],
            })
          )
      ),
      (line) => line.length > 0
    );
    const summaries = EffectArray.filter(lines, (line) =>
      planSummaryLine.test(line)
    );
    if (summaries.length !== 1) {
      return yield* fail(
        "beta.80 Alchemy plan output must contain exactly one plan summary"
      );
    }
    const entries = yield* Effect.forEach(
      EffectArray.filter(lines, (line) => !planSummaryLine.test(line)),
      (line) =>
        Effect.gen(function* () {
          const match = Option.fromNullishOr(nativeAppLine.exec(line)).pipe(
            Option.flatMap((value) => Option.fromNullishOr(value.groups))
          );
          const groups = yield* Option.match(match, {
            onNone: () =>
              fail(
                "native app plan contains an unsupported or repeated resource or binding"
              ),
            onSome: Effect.succeed,
          });
          const logicalId = Record.get(groups, "logicalId").pipe(
            Option.getOrUndefined
          );
          const action = Record.get(groups, "action").pipe(
            Option.getOrUndefined
          );
          const resourceType = Match.value(logicalId).pipe(
            Match.when("TaxKitProductionZone", () => "Cloudflare.Zone.Zone"),
            Match.when(
              "TaxKitProductionDnsSettings",
              () => "Cloudflare.DNS.ZoneSettings"
            ),
            Match.orElse(() => "Cloudflare.Worker")
          );
          return yield* Schema.decodeUnknownEffect(
            Schema.Union([NativeAppsPlanResource, NativeAppsPlanBinding])
          )(
            logicalId?.includes("/")
              ? { action, logicalId }
              : { action, logicalId, resourceType },
            { onExcessProperty: "error" }
          ).pipe(
            Effect.mapError(
              () =>
                new WorkflowPlanProjectionError({
                  reason:
                    "native app plan contains an unsupported or repeated resource or binding",
                })
            )
          );
        })
    );
    if (
      HashSet.size(
        HashSet.fromIterable(
          EffectArray.map(entries, (entry) => entry.logicalId)
        )
      ) !== entries.length
    ) {
      return yield* fail(
        "native app plan contains an unsupported or repeated resource or binding"
      );
    }
    const logicalResources = EffectArray.sortWith(
      EffectArray.filter(
        entries,
        (entry): entry is typeof NativeAppsPlanResource.Type =>
          Schema.is(NativeAppsPlanResource)(entry)
      ),
      (entry: typeof NativeAppsPlanResource.Type) => entry.logicalId,
      Order.String
    );
    const bindings = EffectArray.sortWith(
      EffectArray.filter(
        entries,
        (entry): entry is typeof NativeAppsPlanBinding.Type =>
          Schema.is(NativeAppsPlanBinding)(entry)
      ),
      (entry: typeof NativeAppsPlanBinding.Type) => entry.logicalId,
      Order.String
    );
    const expectedIds =
      stage === "prod"
        ? [
            "TaxKitApi",
            "TaxKitProductionDnsSettings",
            "TaxKitProductionZone",
            "TaxKitWebsite",
          ]
        : ["TaxKitApi", "TaxKitWebsite"];
    if (
      !EffectArray.makeEquivalence(Equivalence.String)(
        EffectArray.map(logicalResources, (entry) => entry.logicalId),
        expectedIds
      )
    ) {
      return yield* fail("native app plan resources do not match its stage");
    }
    const summaryParts = EffectArray.flatMap(
      NativeAppsPlanAction.literals,
      (action) => {
        const count = EffectArray.filter(
          logicalResources,
          (entry) => entry.action === action
        ).length;
        return action === "noop" || count === 0
          ? []
          : [`${count} to ${action}`];
      }
    );
    const bindingChanges = EffectArray.filter(
      bindings,
      (entry) => entry.action !== "noop"
    ).length;
    const allParts =
      bindingChanges === 0
        ? summaryParts
        : [...summaryParts, `${bindingChanges} binding changes`];
    const expectedSummary = `Plan: ${allParts.length === 0 ? "no changes" : allParts.join(", ")}`;
    if (
      !Option.exists(
        EffectArray.head(summaries),
        (summary) => summary === expectedSummary
      )
    ) {
      return yield* fail(
        "native app plan summary does not match its resources and bindings"
      );
    }
    return { bindings, logicalResources };
  });

export const projectAlchemyPlanText = (
  source: string,
  kind: WorkflowPlanProjectionKind
) =>
  Effect.gen(function* () {
    const lines = EffectArray.flatMap(
      source.replace(ansiEscape, "").split(/\r?\n/u),
      (line) =>
        Option.fromNullishOr(timestampedPlanLine.exec(line)).pipe(
          Option.flatMap((match) => Option.fromNullishOr(match.groups)),
          Option.flatMap((groups) => Record.get(groups, "planLine")),
          Option.flatMap(Option.fromNullishOr),
          Option.match({
            onNone: () => (timestampLog.test(line) ? [] : [line]),
            onSome: (planLine) => [planLine],
          })
        )
    );
    const planSummaries = EffectArray.filter(lines, (line) =>
      planSummaryLine.test(line)
    );
    if (planSummaries.length !== 1) {
      return yield* fail(
        "beta.80 Alchemy plan output must contain exactly one plan summary"
      );
    }
    if (
      EffectArray.some(
        lines,
        (line) =>
          line.length > 0 &&
          !planSummaryLine.test(line) &&
          !resourceLine.test(line)
      )
    ) {
      return yield* fail("unsupported beta.80 Alchemy plan output line");
    }

    const resourceLines = EffectArray.filter(lines, (line) =>
      resourceLine.test(line)
    );
    const unexpected = EffectArray.filter(
      resourceLines,
      (line) => !nativeResourceLine.test(line)
    );
    if (unexpected.length > 0) {
      return yield* fail("unsupported beta.80 Alchemy plan resource line");
    }

    const resources = yield* Effect.all(
      EffectArray.map(resourceLines, (line) =>
        Schema.decodeUnknownEffect(ResourceAction)(
          line.slice("[DocsWebsite] ".length)
        ).pipe(
          Effect.mapError(
            () =>
              new WorkflowPlanProjectionError({
                reason: "unsupported native Alchemy plan action",
              })
          ),
          Effect.map((action): NativeResource => ({
            action,
            logicalId: "DocsWebsite",
            resourceType: "Cloudflare.Worker",
          }))
        )
      )
    );
    if (kind === "deploy" && resources.length !== 1) {
      return yield* fail(
        "a native deployment plan must contain exactly one DocsWebsite action"
      );
    }
    const resource = EffectArray.get(resources, 0);
    if (
      kind === "deploy" &&
      Option.exists(resource, (entry) => entry.action === "delete")
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
      Option.exists(
        resource,
        (entry) => entry.action !== "delete" && entry.action !== "noop"
      )
    ) {
      return yield* fail(
        "a native teardown plan may only delete or noop the DocsWebsite resource"
      );
    }

    const expectedSummary = Option.match(resource, {
      onNone: () => "Plan: no resources",
      onSome: (entry) => `Plan: 1 to ${entry.action}`,
    });
    if (
      !Option.exists(
        EffectArray.get(planSummaries, 0),
        (summary) => summary === expectedSummary
      )
    ) {
      return yield* fail(
        "beta.80 Alchemy plan summary does not match its native resource action"
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
