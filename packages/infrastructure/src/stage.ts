import * as Schema from "effect/Schema";

// Pull-request Preview stages share one Doppler config and own one stage each.
export const PreviewStage = Schema.String.check(
  Schema.isPattern(/^pr-[1-9]\d{0,6}$/u)
).pipe(Schema.brand("taxkit/PreviewStage"));

// Local development uses its own stage and local state, never cloud state.
export const LocalStage = Schema.String.check(
  Schema.isPattern(/^dev_[a-z0-9]+(?:[-_a-z0-9]+)*$/iu)
).pipe(Schema.brand("taxkit/LocalStage"));

export const DeploymentStage = Schema.Union([
  Schema.Literal("prod"),
  PreviewStage,
]);
export type DeploymentStage = typeof DeploymentStage.Type;

export const AppStage = Schema.Union([DeploymentStage, LocalStage]);
export type AppStage = typeof AppStage.Type;
