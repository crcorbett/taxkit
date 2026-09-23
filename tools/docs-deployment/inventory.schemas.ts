import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import { Schema } from "effect";

const DocsDeploymentLogicalResourceId = Schema.Literal("DocsWebsite").pipe(
  Schema.brand("taxkit/DocsDeploymentLogicalResourceId")
);

const DocsDeploymentWorkerName = Schema.NonEmptyString.pipe(
  Schema.brand("taxkit/DocsDeploymentWorkerName")
);

const DocsDeploymentWorkerUrl = Schema.URLFromString.pipe(
  Schema.brand("taxkit/DocsDeploymentWorkerUrl")
);

export const PersistedDocsDeploymentResource = Schema.Struct({
  attr: Schema.optional(Schema.Unknown),
  fqn: Schema.NonEmptyString,
  instanceId: Schema.NonEmptyString,
  logicalId: DocsDeploymentLogicalResourceId,
  resourceType: Schema.Literal("Cloudflare.Worker"),
  status: Schema.NonEmptyString,
});

export const PersistedDocsWorkerAttributes = Schema.Struct({
  tags: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  url: DocsDeploymentWorkerUrl,
  workerName: DocsDeploymentWorkerName,
});

export const ProviderDocsWorker = Schema.Struct({
  tags: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  workerName: DocsDeploymentWorkerName,
});

export const DocsDeploymentStateStoreCredentials = Schema.Struct({
  accountId: Schema.NonEmptyString,
  authToken: Schema.RedactedFromValue(Schema.NonEmptyString),
  url: Schema.URLFromString,
});
export type DocsDeploymentStateStoreCredentials =
  typeof DocsDeploymentStateStoreCredentials.Type;

const InventoryResource = Schema.Struct({
  instanceId: Schema.NonEmptyString,
  logicalId: DocsDeploymentLogicalResourceId,
  resourceType: Schema.Literal("Cloudflare.Worker"),
  status: Schema.NonEmptyString,
  workerName: Schema.optional(DocsDeploymentWorkerName),
  workerUrl: Schema.optional(DocsDeploymentWorkerUrl),
});

const InventoryStage = Schema.Struct({
  resources: Schema.Array(InventoryResource),
  stage: DocsDeploymentStage,
});

const InventoryProviderWorker = Schema.Struct({
  logicalId: DocsDeploymentLogicalResourceId,
  stage: DocsDeploymentStage,
  workerName: DocsDeploymentWorkerName,
});

export const DocsDeploymentInventoryReport = Schema.Struct({
  agreement: Schema.Literal("state-provider-agree"),
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  providerWorkers: Schema.Array(InventoryProviderWorker),
  stack: Schema.Literal("TaxKitDocsCloudflare"),
  stages: Schema.Array(InventoryStage),
  stateStore: Schema.Struct({
    id: Schema.NonEmptyString,
    version: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  }),
});

export type DocsDeploymentInventoryReport =
  typeof DocsDeploymentInventoryReport.Type;

export class DocsDeploymentInventoryInputError extends Schema.TaggedErrorClass<DocsDeploymentInventoryInputError>()(
  "DocsDeploymentInventoryInputError",
  {
    fileJsonObject: Schema.optional(Schema.Boolean),
    fileVisible: Schema.optional(Schema.Boolean),
    target: Schema.NonEmptyString,
  }
) {}

export class DocsDeploymentInventoryReadError extends Schema.TaggedErrorClass<DocsDeploymentInventoryReadError>()(
  "DocsDeploymentInventoryReadError",
  {
    operation: Schema.NonEmptyString,
  }
) {}

export class DocsDeploymentInventoryDisagreementError extends Schema.TaggedErrorClass<DocsDeploymentInventoryDisagreementError>()(
  "DocsDeploymentInventoryDisagreementError",
  {
    findings: Schema.NonEmptyArray(Schema.NonEmptyString),
  }
) {}
