import * as Schema from "effect/Schema";

const PreviewStage = Schema.String.check(Schema.isPattern(/^pr-[1-9]\d*$/u));

export const DocsLocalDevelopmentStage = Schema.String.check(
  Schema.isPattern(/^dev_[a-z0-9]+(?:[-_a-z0-9]+)*$/iu)
).pipe(Schema.brand("taxkit/LocalDocsDevelopmentStage"));

export const DocsDeploymentStage = Schema.Union([
  Schema.Literals(["prod"]),
  PreviewStage,
]).pipe(Schema.brand("taxkit/DocsDeploymentStage"));
