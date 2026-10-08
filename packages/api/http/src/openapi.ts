import { OpenApi } from "effect/http-api";

import { TaxKitApi } from "./api.js";

export const taxKitOpenApiSpec: OpenApi.OpenAPISpec =
  OpenApi.fromApi(TaxKitApi);
