import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { docsCloudflareStackName } from "@taxkit/infrastructure/website";
import * as Cloudflare from "alchemy/Cloudflare";
import { State } from "alchemy/State";
import { Array as EffectArray, Effect, Layer, Option, Schema } from "effect";

import {
  DocsDeploymentInventoryReport,
  DocsDeploymentInventoryInputError,
  DocsDeploymentInventoryReadError,
  PersistedDocsDeploymentResource,
  PersistedDocsWorkerAttributes,
  ProviderDocsWorker,
} from "./inventory.schemas.js";
import {
  DocsDeploymentInventory,
  requireDocsDeploymentInventoryAgreement,
} from "./inventory.service.js";

const stackTag = `alchemy:stack:${docsCloudflareStackName}`;
const stageTagPrefix = "alchemy:stage:";
const logicalIdTagPrefix = "alchemy:id:";

export const DocsDeploymentInventoryLive = Layer.effect(
  DocsDeploymentInventory,
  Effect.gen(function* () {
    const state = yield* yield* State;
    const workerProvider = yield* Cloudflare.Worker.Provider;
    return DocsDeploymentInventory.of({
      read: Effect.gen(function* () {
        const [version, stages, providerWorkers] = yield* Effect.all(
          [
            state.getVersion().pipe(
              Effect.mapError(
                () =>
                  new DocsDeploymentInventoryReadError({
                    operation: "state-version",
                  })
              ),
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  DocsDeploymentInventoryReport.fields.stateStore.fields.version
                )
              ),
              Effect.catchTag("SchemaError", () =>
                Effect.fail(
                  new DocsDeploymentInventoryInputError({
                    target: "alchemy-state-version",
                  })
                )
              )
            ),
            state.listStages(docsCloudflareStackName).pipe(
              Effect.mapError(
                () =>
                  new DocsDeploymentInventoryReadError({
                    operation: "state-stages",
                  })
              ),
              Effect.flatMap(
                Schema.decodeUnknownEffect(Schema.Array(DocsDeploymentStage), {
                  onExcessProperty: "ignore",
                })
              ),
              Effect.catchTag("SchemaError", () =>
                Effect.fail(
                  new DocsDeploymentInventoryInputError({
                    target: "alchemy-state-stages",
                  })
                )
              )
            ),
            workerProvider.list().pipe(
              Effect.mapError(
                () =>
                  new DocsDeploymentInventoryReadError({
                    operation: "provider-workers",
                  })
              ),
              Effect.flatMap(
                Schema.decodeUnknownEffect(Schema.Array(ProviderDocsWorker), {
                  onExcessProperty: "ignore",
                })
              ),
              Effect.catchTag("SchemaError", () =>
                Effect.fail(
                  new DocsDeploymentInventoryInputError({
                    target: "cloudflare-worker-list",
                  })
                )
              )
            ),
          ],
          { concurrency: 3 }
        );
        const taxkitProviderWorkers = yield* Effect.forEach(
          EffectArray.filter(providerWorkers, (worker) =>
            Option.exists(Option.fromNullishOr(worker.tags), (tags) =>
              EffectArray.contains(tags, stackTag)
            )
          ),
          (worker) =>
            Effect.gen(function* () {
              const stageTag = Option.fromNullishOr(worker.tags).pipe(
                Option.flatMap((tags) =>
                  EffectArray.findFirst(tags, (tag) =>
                    tag.startsWith(stageTagPrefix)
                  )
                )
              );
              const logicalIdTag = Option.fromNullishOr(worker.tags).pipe(
                Option.flatMap((tags) =>
                  EffectArray.findFirst(tags, (tag) =>
                    tag.startsWith(logicalIdTagPrefix)
                  )
                )
              );
              return {
                logicalId: yield* Schema.decodeUnknownEffect(
                  PersistedDocsDeploymentResource.fields.logicalId,
                  { onExcessProperty: "ignore" }
                )(
                  Option.getOrUndefined(
                    Option.map(logicalIdTag, (tag) =>
                      tag.slice(logicalIdTagPrefix.length)
                    )
                  )
                ).pipe(
                  Effect.mapError(
                    () =>
                      new DocsDeploymentInventoryInputError({
                        target: `${worker.workerName}:logical-id-tag`,
                      })
                  )
                ),
                stage: yield* Schema.decodeUnknownEffect(DocsDeploymentStage, {
                  onExcessProperty: "ignore",
                })(
                  Option.getOrUndefined(
                    Option.map(stageTag, (tag) =>
                      tag.slice(stageTagPrefix.length)
                    )
                  )
                ).pipe(
                  Effect.mapError(
                    () =>
                      new DocsDeploymentInventoryInputError({
                        target: `${worker.workerName}:stage-tag`,
                      })
                  )
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
              const fqns = yield* Schema.decodeUnknownEffect(
                Schema.Array(PersistedDocsDeploymentResource.fields.fqn),
                { onExcessProperty: "ignore" }
              )(rawFqns).pipe(
                Effect.mapError(
                  () =>
                    new DocsDeploymentInventoryInputError({
                      target: `alchemy-state-resource-fqns:${stage}`,
                    })
                )
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
                    const resource = yield* Schema.decodeUnknownEffect(
                      PersistedDocsDeploymentResource,
                      { onExcessProperty: "ignore" }
                    )(rawResource).pipe(
                      Effect.mapError(
                        () =>
                          new DocsDeploymentInventoryInputError({
                            target: `alchemy-state-resource:${stage}:${fqn}`,
                          })
                      )
                    );
                    const attributes = yield* Schema.decodeUnknownEffect(
                      PersistedDocsWorkerAttributes,
                      { onExcessProperty: "ignore" }
                    )(resource.attr).pipe(
                      Effect.mapError(
                        () =>
                          new DocsDeploymentInventoryInputError({
                            target: `alchemy-state-worker-attributes:${stage}:${fqn}`,
                          })
                      )
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
      }).pipe(Effect.withSpan("DocsDeploymentInventory.read")),
    });
  })
);
