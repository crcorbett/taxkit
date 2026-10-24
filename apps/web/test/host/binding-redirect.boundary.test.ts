import { expect, it } from "@effect/vitest";
import { MetadataQuery } from "@taxkit/calculators/schemas";
import { Array, Effect, Layer, Option } from "effect";
import { vi } from "vitest";

import { WebsiteApiLive } from "../../src/lib/host/binding.adapter.layer";
import { WebsiteBindings } from "../../src/lib/host/config.ingress";
import { WebsiteApi } from "../../src/lib/host/service";

it.effect.each([301, 302, 303, 307, 308])(
  "returns native redirect %s without following it or losing its receiver/signal",
  (status) =>
    Effect.gen(function* () {
      const fetch = vi.fn((_request: Request, _init?: RequestInit) =>
        Promise.resolve(
          new Response(null, {
            headers: { location: "https://different-host.invalid/collect" },
            status,
          })
        )
      );
      const binding = {
        connect: vi.fn<(...args: readonly unknown[]) => void>(),
        fetch,
      };
      yield* Effect.gen(function* () {
        const api = yield* WebsiteApi;
        const client = yield* Effect.fromResult(api.client);
        expect(
          yield* client.calculatorApi
            .listCalculators({ query: MetadataQuery.make({}) })
            .pipe(Effect.isFailure)
        ).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.contexts).toEqual([binding]);
        const [request, init] = yield* Array.head(fetch.mock.calls).pipe(
          Effect.fromOption
        );
        const options = yield* Option.fromUndefinedOr(init).pipe(
          Effect.fromOption
        );
        expect(request.url).toContain("/api/v1/calculators");
        expect(options.redirect).toBe("manual");
        expect(options.signal).toBeInstanceOf(AbortSignal);
      }).pipe(
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.example.com",
                TAXKIT_API: binding,
              })
            )
          )
        ),
        Effect.scoped
      );
    })
);
