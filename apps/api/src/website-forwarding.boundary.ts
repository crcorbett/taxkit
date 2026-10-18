import { timingSafeEqual } from "node:crypto";

import { CalculationPath } from "@taxkit/api-http/routes";
import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { CalculatorAdmissionUnavailable } from "@taxkit/calculators/schemas";
import {
  WebsiteForwardingCredential,
  WebsiteForwardingCredentialHeader,
  WebsiteForwardingRateKeyHeader,
} from "@taxkit/observability/edge-identity";
import {
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";
import { Headers } from "effect/http";
import type { HttpServerRequest } from "effect/http";

export class ApiWebsiteForwarding extends Context.Service<
  ApiWebsiteForwarding,
  {
    readonly authenticate: (
      request: HttpServerRequest.HttpServerRequest
    ) => Effect.Effect<
      Option.Option<CalculatorClientRateKey>,
      CalculatorAdmissionUnavailable
    >;
  }
>()("taxkit/api/ApiWebsiteForwarding") {}

export const ApiWebsiteForwardingLive = Layer.succeed(
  ApiWebsiteForwarding,
  ApiWebsiteForwarding.of({
    authenticate: Effect.fn("ApiWebsiteForwarding.authenticate")((request) =>
      Effect.gen(function* () {
        if (
          request.method !== "POST" ||
          !Schema.is(CalculationPath)(
            new URL(request.url, "https://api.invalid").pathname
          )
        ) {
          return Option.none();
        }
        const presented = Headers.get(
          request.headers,
          WebsiteForwardingCredentialHeader
        );
        const original = Headers.get(
          request.headers,
          WebsiteForwardingRateKeyHeader
        );
        if (Option.isNone(presented) && Option.isNone(original)) {
          // Ordinary public HTTP still acquires its direct edge identity.
          return Option.none();
        }
        // Partial, duplicated/comma-joined or malformed metadata fails closed;
        // it never falls back to a different public caller's allowance.
        const supplied = yield* presented.pipe(
          Option.flatMap(
            Schema.decodeUnknownOption(WebsiteForwardingCredential)
          ),
          Option.match({
            onNone: () => Effect.fail(new CalculatorAdmissionUnavailable()),
            onSome: Effect.succeed,
          })
        );
        // Request-time Config uses the native execution provider. Never
        // retain a request-owned fibre/context through an in-flight memo.
        const expected = yield* Config.schema(
          WebsiteForwardingCredential,
          "TAXKIT_WEBSITE_FORWARDING_KEY"
        ).pipe(Effect.mapError(() => new CalculatorAdmissionUnavailable()));
        const previous = yield* Config.option(
          Config.schema(
            WebsiteForwardingCredential,
            "TAXKIT_WEBSITE_FORWARDING_PREVIOUS_KEY"
          )
        ).pipe(Effect.mapError(() => new CalculatorAdmissionUnavailable()));
        // Effect Crypto exposes no constant-time equality operation. This is
        // the platform primitive, enabled by the hosts' nodejs_compat policy;
        // both owning Schema values encode to exactly 64 ASCII bytes.
        const valid = yield* Effect.sync(() => {
          const presentedBytes = new TextEncoder().encode(
            Redacted.value(supplied)
          );
          const currentMatches = timingSafeEqual(
            new TextEncoder().encode(Redacted.value(expected)),
            presentedBytes
          );
          // Compare both configured keys before combining their results.
          const previousMatches = Option.match(previous, {
            onNone: () => false,
            onSome: (key) =>
              timingSafeEqual(
                new TextEncoder().encode(Redacted.value(key)),
                presentedBytes
              ),
          });
          return currentMatches || previousMatches;
        });
        if (!valid) {
          return yield* new CalculatorAdmissionUnavailable();
        }
        const key = yield* original.pipe(
          Option.flatMap(Schema.decodeUnknownOption(CalculatorClientRateKey)),
          Option.match({
            onNone: () => Effect.fail(new CalculatorAdmissionUnavailable()),
            onSome: Effect.succeed,
          })
        );
        return Option.some(key);
      })
    ),
  })
);
