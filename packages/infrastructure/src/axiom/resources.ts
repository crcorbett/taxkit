import * as Axiom from "@alchemy.run/axiom";
import * as Output from "alchemy/Output";
import { retain } from "alchemy/RemovalPolicy";
import { Effect } from "effect";

import { requireProductionStage, sharedDatasets } from "../telemetry.js";
import type { SharedDatasets } from "../telemetry.js";
import { taxKitDashboardDefinitions } from "./dashboards/index.js";

/**
 * Site owns the three physical datasets; TaxKit owns only its scoped ingest
 * token and dashboards. Cloudflare's export destinations hold the token, so it
 * is retained like the dashboards: removing a declaration or destroying this
 * stack must not cut off Production telemetry. Axiom tokens have no update
 * API, so a changed prop replaces the token and leaves the old one live in
 * Axiom for deliberate revocation.
 */
const declareTaxKitAxiomResources = Effect.fn("Axiom.declareTaxKitResources")(
  function* (datasets: SharedDatasets) {
    const ingest = yield* Axiom.ApiToken("TaxKitTelemetryIngest", {
      datasetCapabilities: {
        [datasets.logsDataset]: { ingest: ["create"] },
        [datasets.metricsDataset]: { ingest: ["create"] },
        [datasets.tracesDataset]: { ingest: ["create"] },
      },
      description: "Ingest TaxKit Production Worker telemetry only",
      name: "taxkit-telemetry-ingest",
    }).pipe(retain());

    const definitions = taxKitDashboardDefinitions(datasets);
    yield* Effect.forEach(
      definitions,
      Effect.fnUntraced(function* (definition) {
        yield* Axiom.Dashboard(definition.logicalId, {
          // Alchemy's public Chart model is readonly while its provider input
          // requires mutable SDK arrays. Alchemy resolves the typed document at
          // plan time without changing its JSON value.
          dashboard: Output.asOutput(definition.dashboard).as<
            Axiom.DashboardProps["dashboard"]
          >(),
          overwrite: true,
          uid: definition.uid,
        }).pipe(retain());
      }),
      { concurrency: 1, discard: true }
    );

    return { dashboardCount: definitions.length, ingest };
  }
);

/** The `TaxKitObservability` stack body: Production only, no other output. */
export const declareTaxKitObservability = Effect.gen(function* () {
  yield* requireProductionStage;
  const { dashboardCount } = yield* declareTaxKitAxiomResources(sharedDatasets);
  return { dashboardCount };
});
