import { HttpApi, OpenApi } from "effect/http-api";

import { CalculatorApiGroup } from "./groups/calculators.js";
import { ContentApiGroup } from "./groups/content.js";
import { HealthGroup } from "./groups/health.js";

export class TaxKitApi extends HttpApi.make("TaxKitApi")
  .add(HealthGroup)
  .add(CalculatorApiGroup)
  .add(ContentApiGroup)
  .annotate(OpenApi.Title, "TaxKit API")
  .annotate(
    OpenApi.Description,
    "HTTP API for TaxKit health checks, public calculator metadata, calculator execution and accepted public documentation."
  ) {}
