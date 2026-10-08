import { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
import { Option, Schema } from "effect";
import { Headers } from "effect/http";

export { CalculatorClientRateKey } from "@taxkit/calculators/admission.schemas";
export { CalculatorRequestRateKey } from "@taxkit/calculators/admission.service";

export const CalculatorHostMode = Schema.Literals(["edge", "local-emulator"]);
export type CalculatorHostMode = typeof CalculatorHostMode.Type;

// Only direct Cloudflare edge requests supply this identity. Same-zone Worker
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
