import { createFileRoute } from "@tanstack/react-router";
import type { WhatTaxServerContext } from "#/lib/route-runtime";

const requireServerContext = (context: unknown): WhatTaxServerContext => {
  const serverContext = (context as { serverContext?: WhatTaxServerContext })
    .serverContext;

  if (!serverContext) {
    throw new Error("WhatTax server context is required for API routes");
  }

  return serverContext;
};

const serve = ({
  context,
  request,
}: {
  readonly context: unknown;
  readonly request: Request;
}) => requireServerContext(context).handleApiRequest(request);

export const Route = createFileRoute("/(machine)/api/$")({
  server: {
    handlers: {
      DELETE: serve,
      GET: serve,
      HEAD: serve,
      OPTIONS: serve,
      PATCH: serve,
      POST: serve,
      PUT: serve,
    },
  },
});
