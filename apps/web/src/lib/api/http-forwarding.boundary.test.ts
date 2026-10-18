import { expect, it } from "@effect/vitest";
import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { CalculationRequest } from "@taxkit/api-rpc/testing/fixtures";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";
import { CalculationQuery, MetadataQuery } from "@taxkit/calculators/schemas";
import {
  WebsiteForwardingCredentialHeader,
  WebsiteForwardingRateKeyHeader,
} from "@taxkit/observability/edge-identity";
import { Array, Effect, Layer, Option, Result, Schema } from "effect";
import { HttpServerRequest } from "effect/http";
import { vi } from "vitest";

import { WebsiteBindings } from "../config.server";
import { WebsiteApi } from "../host.service";
import { WebsiteApiLive } from "./host.server";

const credential = "a".repeat(64);

it.effect.each([
  { collection: "allow", dnt: "0", expected: "allow" },
  { collection: "allow", dnt: "1", expected: "deny" },
  { collection: "deny", dnt: "0", expected: "deny" },
])(
  "composes generated native HTTP admission and collection headers ($expected)",
  ({ collection, dnt, expected }) =>
    Effect.gen(function* () {
      // This Promise signature is the platform Fetcher fixture, not a second
      // runtime or an application transport implementation.
      const fetch = vi.fn((_request: Request) =>
        Promise.resolve(new Response(null, { status: 503 }))
      );
      const key = yield* Schema.decodeUnknownEffect(CalculatorClientRateKey)(
        "2001:0db8:0:0::1"
      );
      yield* Effect.gen(function* () {
        const api = yield* WebsiteApi;
        const client = yield* Effect.fromResult(api.client);
        yield* client.calculatorApi
          .calculate({
            params: { calculatorId: CalculationRequest.calculatorId },
            payload: CalculationRequest.payload,
            query: CalculationQuery.make({}),
          })
          .pipe(Effect.result);
        expect(fetch).toHaveBeenCalledTimes(1);
        const request = yield* Array.head(fetch.mock.calls).pipe(
          Option.flatMap(Array.head),
          Effect.fromOption
        );
        expect(request.method).toBe("POST");
        expect(request.headers.get(WebsiteForwardingCredentialHeader)).toBe(
          credential
        );
        expect(request.headers.get(WebsiteForwardingRateKeyHeader)).toBe(
          "2001:db8::1"
        );
        expect(request.headers.get(CollectionPolicyHeader)).toBe(expected);
        const body = yield* Effect.promise(() => request.text());
        expect(body).not.toContain(credential);
        expect(body).not.toContain("2001:db8::1");
      }).pipe(
        Effect.provideService(CalculatorRequestRateKey, Option.some(key)),
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request(
              "https://website.example.com/calculators/au/pay/take-home",
              {
                headers: {
                  [CollectionPolicyHeader]: collection,
                  dnt,
                  [WebsiteForwardingCredentialHeader]: "forged",
                  [WebsiteForwardingRateKeyHeader]: "203.0.113.99",
                },
                method: "POST",
              }
            )
          )
        ),
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.example.com",
                TAXKIT_API: { connect: vi.fn(), fetch },
                TAXKIT_WEBSITE_FORWARDING_KEY: credential,
              })
            )
          )
        ),
        Effect.scoped
      );
    })
);

it.effect(
  "keeps generated metadata reads credential-free without private config or caller identity",
  () =>
    Effect.gen(function* () {
      const fetch = vi.fn((_request: Request) =>
        Promise.resolve(new Response(null, { status: 503 }))
      );
      yield* Effect.gen(function* () {
        const api = yield* WebsiteApi;
        const client = yield* Effect.fromResult(api.client);
        yield* client.calculatorApi
          .listCalculators({ query: MetadataQuery.make({}) })
          .pipe(Effect.result);
        expect(fetch).toHaveBeenCalledTimes(1);
        const request = yield* Array.head(fetch.mock.calls).pipe(
          Option.flatMap(Array.head),
          Effect.fromOption
        );
        expect(request.method).toBe("GET");
        expect(request.headers.has(WebsiteForwardingCredentialHeader)).toBe(
          false
        );
        expect(request.headers.has(WebsiteForwardingRateKeyHeader)).toBe(false);
        expect(request.headers.get(CollectionPolicyHeader)).toBe("deny");
      }).pipe(
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.example.com",
                TAXKIT_API: { connect: vi.fn(), fetch },
              })
            )
          )
        ),
        Effect.scoped
      );
    })
);

it.effect(
  "fails closed before native forwarding when the original identity is missing",
  () =>
    Effect.gen(function* () {
      const fetch = vi.fn((_request: Request) =>
        Promise.resolve(new Response(null, { status: 503 }))
      );
      yield* Effect.gen(function* () {
        const api = yield* WebsiteApi;
        const client = yield* Effect.fromResult(api.client);
        const failed = yield* client.calculatorApi
          .calculate({
            params: { calculatorId: CalculationRequest.calculatorId },
            payload: CalculationRequest.payload,
            query: CalculationQuery.make({}),
          })
          .pipe(Effect.isFailure);
        expect(failed).toBe(true);
        expect(fetch).not.toHaveBeenCalled();
      }).pipe(
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.example.com",
                TAXKIT_API: { connect: vi.fn(), fetch },
                TAXKIT_WEBSITE_FORWARDING_KEY: credential,
              })
            )
          )
        ),
        Effect.scoped
      );
    })
);

it.effect.each([
  { allowed: true, mode: "local-emulator", origin: "http://127.0.0.1:4214" },
  { allowed: true, mode: "local-emulator", origin: "http://localhost:4214" },
  { allowed: false, mode: "edge", origin: "http://127.0.0.1:4214" },
  { allowed: false, mode: "local-emulator", origin: "https://api.example.com" },
  { allowed: false, mode: "local-emulator", origin: "http://api.example.com" },
])(
  "limits the Website local identity fallback to explicit loopback emulator mode ($allowed)",
  ({ allowed, mode, origin }) =>
    Effect.gen(function* () {
      const fetch = vi.fn((_request: Request) =>
        Promise.resolve(new Response(null, { status: 503 }))
      );
      yield* Effect.gen(function* () {
        const api = yield* WebsiteApi;
        if (Result.isFailure(api.client)) {
          // The owning origin Schema also refuses insecure non-loopback hosts.
          expect(allowed).toBe(false);
          expect(fetch).not.toHaveBeenCalled();
          return;
        }
        const client = yield* Effect.fromResult(api.client);
        yield* client.calculatorApi
          .calculate({
            params: { calculatorId: CalculationRequest.calculatorId },
            payload: CalculationRequest.payload,
            query: CalculationQuery.make({}),
          })
          .pipe(Effect.result);
        expect(fetch).toHaveBeenCalledTimes(allowed ? 1 : 0);
        if (allowed) {
          const request = yield* Array.head(fetch.mock.calls).pipe(
            Option.flatMap(Array.head),
            Effect.fromOption
          );
          expect(request.headers.get(WebsiteForwardingCredentialHeader)).toBe(
            credential
          );
          expect(request.headers.get(WebsiteForwardingRateKeyHeader)).toBe(
            "127.0.0.1"
          );
        }
      }).pipe(
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: origin,
                CALCULATOR_HOST_MODE: mode,
                TAXKIT_API: { connect: vi.fn(), fetch },
                TAXKIT_WEBSITE_FORWARDING_KEY: credential,
              })
            )
          )
        ),
        Effect.scoped
      );
    })
);

it.effect.each([301, 302, 303, 307, 308])(
  "returns native redirect %s without replaying private headers or losing its receiver/signal",
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
      const binding = { connect: vi.fn(), fetch };
      const key = yield* Schema.decodeUnknownEffect(CalculatorClientRateKey)(
        "203.0.113.19"
      );
      yield* Effect.gen(function* () {
        const api = yield* WebsiteApi;
        const client = yield* Effect.fromResult(api.client);
        expect(
          yield* client.calculatorApi
            .calculate({
              params: { calculatorId: CalculationRequest.calculatorId },
              payload: CalculationRequest.payload,
              query: CalculationQuery.make({}),
            })
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
        expect(request.url).toContain(
          "/api/v1/calculators/au.pay.take-home/calculate"
        );
        expect(request.headers.get(WebsiteForwardingCredentialHeader)).toBe(
          credential
        );
        expect(options.redirect).toBe("manual");
        expect(options.signal).toBeInstanceOf(AbortSignal);
      }).pipe(
        Effect.provideService(CalculatorRequestRateKey, Option.some(key)),
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.example.com",
                TAXKIT_API: binding,
                TAXKIT_WEBSITE_FORWARDING_KEY: credential,
              })
            )
          )
        ),
        Effect.scoped
      );
    })
);
