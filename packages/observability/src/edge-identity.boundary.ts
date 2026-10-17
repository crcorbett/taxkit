import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { Option, Schema } from "effect";
import { Headers } from "effect/http";

export const CalculatorHostMode = Schema.Literals(["edge", "local-emulator"]);
export type CalculatorHostMode = typeof CalculatorHostMode.Type;

// The Cloudflare hosts' own caller identity. Only direct edge requests supply
// it. Shared calculation packages never read Cloudflare headers. Same-zone Worker
// subrequests can alter x-real-ip; reject that path instead of trusting it.
// Website forwarding uses the separate private binding method, never a header.
export const calculatorEdgeRateKey = (
  headers: Headers.Headers
): Option.Option<typeof CalculatorClientRateKey.Type> =>
  Option.isSome(Headers.get(headers, "cf-worker"))
    ? Option.none()
    : Headers.get(headers, "cf-connecting-ip").pipe(
        Option.flatMap(Schema.decodeUnknownOption(CalculatorClientRateKey))
      );
