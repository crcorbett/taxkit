import * as Schema from "effect/Schema";

/**
 * A disposable Preview stage owned by one same-repository pull request. The
 * root `pr:*` host scripts check the same bounded pattern before Alchemy runs.
 */
export const PullRequestStage = Schema.String.check(
  Schema.isPattern(/^pr-[1-9]\d{0,6}$/u)
).pipe(Schema.brand("taxkit/PullRequestStage"));
export type PullRequestStage = typeof PullRequestStage.Type;

/**
 * A hosted TaxKit stage: retained production or one pull-request Preview.
 * Local development stages belong to infrastructure and never reach hosts.
 */
export const DeploymentStage = Schema.Union([
  Schema.Literal("prod"),
  PullRequestStage,
]).pipe(Schema.brand("taxkit/DeploymentStage"));
export type DeploymentStage = typeof DeploymentStage.Type;
