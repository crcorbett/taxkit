import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { websiteSearchParameters } from "#/lib/docs/search-location.ingress";
import { createLoaderRegistry } from "#/lib/pages/loaders";

import { routeTree } from "./routeTree.gen";

// Public documentation loader data is reused for one minute, including intent
// preloads. Routes with live data opt out.
export const getRouter = () =>
  createTanStackRouter({
    context: { registry: createLoaderRegistry() },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 60_000,
    defaultStaleTime: 60_000,
    parseSearch: websiteSearchParameters.parse,
    routeTree,
    scrollRestoration: true,
    stringifySearch: websiteSearchParameters.stringify,
  });
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
