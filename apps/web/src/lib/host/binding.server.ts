import "@tanstack/react-start/server-only";
import { TaxKitApi } from "@taxkit/api-http/api";
import { ApiDeadlineExceeded, ApiUnavailable } from "@taxkit/api-http/errors";
import { apiReadTimeout, boundedReplies } from "@taxkit/api-http/requests";
import { fromCloudflareFetcher, toHttpClient } from "alchemy/Cloudflare/Bridge";
import { Effect, Layer, Result } from "effect";
import { HttpApiClient } from "effect/http-api";

import { WebsiteApiConfig } from "./config.server";
import { WebsiteApi } from "./service";

// Native Alchemy bindings: the selected keys only, with protected values
// unwrapped by Alchemy's own reader. The binding object keeps its receiver.
export const WebsiteApiLive = Layer.effect(
  WebsiteApi,
  Effect.gen(function* () {
    const checked = yield* WebsiteApiConfig.pipe(Effect.result);
    const host = yield* Effect.fromResult(checked).pipe(
      Effect.map((config) => {
        // Alchemy's stock adapter supplies the AbortSignal but no redirect
        // policy. A synthetic Request defaults to follow, and native service
        // bindings follow with every header. Set standard RequestInit here;
        // delegate each method on the original native receiver.
        const binding: Pick<typeof config.binding, "connect" | "fetch"> = {
          connect: (...args) => config.binding.connect(...args),
          fetch: (request, init) =>
            config.binding.fetch(request, {
              ...init,
              redirect: "manual",
            }),
        };
        const reads = boundedReplies(
          toHttpClient(fromCloudflareFetcher(binding))
        );
        return {
          client: HttpApiClient.makeWith(TaxKitApi, {
            baseUrl: config.apiOrigin,
            httpClient: reads,
          }),
          reads,
          settings: config,
        };
      }),
      Effect.flatMap(({ reads, client, settings }) =>
        client.pipe(Effect.map((generated) => ({ generated, reads, settings })))
      ),
      Effect.result
    );
    return WebsiteApi.of({
      client: Result.map(host, ({ generated }) => generated),
      forward: Effect.fn("WebsiteApi.forward")((path: string) =>
        Effect.fromResult(host).pipe(
          Effect.flatMap(({ reads, settings }) =>
            reads.get(new URL(path, settings.apiOrigin)).pipe(
              Effect.flatMap((response) =>
                response.arrayBuffer.pipe(
                  Effect.map(
                    (body) =>
                      new Response(
                        response.status === 204 ||
                          response.status === 205 ||
                          response.status === 304
                          ? null
                          : body,
                        { headers: response.headers, status: response.status }
                      )
                  )
                )
              ),
              Effect.mapError(() => new ApiUnavailable())
            )
          ),
          Effect.scoped,
          Effect.timeoutOrElse({
            duration: apiReadTimeout,
            orElse: () => Effect.fail(new ApiDeadlineExceeded()),
          })
        )
      ),
    });
  })
);
