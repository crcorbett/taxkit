import { createFileRoute } from "@tanstack/react-router";
import { TaxKitHttpApiService } from "@taxkit/api-http/client";
import { Effect } from "effect";

export const Route = createFileRoute("/")({
  component: function HomeRoute() {
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
  loader: ({ context, abortController }) =>
    context.api.runPromise(
      Effect.gen(function* () {
        const api = yield* TaxKitHttpApiService;
        const health = yield* api.health.getHealth();
        return { service: health.service, status: health.status } as const;
      }),
      { signal: abortController.signal }
    ),
});
