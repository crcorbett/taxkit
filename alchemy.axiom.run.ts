import { declareTaxKitObservability } from "@taxkit/infrastructure/axiom";
import {
  TaxKitObservability,
  telemetryStackProps,
} from "@taxkit/infrastructure/telemetry";

// TaxKit owns its ingest token and dashboards; Site continues to own the
// three shared datasets. The stack accepts only `prod`.
export default TaxKitObservability.make(
  telemetryStackProps,
  declareTaxKitObservability
);
