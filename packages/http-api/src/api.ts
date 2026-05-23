import { HttpApi, OpenApi } from "effect/unstable/httpapi";

import { PublicCalculationMetadataGroup } from "./groups/calculators.js";
import { HealthGroup } from "./groups/health.js";

export class WhatTaxApi extends HttpApi.make("WhatTaxApi")
  .add(HealthGroup)
  .add(PublicCalculationMetadataGroup)
  .annotate(OpenApi.Title, "WhatTax API")
  .annotate(
    OpenApi.Description,
    "HTTP API for WhatTax health checks, public calculator metadata and public calculator execution."
  ) {}
