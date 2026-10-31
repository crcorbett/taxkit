import * as Doppler from "@alchemy.run/doppler";
import { retain } from "alchemy/RemovalPolicy";
import * as Secrets from "alchemy/Secrets";
import type { StackSecrets } from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { Cause, Config, ConfigProvider, Effect, Layer } from "effect";

import { SecretSourceError } from "../secrets.js";
import { PostHogProject } from "./projects.provider.js";
import {
  PostHogManagedName,
  PostHogOrganisationId,
  ProjectDefinition,
} from "./schemas.js";
// A single durable stack owns the shared project. PR and local graphs never create
// or replace a project. The current application graph still collects off.
export const declarePostHogProjects = Effect.gen(function* () {
  const stage = yield* Stage;
  if (stage !== "prod") {
    return yield* Effect.fail(
      new Config.ConfigError(
        new ConfigProvider.SourceError({
          message: "PostHog projects require the durable prod stage",
        })
      )
    );
  }
  const organisation = yield* Config.schema(
    PostHogOrganisationId,
    "POSTHOG_ORGANISATION_ID"
  );
  const definition = ProjectDefinition.make({
    marker: "taxkit:posthog:shared:v1",
    name: PostHogManagedName.make("TaxKit"),
    organisation,
    region: "us",
  });
  const project = yield* PostHogProject("TaxKitProject", definition).pipe(
    retain()
  );
  return { projectId: project.id };
});
const PostHogSecretsLive: Layer.Layer<
  never,
  SecretSourceError,
  Secrets.SecretsServices
> = Doppler.Secrets({ config: "prd", project: "taxkit" }).layer.pipe(
  Layer.catchCause((cause) =>
    Layer.effectDiscard(
      Effect.failCause(
        cause.pipe(
          Cause.map(() => new SecretSourceError({ source: "doppler" }))
        )
      )
    )
  )
);
export const nativePostHogSecrets = (({ stage }: Secrets.SecretsContext) => {
  if (stage !== "prod") {
    return [Secrets.ProcessEnv({ disabled: true })];
  }
  return [PostHogSecretsLive, Secrets.ProcessEnv({ disabled: true })];
}) satisfies StackSecrets;
