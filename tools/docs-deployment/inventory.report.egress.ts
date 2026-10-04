import { Effect, Schema } from "effect";

import {
  DocsDeploymentInventoryOutputError,
  DocsDeploymentInventoryReport,
} from "./inventory.schemas.js";

const InventoryReportJson = Schema.fromJsonString(
  DocsDeploymentInventoryReport,
  { space: 2 }
);
export const encodeDocsDeploymentInventoryReport = (
  report: DocsDeploymentInventoryReport
) =>
  Schema.encodeEffect(InventoryReportJson)(report).pipe(
    Effect.map((source) => `${source}\n`),
    Effect.mapError(
      () => new DocsDeploymentInventoryOutputError({ reason: "encode" })
    )
  );
