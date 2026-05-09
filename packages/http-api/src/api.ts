import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthGroup } from "./groups/health.js";

export class WhatTaxApi extends HttpApi.make("WhatTaxApi")
  .add(HealthGroup)
  .annotate(OpenApi.Title, "WhatTax API")
  .annotate(OpenApi.Description, "HTTP API for the WhatTax web app.") {}
