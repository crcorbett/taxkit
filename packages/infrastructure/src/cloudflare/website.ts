import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { DocsDeploymentStage, DocsLocalDevelopmentStage } from "../stage.js";

export const DocsCloudflareStackStage = Schema.Union([
  DocsDeploymentStage,
  DocsLocalDevelopmentStage,
]);

export type DocsCloudflareStackStage = typeof DocsCloudflareStackStage.Type;

export const docsCloudflareStackName = "TaxKitDocsCloudflare";
export const docsWorkerResourceId = "DocsWebsite";
export const docsWorkerCompatibilityDate = "2026-06-24";
export const docsWorkerCompatibilityFlags = ["nodejs_compat"] as const;
export const docsWorkerAssetHeaders =
  "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n";
export const docsWorkerMemo = {
  include: ["**/*"],
  lockfile: true,
  workspaces: [
    {
      cwd: "../../packages/docs-content",
      include: ["**/*"],
      lockfile: false,
    },
    {
      cwd: "../../packages/docs-fumadocs",
      include: ["**/*"],
      lockfile: false,
    },
  ],
};

export const decodeDocsCloudflareStackStage = (
  value: typeof Schema.Unknown.Type
) =>
  Schema.decodeUnknownEffect(DocsCloudflareStackStage)(value).pipe(
    Effect.mapError((error) => new Config.ConfigError(error))
  );

export const docsWorkerObservability = {
  enabled: true,
  headSamplingRate: 1,
  logs: {
    enabled: true,
    headSamplingRate: 1,
    invocationLogs: true,
    persist: true,
  },
  traces: {
    enabled: false,
    headSamplingRate: 0,
    persist: false,
  },
} as const;
