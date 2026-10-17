import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { healthPath } from "../routes.js";

export const HealthResponse = Schema.Struct({
  service: Schema.Literal("taxkit"),
  status: Schema.Literal("ok"),
});

const GetHealthEndpoint = HttpApiEndpoint.get("getHealth", healthPath, {
  success: HealthResponse,
}).annotate(OpenApi.Description, "Return API health.");

export class HealthGroup extends HttpApiGroup.make("health")
  .add(GetHealthEndpoint)
  .annotate(OpenApi.Title, "Health") {}
