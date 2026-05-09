import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { getAppRuntime } from "#/lib/runtime";
import type { RouterContext } from "#/lib/route-runtime";
import { routeTree } from "./routeTree.gen";

export const getRouter = function getRouter() {
  return createTanStackRouter({
    context: {
      api: getAppRuntime(),
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
