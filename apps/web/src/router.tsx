import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { loadWebsiteDocsPage, loadWebsiteSettings } from "#/lib/loaders";
import type { WebsiteServerRenderContext } from "#/lib/schemas";

import { routeTree } from "./routeTree.gen";

export const getRouter = () =>
  createTanStackRouter({
    context: {
      loadDocsPage: loadWebsiteDocsPage,
      loadSettings: loadWebsiteSettings,
    },
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
  });
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
    server: { requestContext: WebsiteServerRenderContext };
  }
}
