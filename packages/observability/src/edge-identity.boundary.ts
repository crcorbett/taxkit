import { Option, Schema } from "effect";
import { Headers } from "effect/http";

export const CalculatorHostMode = Schema.Literals(["edge", "local-emulator"]);
export type CalculatorHostMode = typeof CalculatorHostMode.Type;

// The Cloudflare hosts' own caller identity. Only direct edge requests supply
// it. Shared calculation packages never read Cloudflare headers. Same-zone Worker
// subrequests can alter x-real-ip; reject that path instead of trusting it.
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
