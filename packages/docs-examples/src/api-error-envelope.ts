import { Effect, Schema } from "effect";
import type { HttpClientResponse } from "effect/http/HttpClientResponse";
import { CalculatorApiErrorEnvelope } from "taxkit/http";

// A response from an HTTP request is untrusted until its owning Schema checks it.
export const readCalculatorError = (response: HttpClientResponse) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(CalculatorApiErrorEnvelope))
  );
