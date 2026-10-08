import { Array as EffectArray, Context, Effect, HashSet } from "effect";

import type {
  DocsDeploymentInventoryReport,
  DocsDeploymentInventoryInputError,
  DocsDeploymentInventoryReadError,
} from "./inventory.schemas.js";
import { DocsDeploymentInventoryDisagreementError } from "./inventory.schemas.js";

export const requireDocsDeploymentInventoryAgreement = (
  stageInventory: DocsDeploymentInventoryReport["stages"],
  taxkitProviderWorkers: DocsDeploymentInventoryReport["providerWorkers"]
) => {
  const stateWorkers = EffectArray.flatMap(stageInventory, (entry) =>
    EffectArray.flatMap(entry.resources, (resource) =>
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
    EffectArray.map(
      stateWorkers,
      (worker) => `${worker.stage}:${worker.logicalId}:${worker.workerName}`
    )
  );
  const providerIdentities = HashSet.fromIterable(
    EffectArray.map(
      taxkitProviderWorkers,
      (worker) => `${worker.stage}:${worker.logicalId}:${worker.workerName}`
    )
  );
  const findings = [
    ...EffectArray.flatMap(stateWorkers, (worker) => {
      const identity = `${worker.stage}:${worker.logicalId}:${worker.workerName}`;
      return HashSet.has(providerIdentities, identity)
        ? []
        : [`state Worker is absent from provider inventory: ${identity}`];
    }),
    ...EffectArray.flatMap(taxkitProviderWorkers, (worker) => {
      const identity = `${worker.stage}:${worker.logicalId}:${worker.workerName}`;
      return HashSet.has(stateIdentities, identity)
        ? []
        : [`provider Worker is absent from state inventory: ${identity}`];
    }),
  ];
  return EffectArray.match(findings, {
    onEmpty: () => Effect.void,
    onNonEmpty: (nonEmpty) =>
      Effect.fail(
        new DocsDeploymentInventoryDisagreementError({ findings: nonEmpty })
      ),
  });
};

export interface DocsDeploymentInventoryContract {
  readonly read: Effect.Effect<
    DocsDeploymentInventoryReport,
    | DocsDeploymentInventoryInputError
    | DocsDeploymentInventoryReadError
    | DocsDeploymentInventoryDisagreementError
  >;
}

export class DocsDeploymentInventory extends Context.Service<
  DocsDeploymentInventory,
  DocsDeploymentInventoryContract
>()("taxkit/DocsDeploymentInventory") {}
