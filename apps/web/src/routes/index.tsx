import { createFileRoute } from "@tanstack/react-router";
import { WhatTaxHttpApiService } from "@whattax/http-api/client";
import { Effect } from "effect";

import { getRouteRuntime } from "#/lib/route-runtime";

export const Route = createFileRoute("/")({
  component() {
    const health = Route.useLoaderData();

    return (
      <section className="home">
        <h1>WhatTax</h1>
        <p>
          TanStack Start app with server and client runtimes calling the
          standalone Effect HTTP API service.
        </p>
        <p>
          API status: <strong>{health.status}</strong>
        </p>
      </section>
    );
  },
  loader: async (loaderContext) => {
    const runtime = getRouteRuntime(loaderContext);
    const health = await runtime.runPromise(
      Effect.gen(function* loadHealth() {
        const api = yield* WhatTaxHttpApiService;
        return yield* api.health.getHealth();
      })
    );

    return {
      service: health.service,
      status: health.status,
    };
  },
});
