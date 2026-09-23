import { Schema } from "effect";

const AutomationId = Schema.Literals([
  "docs-preview-delivery",
  "docs-production-delivery",
  "docs-preview-teardown",
]);

const MutationOperation = Schema.Literals([
  "preview-deploy",
  "production-deploy",
  "production-rollback",
  "preview-destroy",
]);

const EnvironmentId = Schema.Literals([
  "taxkit-docs-preview",
  "taxkit-docs-production",
  "taxkit-docs-preview-teardown",
]);

const ReceiptPath = Schema.String.check(
  Schema.isPattern(
    /^docs\/evidence\/deployments\/(?!.*\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u
  )
);

const AutomationAuthority = Schema.Struct({
  credentialIdentities: Schema.Array(Schema.NonEmptyString),
  denied: Schema.NonEmptyArray(Schema.NonEmptyString),
  durationOrRevocation: Schema.NonEmptyString,
  environment: EnvironmentId,
  operations: Schema.NonEmptyArray(MutationOperation),
  principal: Schema.NonEmptyString,
  resources: Schema.NonEmptyArray(Schema.NonEmptyString),
});

const AutomationLock = Schema.Struct({
  cancelInProgress: Schema.Boolean,
  group: Schema.NonEmptyString,
  scope: Schema.Literal("stage"),
});

const AutomationPlanContract = Schema.Struct({
  acceptedDigestRequired: Schema.Boolean,
  equalReplanRequired: Schema.Boolean,
  providerReadbackRequired: Schema.Boolean,
});

const AutomationProof = Schema.Struct({
  commandOwner: Schema.NonEmptyString,
  nonClaims: Schema.NonEmptyArray(Schema.NonEmptyString),
  receiptRoute: Schema.NonEmptyString,
  successPostcondition: Schema.NonEmptyString,
});

const AutomationLifecycle = Schema.Struct({
  carryingCost: Schema.NonEmptyString,
  disconfirmingEvidence: Schema.NonEmptyArray(Schema.NonEmptyString),
  retirementCondition: Schema.NonEmptyString,
  reviewTriggers: Schema.NonEmptyArray(Schema.NonEmptyString),
});

const AutomationFailure = Schema.Struct({
  escalationOwner: Schema.NonEmptyString,
  recovery: Schema.NonEmptyString,
  rollback: Schema.NonEmptyString,
  stopConditions: Schema.NonEmptyArray(Schema.NonEmptyString),
});

const AutomationExternalState = Schema.Struct({
  receipt: Schema.NullOr(ReceiptPath),
  status: Schema.Literals(["not-established", "established"]),
});

const DeploymentAutomation = Schema.Struct({
  authority: AutomationAuthority,
  cancellation: Schema.NonEmptyString,
  convergence: Schema.NonEmptyString,
  durableState: Schema.Struct({
    identity: Schema.NonEmptyString,
    kind: Schema.Literals([
      "candidate-plan-provider-receipt",
      "exact-stage-absence-receipt",
    ]),
    location: Schema.NonEmptyString,
  }),
  environment: Schema.Struct({
    id: EnvironmentId,
    trigger: Schema.NonEmptyString,
  }),
  externalState: AutomationExternalState,
  failure: AutomationFailure,
  id: AutomationId,
  idempotence: Schema.NonEmptyString,
  lifecycle: AutomationLifecycle,
  lock: AutomationLock,
  owner: Schema.Literal("taxkit-docs-deployment-automation-owner"),
  plan: AutomationPlanContract,
  proof: AutomationProof,
  signal: Schema.Struct({
    kind: Schema.Literals([
      "trusted-pull-request-dispatch",
      "production-dispatch",
      "pull-request-closed",
    ]),
    revisionSource: Schema.NonEmptyString,
  }),
});

export type DeploymentAutomation = typeof DeploymentAutomation.Type;
export const DeploymentAutomationRegister = Schema.Array(DeploymentAutomation);

const DeploymentControl = Schema.Struct({
  evidence: Schema.NonEmptyString,
  fixture: Schema.NonEmptyString,
  id: Schema.Literals([
    "docs-workflow-candidate-trust",
    "docs-workflow-mutation-lock",
    "docs-preview-teardown-safety",
    "docs-workflow-receipt-reconciliation",
    "docs-workflow-cache-boundary",
  ]),
  owner: Schema.Literal("taxkit-docs-deployment-automation-owner"),
  preventedFailure: Schema.NonEmptyString,
  recovery: Schema.NonEmptyString,
  retirementCondition: Schema.NonEmptyString,
  reviewTrigger: Schema.NonEmptyString,
  signal: Schema.NonEmptyString,
});

export type DeploymentControl = typeof DeploymentControl.Type;
export const DeploymentControlRegister = Schema.Array(DeploymentControl);

export class DeploymentAutomationFinding extends Schema.TaggedClass<DeploymentAutomationFinding>()(
  "DeploymentAutomationFinding",
  {
    invariant: Schema.Literals([
      "automation-register",
      "control-register",
      "candidate-trust",
      "mutation-lock",
      "plan-equality",
      "teardown-safety",
      "external-proof",
    ]),
    recovery: Schema.NonEmptyString,
    target: Schema.NonEmptyString,
  }
) {}

export class DeploymentAutomationInputError extends Schema.TaggedError<DeploymentAutomationInputError>()(
  "DeploymentAutomationInputError",
  {
    target: Schema.NonEmptyString,
  }
) {}

export class DeploymentAutomationPolicyError extends Schema.TaggedError<DeploymentAutomationPolicyError>()(
  "DeploymentAutomationPolicyError",
  {
    findings: Schema.NonEmptyArray(DeploymentAutomationFinding),
  }
) {}
