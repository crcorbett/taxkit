import { createFileRoute } from "@tanstack/react-router";
import { WhatTaxHttpApiService } from "@whattax/http-api/client";
import { Effect } from "effect";

import { getRouteRuntime } from "#/lib/route-runtime";

export const Route = createFileRoute("/")({
  component: HomePage,
  loader: async (loaderContext) => {
    const runtime = getRouteRuntime(loaderContext);
    const health = await runtime.runPromise(
      Effect.gen(function* () {
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

function HomePage() {
  const health = Route.useLoaderData();

  return (
    <section className="home">
      <h1>WhatTax</h1>
      <p>
        TanStack Start app with a single server runtime, a single client
        runtime, and an Effect HTTP API mounted at <code>/api/*</code>.
      </p>
      <p>
        API status: <strong>{health.status}</strong>
      </p>
    </section>
  );
}
