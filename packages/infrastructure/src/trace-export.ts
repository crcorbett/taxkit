import * as Axiom from "@alchemy.run/axiom";
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Output from "alchemy/Output";
import { retain } from "alchemy/RemovalPolicy";
import { Effect, Redacted } from "effect";

import {
  requireProductionStage,
  siteProduction,
  taxKitObservabilityProduction,
} from "./telemetry.js";

export const tracesDestinationName = "taxkit-axiom-traces";
export const logsDestinationName = "taxkit-axiom-logs";

// The retained TaxKit ingest token as a bearer header. Cloudflare holds the
// value; it never becomes a Worker binding or a stack output.
const ingestAuthorization = Effect.gen(function* () {
  const token = yield* Axiom.ApiToken.ref(
    "TaxKitTelemetryIngest",
    taxKitObservabilityProduction
  );
  return token.token.pipe(
    Output.map((secret) => Redacted.make(`Bearer ${Redacted.value(secret)}`))
  );
});

/**
 * The account destinations are TaxKit-owned; only TaxKit Workers opt in.
 * Production Workers depend on them, so a removed declaration or a stack
 * destroy leaves both destinations in place. Production Workers attach only
 * the log destination; the trace destination stays ready but unattached until
 * Cloudflare's automatic spans can leave out URLs and caller details.
 */
const declareTaxKitTraceDestination = Effect.fn(
  "Cloudflare.declareTaxKitTraceDestination"
)(function* () {
  const traces = yield* Axiom.Dataset.ref(
    "SiteProdTracesDataset",
    siteProduction
  );
  return yield* Cloudflare.Workers.ObservabilityDestination(
    "TaxKitAxiomTraces",
    {
      enabled: true,
      headers: {
        Authorization: yield* ingestAuthorization,
        "X-Axiom-Dataset": traces.name,
      },
      logpushDataset: "opentelemetry-traces",
      name: tracesDestinationName,
      url: traces.otelTracesEndpoint,
    }
  ).pipe(retain());
});

/** Logs use a separate destination holding the same retained token. */
const declareTaxKitLogDestination = Effect.fn(
  "Cloudflare.declareTaxKitLogDestination"
)(function* () {
  const logs = yield* Axiom.Dataset.ref("SiteProdLogsDataset", siteProduction);
  return yield* Cloudflare.Workers.ObservabilityDestination("TaxKitAxiomLogs", {
    enabled: true,
    headers: {
      Authorization: yield* ingestAuthorization,
      "X-Axiom-Dataset": logs.name,
    },
    logpushDataset: "opentelemetry-logs",
    name: logsDestinationName,
    url: logs.otelLogsEndpoint,
  }).pipe(retain());
});

/**
 * The `TaxKitTraceExport` stack body. Production Workers read the persisted
 * names; the destinations' headers and configuration are never outputs.
 */
export const declareTaxKitTraceExport = Effect.gen(function* () {
  yield* requireProductionStage;
  const traces = yield* declareTaxKitTraceDestination();
  const logs = yield* declareTaxKitLogDestination();
  return {
    logsDestinationName: logs.name,
    tracesDestinationName: traces.name,
  };
});
