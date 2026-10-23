import { expect, it } from "@effect/vitest";
import { CalculatorAdmissionUnavailable } from "@taxkit/calculators/schemas";
import {
  WebsiteForwardingCredentialHeader,
  WebsiteForwardingRateKeyHeader,
} from "@taxkit/observability/edge-identity";
import { ConfigProvider, Effect, Option, Redacted, Result } from "effect";
import { HttpServerRequest } from "effect/http";
import { NetAddress } from "effect/net";

import {
  ApiWebsiteForwarding,
  ApiWebsiteForwardingLive,
} from "../src/website-forwarding.boundary.js";

const credential = "a".repeat(64);
const path = "/api/v1/calculators/au.pay.take-home/calculate";

it.effect.each([
  {
    accepted: true,
    headers: {
      [WebsiteForwardingCredentialHeader]: credential,
      [WebsiteForwardingRateKeyHeader]: "2001:0db8:0:0::1",
    },
  },
  {
    accepted: false,
    headers: { [WebsiteForwardingRateKeyHeader]: "203.0.113.9" },
  },
  {
    accepted: false,
    headers: { [WebsiteForwardingCredentialHeader]: credential },
  },
  {
    accepted: false,
    headers: {
      [WebsiteForwardingCredentialHeader]: "b".repeat(64),
      [WebsiteForwardingRateKeyHeader]: "203.0.113.9",
    },
  },
  {
    accepted: false,
    headers: {
      [WebsiteForwardingCredentialHeader]: "short",
      [WebsiteForwardingRateKeyHeader]: "203.0.113.9",
    },
  },
  {
    accepted: false,
    headers: {
      [WebsiteForwardingCredentialHeader]: credential,
      [WebsiteForwardingRateKeyHeader]: "invalid",
    },
  },
  {
    accepted: false,
    headers: {
      [WebsiteForwardingCredentialHeader]: credential,
      [WebsiteForwardingRateKeyHeader]: "203.0.113.9, 203.0.113.8",
    },
  },
  {
    accepted: false,
    headers: {
      [WebsiteForwardingCredentialHeader]: `${credential}, ${credential}`,
      [WebsiteForwardingRateKeyHeader]: "203.0.113.9",
    },
  },
])(
  "authenticates complete canonical Website metadata ($accepted)",
  ({ accepted, headers }) =>
    Effect.gen(function* () {
      const forwarding = yield* ApiWebsiteForwarding;
      const result = yield* forwarding
        .authenticate(
          HttpServerRequest.fromWeb(
            new Request(`https://api.example.com${path}`, {
              headers,
              method: "POST",
            })
          )
        )
        .pipe(Effect.result);
      if (accepted) {
        const key = yield* Effect.fromResult(result).pipe(
          Effect.flatMap(Effect.fromOption)
        );
        expect(NetAddress.formatIp(Redacted.value(key))).toBe("2001:db8::1");
      } else {
        expect(result).toEqual(
          Result.fail(new CalculatorAdmissionUnavailable())
        );
      }
    }).pipe(
      Effect.provide(ApiWebsiteForwardingLive),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            TAXKIT_WEBSITE_FORWARDING_KEY: credential,
          })
        )
      )
    )
);

it.effect.each([
  { method: "GET", route: path },
  { method: "HEAD", route: path },
  { method: "POST", route: "/mcp" },
  { method: "POST", route: "/api/v1/calculators/unknown/calculate" },
  { method: "GET", route: "/api/v1/calculators" },
])("never trusts forwarding on $method $route", ({ method, route }) =>
  Effect.gen(function* () {
    const forwarding = yield* ApiWebsiteForwarding;
    const result = yield* forwarding.authenticate(
      HttpServerRequest.fromWeb(
        new Request(`https://api.example.com${route}`, {
          headers: {
            [WebsiteForwardingCredentialHeader]: credential,
            [WebsiteForwardingRateKeyHeader]: "203.0.113.9",
          },
          method,
        })
      )
    );
    expect(result).toEqual(Option.none());
  }).pipe(
    Effect.provide(ApiWebsiteForwardingLive),
    // No key is available. Host construction and unrelated requests still work.
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({})))
  )
);

it.effect(
  "requires the runtime key only for forwarded calculation admission",
  () =>
    Effect.gen(function* () {
      const forwarding = yield* ApiWebsiteForwarding;
      const direct = yield* forwarding.authenticate(
        HttpServerRequest.fromWeb(
          new Request(`https://api.example.com${path}`, { method: "POST" })
        )
      );
      expect(direct).toEqual(Option.none());
      const missing = yield* forwarding
        .authenticate(
          HttpServerRequest.fromWeb(
            new Request(`https://api.example.com${path}`, {
              headers: {
                [WebsiteForwardingCredentialHeader]: credential,
                [WebsiteForwardingRateKeyHeader]: "203.0.113.9",
              },
              method: "POST",
            })
          )
        )
        .pipe(Effect.result);
      expect(missing).toEqual(
        Result.fail(new CalculatorAdmissionUnavailable())
      );
    }).pipe(
      Effect.provide(ApiWebsiteForwardingLive),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({})))
    )
);

it.effect.each([
  { accepted: true, presented: credential, previous: "b".repeat(64) },
  { accepted: true, presented: "b".repeat(64), previous: "b".repeat(64) },
  { accepted: false, presented: "c".repeat(64), previous: "b".repeat(64) },
  { accepted: false, presented: credential, previous: "malformed" },
])(
  "permits only the checked current or explicitly bound previous key ($accepted)",
  ({ accepted, presented, previous }) =>
    Effect.gen(function* () {
      const forwarding = yield* ApiWebsiteForwarding;
      const result = yield* forwarding
        .authenticate(
          HttpServerRequest.fromWeb(
            new Request(`https://api.example.com${path}`, {
              headers: {
                [WebsiteForwardingCredentialHeader]: presented,
                [WebsiteForwardingRateKeyHeader]: "203.0.113.9",
              },
              method: "POST",
            })
          )
        )
        .pipe(Effect.result);
      if (accepted) {
        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(Option.isSome(result.success)).toBe(true);
        }
      } else {
        expect(result).toEqual(
          Result.fail(new CalculatorAdmissionUnavailable())
        );
      }
    }).pipe(
      Effect.provide(ApiWebsiteForwardingLive),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            TAXKIT_WEBSITE_FORWARDING_KEY: credential,
            TAXKIT_WEBSITE_FORWARDING_PREVIOUS_KEY: previous,
          })
        )
      )
    )
);
