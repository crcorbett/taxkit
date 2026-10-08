import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { websiteSearchParameters } from "#/lib/docs/search-location.boundary";
import {
  loadWebsiteDocsSearch,
  loadWebsiteDocsPage,
  loadWebsiteSettings,
} from "#/lib/loaders";
import type { WebsiteServerRenderContext } from "#/lib/schemas";

import { routeTree } from "./routeTree.gen";

export const getRouter = () =>
  createTanStackRouter({
    context: {
      loadDocsPage: loadWebsiteDocsPage,
      loadDocsSearch: loadWebsiteDocsSearch,
      loadSettings: loadWebsiteSettings,
    },
    defaultPreload: "intent",
    parseSearch: websiteSearchParameters.parse,
    routeTree,
    scrollRestoration: true,
    stringifySearch: websiteSearchParameters.stringify,
  });
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
    server: { requestContext: WebsiteServerRenderContext };
  }
}
