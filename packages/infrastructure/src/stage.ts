import { DeploymentStage } from "@taxkit/observability/stage";
import * as Schema from "effect/Schema";

// Local development uses its own stage and local state, never cloud state.
export const LocalStage = Schema.String.check(
  Schema.isPattern(/^dev_[a-z0-9]+(?:[-_a-z0-9]+)*$/iu)
).pipe(Schema.brand("taxkit/LocalStage"));

// Hosted stages have one owner in `@taxkit/observability/stage`.
export const AppStage = Schema.Union([DeploymentStage, LocalStage]);
export type AppStage = typeof AppStage.Type;
