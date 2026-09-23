import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { docsCloudflareStackName } from "@taxkit/infrastructure/website";
import * as Cloudflare from "alchemy/Cloudflare";
import { State } from "alchemy/State";
import { Context, Effect, HashSet, Layer, Schema } from "effect";

import type { DocsDeploymentInventoryReport } from "./inventory.schemas.js";
import {
  DocsDeploymentInventoryDisagreementError,
  DocsDeploymentInventoryInputError,
  DocsDeploymentInventoryReadError,
  PersistedDocsDeploymentResource,
  PersistedDocsWorkerAttributes,
  ProviderDocsWorker,
} from "./inventory.schemas.js";

const stackTag = `alchemy:stack:${docsCloudflareStackName}`;
const stageTagPrefix = "alchemy:stage:";
const logicalIdTagPrefix = "alchemy:id:";

const decode = <A>(
  schema: Schema.ConstraintDecoder<A>,
  value: typeof Schema.Unknown.Type,
  target: string
) =>
  Schema.decodeUnknownEffect(schema, { onExcessProperty: "ignore" })(
    value
  ).pipe(
    Effect.mapError(() => new DocsDeploymentInventoryInputError({ target }))
  );

export const requireDocsDeploymentInventoryAgreement = (
  stageInventory: DocsDeploymentInventoryReport["stages"],
  taxkitProviderWorkers: DocsDeploymentInventoryReport["providerWorkers"]
) => {
  const stateWorkers = stageInventory.flatMap((entry) =>
    entry.resources.flatMap((resource) =>
      resource.logicalId === "DocsWebsite" && resource.workerName !== undefined
        ? [
            {
              logicalId: resource.logicalId,
              stage: entry.stage,
              workerName: resource.workerName,
            },
          ]
        : []
    )
  );
  const stateIdentities = HashSet.fromIterable(
    stateWorkers.map(
      (worker) => `${worker.stage}:${worker.logicalId}:${worker.workerName}`
    )
  );
  const providerIdentities = HashSet.fromIterable(
    taxkitProviderWorkers.map(
      (worker) => `${worker.stage}:${worker.logicalId}:${worker.workerName}`
    )
  );
  const findings = [
    ...stateWorkers.flatMap((worker) => {
      const identity = `${worker.stage}:${worker.logicalId}:${worker.workerName}`;
      return HashSet.has(providerIdentities, identity)
        ? []
        : [`state Worker is absent from provider inventory: ${identity}`];
    }),
    ...taxkitProviderWorkers.flatMap((worker) => {
      const identity = `${worker.stage}:${worker.logicalId}:${worker.workerName}`;
      return HashSet.has(stateIdentities, identity)
        ? []
        : [`provider Worker is absent from state inventory: ${identity}`];
    }),
  ];
  const [firstFinding, ...remainingFindings] = findings;
  return firstFinding === undefined
    ? Effect.void
    : Effect.fail(
        new DocsDeploymentInventoryDisagreementError({
          findings: [firstFinding, ...remainingFindings],
        })
      );
};

const readInventory = Effect.fn("DocsDeploymentInventory.read")(function* () {
  const state = yield* yield* State;
  const workerProvider = yield* Cloudflare.Worker.Provider;
  const [version, rawStages, rawProviderWorkers] = yield* Effect.all(
    [
      state.getVersion().pipe(
        Effect.mapError(
          () =>
            new DocsDeploymentInventoryReadError({
              operation: "state-version",
            })
        )
      ),
      state.listStages(docsCloudflareStackName).pipe(
        Effect.mapError(
          () =>
            new DocsDeploymentInventoryReadError({
              operation: "state-stages",
            })
        )
      ),
      workerProvider.list().pipe(
        Effect.mapError(
          () =>
            new DocsDeploymentInventoryReadError({
              operation: "provider-workers",
            })
        )
      ),
    ],
    { concurrency: 3 }
  );
  const stages = yield* decode(
    Schema.Array(DocsDeploymentStage),
    rawStages,
    "alchemy-state-stages"
  );
  const providerWorkers = yield* decode(
    Schema.Array(ProviderDocsWorker),
    rawProviderWorkers,
    "cloudflare-worker-list"
  );
  const taxkitProviderWorkers = yield* Effect.forEach(
    providerWorkers.filter((worker) => worker.tags?.includes(stackTag)),
    (worker) =>
      Effect.gen(function* () {
        const stageTag = worker.tags?.find((tag) =>
          tag.startsWith(stageTagPrefix)
        );
        const logicalIdTag = worker.tags?.find((tag) =>
          tag.startsWith(logicalIdTagPrefix)
        );
        return {
          logicalId: yield* decode(
            Schema.Literals(["DocsWebsite"]).pipe(
              Schema.brand("taxkit/DocsDeploymentLogicalResourceId")
            ),
            logicalIdTag?.slice(logicalIdTagPrefix.length),
            `${worker.workerName}:logical-id-tag`
          ),
          stage: yield* decode(
            DocsDeploymentStage,
            stageTag?.slice(stageTagPrefix.length),
            `${worker.workerName}:stage-tag`
          ),
          workerName: worker.workerName,
        };
      }),
    { concurrency: 4 }
  );
  const stageInventory = yield* Effect.forEach(
    stages,
    (stage) =>
      Effect.gen(function* () {
        const rawFqns = yield* state
          .list({ stack: docsCloudflareStackName, stage })
          .pipe(
            Effect.mapError(
              () =>
                new DocsDeploymentInventoryReadError({
                  operation: `state-resources:${stage}`,
                })
            )
          );
        const fqns = yield* decode(
          Schema.Array(Schema.NonEmptyString),
          rawFqns,
          `alchemy-state-resource-fqns:${stage}`
        );
        const resources = yield* Effect.forEach(
          fqns,
          (fqn) =>
            Effect.gen(function* () {
              const rawResource = yield* state
                .get({ fqn, stack: docsCloudflareStackName, stage })
                .pipe(
                  Effect.mapError(
                    () =>
                      new DocsDeploymentInventoryReadError({
                        operation: `state-resource:${stage}:${fqn}`,
                      })
                  )
                );
              const resource = yield* decode(
                PersistedDocsDeploymentResource,
                rawResource,
                `alchemy-state-resource:${stage}:${fqn}`
              );
              const attributes = yield* decode(
                PersistedDocsWorkerAttributes,
                resource.attr,
                `alchemy-state-worker-attributes:${stage}:${fqn}`
              );
              return {
                instanceId: resource.instanceId,
                logicalId: resource.logicalId,
                resourceType: resource.resourceType,
                status: resource.status,
                workerName: attributes.workerName,
                workerUrl: attributes.url,
              };
            }),
          { concurrency: 2 }
        );
        return { resources, stage };
      }),
    { concurrency: 2 }
  );
  yield* requireDocsDeploymentInventoryAgreement(
    stageInventory,
    taxkitProviderWorkers
  );
  return {
    agreement: "state-provider-agree",
    nonClaims: [
      "This read-only observation does not establish current hosted behavior, deployment/version identity or future availability.",
      "This observation does not authorize mutation, teardown, rollback, DNS, release or publication.",
    ],
    providerWorkers: taxkitProviderWorkers,
    stack: docsCloudflareStackName,
    stages: stageInventory,
    stateStore: {
      id: state.id,
      version,
    },
  } satisfies DocsDeploymentInventoryReport;
});

export interface DocsDeploymentInventoryContract {
  readonly read: () => ReturnType<typeof readInventory>;
}

export class DocsDeploymentInventory extends Context.Service<
  DocsDeploymentInventory,
  DocsDeploymentInventoryContract
>()("taxkit/DocsDeploymentInventory") {}

export const DocsDeploymentInventoryLive = Layer.succeed(
  DocsDeploymentInventory,
  DocsDeploymentInventory.of({ read: () => readInventory() })
);
