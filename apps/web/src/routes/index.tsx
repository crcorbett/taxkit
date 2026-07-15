import { createFileRoute } from "@tanstack/react-router";
import { TaxKitHttpApiService } from "@taxkit/api-http/client";
import { Effect } from "effect";

import { getRouteRuntime } from "#/lib/route-runtime";

export const Route = createFileRoute("/")({
  component() {
    const health = Route.useLoaderData();

    return (
      <section className="home">
        <h1>TaxKit</h1>
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
        const api = yield* TaxKitHttpApiService;
        return yield* api.health.getHealth();
      })
    );

    return {
      service: health.service,
      status: health.status,
    };
  },
});
