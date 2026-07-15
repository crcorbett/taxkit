import { HttpApi, OpenApi } from "effect/unstable/httpapi";

import { CalculatorApiGroup } from "./groups/calculators.js";
import { HealthGroup } from "./groups/health.js";

export class TaxKitApi extends HttpApi.make("TaxKitApi")
  .add(HealthGroup)
  .add(CalculatorApiGroup)
  .annotate(OpenApi.Title, "TaxKit API")
  .annotate(
    OpenApi.Description,
    "HTTP API for TaxKit health checks, public calculator metadata and public calculator execution."
  ) {}
