import { createFileRoute } from "@tanstack/react-router";

import type { WhatTaxServerContext } from "#/lib/route-runtime";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const isWhatTaxServerContext = (
  value: unknown
): value is WhatTaxServerContext =>
  isRecord(value) && typeof value.handleApiRequest === "function";

const requireServerContext = (context: unknown): WhatTaxServerContext => {
  const serverContext = isRecord(context) ? context.serverContext : undefined;

  if (!isWhatTaxServerContext(serverContext)) {
    throw new Error("WhatTax server context is required for API routes");
  }

  return serverContext;
};

const serve = async ({
  context,
  request,
}: {
  readonly context: unknown;
  readonly request: Request;
}) => await requireServerContext(context).handleApiRequest(request);

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
