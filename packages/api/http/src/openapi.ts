import { OpenApi } from "effect/unstable/httpapi";

import { TaxKitApi } from "./api.js";

export const taxKitOpenApiSpec: OpenApi.OpenAPISpec =
  OpenApi.fromApi(TaxKitApi);
