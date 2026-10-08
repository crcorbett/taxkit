import * as Doppler from "alchemy/Doppler";
import { retain } from "alchemy/RemovalPolicy";
import * as Secrets from "alchemy/Secrets";
import type { StackSecrets } from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { Config, ConfigProvider, Effect } from "effect";

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
  const project = yield* PostHogProject(
    "TaxKitProject",
    ProjectDefinition.make({
      marker: "taxkit:posthog:shared:v1",
      name: PostHogManagedName.make("TaxKit"),
      organisation,
      region: "us",
    })
  ).pipe(retain());
  return { projectId: project.id };
});

export const nativePostHogSecrets = (({ stage }: Secrets.SecretsContext) => {
  if (stage !== "prod") {
    return [Secrets.ProcessEnv({ disabled: true })];
  }
  return [
    Doppler.Secrets({ config: "prd", project: "taxkit" }).layer,
    Secrets.ProcessEnv({ disabled: true }),
  ];
}) satisfies StackSecrets;
