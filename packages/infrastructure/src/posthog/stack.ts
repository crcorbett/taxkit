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

// A single durable stack owns both projects. PR and local graphs never create
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
  const production = yield* PostHogProject(
    "TaxKitProductionProject",
    ProjectDefinition.make({
      environment: "production",
      marker: "taxkit:posthog:production:v1",
      name: PostHogManagedName.make("TaxKit Production"),
      organisation,
      region: "us",
    })
  ).pipe(retain());
  const preview = yield* PostHogProject(
    "TaxKitPreviewProject",
    ProjectDefinition.make({
      environment: "preview",
      marker: "taxkit:posthog:preview:v1",
      name: PostHogManagedName.make("TaxKit Preview"),
      organisation,
      region: "us",
    })
  ).pipe(retain());
  return { previewProjectId: preview.id, productionProjectId: production.id };
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
