import * as Alchemy from "alchemy";
import * as Axiom from "alchemy/Axiom";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Output from "alchemy/Output";
import { Stage } from "alchemy/Stage";
import { Config, ConfigProvider, Effect, Layer, Schema } from "effect";

import { deploymentSecrets } from "./secrets.js";

/**
 * Stack names and the one stage of TaxKit's production-only telemetry stacks.
 * Stack classes, references and entry points read these names instead of
 * repeating them.
 */
export const taxKitObservabilityStackName = "TaxKitObservability";
export const taxKitTraceExportStackName = "TaxKitTraceExport";
export const telemetryStage = "prod";

export const taxKitObservabilityProduction = {
  stack: taxKitObservabilityStackName,
  stage: telemetryStage,
} as const;

/**
 * Site's production stack owns the three shared Axiom datasets. TaxKit reads
 * their persisted attributes through resource references; it never declares,
 * adopts or changes them.
 */
export const siteProduction = {
  stack: "CooperCorbettSiteCloudflare",
  stage: "prod",
} as const;

export const SharedLogsDatasetName = Schema.Literal("site-prod-logs").pipe(
  Schema.brand("taxkit/SharedLogsDatasetName")
);
export type SharedLogsDatasetName = typeof SharedLogsDatasetName.Type;
export const SharedTracesDatasetName = Schema.Literal("site-prod-traces").pipe(
  Schema.brand("taxkit/SharedTracesDatasetName")
);
export type SharedTracesDatasetName = typeof SharedTracesDatasetName.Type;
export const SharedMetricsDatasetName = Schema.Literal(
  "site-prod-metrics"
).pipe(Schema.brand("taxkit/SharedMetricsDatasetName"));
export type SharedMetricsDatasetName = typeof SharedMetricsDatasetName.Type;

export interface SharedDatasets {
  readonly logsDataset: SharedLogsDatasetName;
  readonly tracesDataset: SharedTracesDatasetName;
  readonly metricsDataset: SharedMetricsDatasetName;
}

/** Site's three shared datasets, which TaxKit reads and never declares. */
export const sharedDatasets: SharedDatasets = {
  logsDataset: SharedLogsDatasetName.make("site-prod-logs"),
  metricsDataset: SharedMetricsDatasetName.make("site-prod-metrics"),
  tracesDataset: SharedTracesDatasetName.make("site-prod-traces"),
};

/** TaxKit's Axiom ingest token and dashboards (`alchemy.axiom.run.ts`). */
export class TaxKitObservability extends Alchemy.Stack<
  TaxKitObservability,
  { readonly dashboardCount: number }
>()(taxKitObservabilityStackName) {}

interface TaxKitTraceExportOutputs {
  readonly logsDestinationName: string;
  readonly tracesDestinationName: string;
}

/** TaxKit's Cloudflare log and trace destinations (`alchemy.trace.run.ts`). */
export class TaxKitTraceExport extends Alchemy.Stack<
  TaxKitTraceExport,
  TaxKitTraceExportOutputs
>()(taxKitTraceExportStackName) {}

/**
 * The log destination name persisted by `TaxKitTraceExport/prod`, read from
 * the apps stack. Planning fails until that stack has been deployed.
 */
export const taxKitLogsDestinationProduction =
  Output.stackRef<TaxKitTraceExportOutputs>(taxKitTraceExportStackName, {
    stage: telemetryStage,
  }).pipe(Effect.map(Output.map((outputs) => outputs.logsDestinationName)));

/**
 * Both telemetry stacks share providers, state and secrets. The Axiom provider
 * reads `AXIOM_TOKEN` (the TaxKit management key) from `taxkit/prd` through
 * the ordinary native sources. Both provider Layers read HttpClient from the
 * stack services, so neither depends on the other.
 */
export const telemetryStackProps = {
  // @effect-diagnostics-next-line layerMergeAllWithDependencies:off
  providers: Layer.mergeAll(Cloudflare.providers(), Axiom.providers()),
  secrets: deploymentSecrets,
  state: Cloudflare.state(),
};

/**
 * Both telemetry stacks are production-only: Production Workers depend on
 * their resources, and Preview and local stages export nothing.
 */
export const requireProductionStage = Effect.gen(function* () {
  if ((yield* Stage) !== telemetryStage) {
    return yield* Effect.fail(
      new Config.ConfigError(
        new ConfigProvider.SourceError({
          message: "TaxKit telemetry stacks require the prod stage",
        })
      )
    );
  }
  return yield* Effect.void;
});
