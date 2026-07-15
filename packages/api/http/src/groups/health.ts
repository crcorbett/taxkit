import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";

export const HealthResponse = Schema.Struct({
  service: Schema.Literal("taxkit"),
  status: Schema.Literal("ok"),
});

export const GetHealthEndpoint = HttpApiEndpoint.get("getHealth", "/health", {
  success: HealthResponse,
}).annotate(OpenApi.Description, "Return API health.");

export class HealthGroup extends HttpApiGroup.make("health")
  .add(GetHealthEndpoint)
  .prefix("/api")
  .annotate(OpenApi.Title, "Health") {}
