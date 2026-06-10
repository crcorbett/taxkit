import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import type { RouterContext } from "#/lib/route-runtime";
import { getDocsRuntime } from "#/lib/runtime";

import { routeTree } from "./routeTree.gen";

export const getRouter = function getRouter() {
  return createTanStackRouter({
    context: {
      docs: getDocsRuntime(),
    } satisfies RouterContext,
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
  });
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
