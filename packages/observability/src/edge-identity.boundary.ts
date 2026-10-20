import { Option, Schema } from "effect";
import { Headers } from "effect/http";

export const CalculatorHostMode = Schema.Literals(["edge", "local-emulator"]);
export type CalculatorHostMode = typeof CalculatorHostMode.Type;

// The Cloudflare hosts' own caller identity. Only direct edge requests supply
// it. Shared calculation packages never read Cloudflare headers. Same-zone Worker
// subrequests can alter x-real-ip; reject that path instead of trusting it.
// Website forwarding is authenticated separately before its original key is used.
// This package owns only the header trust policy. The consuming domain supplies
// its key Schema (for calculator admission, `CalculatorClientRateKey`), so the
// raw address is decoded once and never leaves this boundary undecoded.
export const edgeCallerKey = <Key>(
  headers: Headers.Headers,
  key: Schema.ConstraintDecoder<Key>
): Option.Option<Key> =>
  Option.isSome(Headers.get(headers, "cf-worker"))
    ? Option.none()
    : Headers.get(headers, "cf-connecting-ip").pipe(
        Option.flatMap(Schema.decodeUnknownOption(key))
      );

// Only the Website server's canonical calculation POST carries these fields.
// Native Headers already redacts x-api-key; hosts also redact the original IP.
export const WebsiteForwardingCredentialHeader = "x-api-key";
export const WebsiteForwardingRateKeyHeader = "x-taxkit-original-ip";
export const WebsiteForwardingCredential = Schema.RedactedFromValue(
  Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u)).pipe(
    Schema.brand("@taxkit/observability/WebsiteForwardingCredential")
  ),
  { disallowEncode: true, label: "WebsiteForwardingCredential" }
);
