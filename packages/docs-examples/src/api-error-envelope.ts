import { CalculatorApiErrorEnvelope } from "@taxkit/sdk/http";
import { Effect, Schema } from "effect";
import type { HttpClientResponse } from "effect/http/HttpClientResponse";

// A response from an HTTP request is untrusted until its owning Schema checks it.
export const readCalculatorError = (response: HttpClientResponse) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(CalculatorApiErrorEnvelope))
  );
