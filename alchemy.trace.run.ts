import {
  TaxKitTraceExport,
  telemetryStackProps,
} from "@taxkit/infrastructure/telemetry";
import { declareTaxKitTraceExport } from "@taxkit/infrastructure/trace-export";

// Separate state keeps dashboard updates independent of Cloudflare
// observability permissions. The stack accepts only `prod`.
export default TaxKitTraceExport.make(
  telemetryStackProps,
  declareTaxKitTraceExport
);
