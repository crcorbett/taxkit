import {
  Clock,
  ByteSize,
  Duration,
  Effect,
  Option,
  Result,
  Stream,
} from "effect";
import {
  Headers,
  HttpClientRequest,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import {
  CalculatorRequestBodyRejected,
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyPolicy,
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "./schemas.js";

export {
  CalculatorRequestBodyRejected,
  CalculatorRequestBodyErrorEnvelope,
  CalculatorRequestBodyPolicy,
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "./schemas.js";

export const CalculatorRequestBodyLimit = ByteSize.kibibytes(64);
export const CalculatorRequestBodyDeadline = Duration.seconds(5);

// Native web-request readers do not use MaxBodySize in this selected version.
// Bound the native stream before materialising bytes, then reuse the native
// request conversion rather than replacing JSON parsing or RPC framing.
export const withCalculatorRequestBodyLimit = <E, R>(
  handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>,
  policy: CalculatorRequestBodyPolicy = CalculatorRequestBodyPolicy.make({
    responseFormat: "json",
  })
) =>
  Effect.gen(function* () {
    const incoming = yield* HttpServerRequest.HttpServerRequest;
    if (incoming.method !== "POST") {
      return yield* handler;
    }
    const started = yield* Clock.monotonicTimeNanos;
    const readResult = yield* incoming.stream.pipe(
      Stream.mapAccumEffect(
        () => ByteSize.bytes(0),
        (total, chunk) => {
          const next = ByteSize.sum(total, ByteSize.bytes(chunk.byteLength));
          return ByteSize.isGreaterThan(next, CalculatorRequestBodyLimit)
            ? Effect.fail(new CalculatorRequestBodyRejected({ reason: "size" }))
            : Effect.succeed([next, [chunk]] as const);
        }
      ),
      Stream.mkUint8Array,
      Effect.timeoutOrElse({
        duration: CalculatorRequestBodyDeadline,
        orElse: () =>
          Effect.fail(
            new CalculatorRequestBodyRejected({ reason: "deadline" })
          ),
      }),
      Effect.map(Result.succeed),
      Effect.catchTag("CalculatorRequestBodyRejected", (error) =>
        Effect.succeed(Result.fail(error))
      )
    );
    const finished = yield* Clock.monotonicTimeNanos;
    // Reject late synchronous reads once JavaScript returns control as well.
    const read =
      Result.isSuccess(readResult) &&
      Duration.isGreaterThanOrEqualTo(
        Duration.nanos(finished - started),
        CalculatorRequestBodyDeadline
      )
        ? Result.fail(new CalculatorRequestBodyRejected({ reason: "deadline" }))
        : readResult;
    if (Result.isFailure(read)) {
      const error =
        read.failure.reason === "size"
          ? new CalculatorRequestBodyTooLarge()
          : new CalculatorRequestBodyTimedOut();
      const status = read.failure.reason === "size" ? 413 : 408;
      if (policy.responseFormat === "html") {
        // Only fixed Schema-owned messages enter this page; never reflect input,
        // request URLs, headers or private diagnostics into a rejected request.
        return yield* HttpServerResponse.html`<!doctype html>
          <html lang="en-AU"><head><meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Request could not be read | TaxKit</title></head>
          <body><main><h1>Request could not be read</h1><p>${error.message}</p>
          <a href="/">Return to the calculators</a></main></body></html>`.pipe(
          Effect.map((response) =>
            HttpServerResponse.setStatus(response, status)
          )
        );
      }
      return yield* HttpServerResponse.schemaJson(
        CalculatorRequestBodyErrorEnvelope
      )({ error }, { status }).pipe(Effect.orDie);
    }
    const bytes = read.success;
    const bounded = HttpServerRequest.toClientRequest(incoming)
      .pipe(
        HttpClientRequest.bodyUint8Array(
          bytes,
          Headers.get(incoming.headers, "content-type").pipe(
            Option.getOrUndefined
          )
        ),
        HttpServerRequest.fromClientRequest
      )
      .modify({ remoteAddress: incoming.remoteAddress, url: incoming.url });
    return yield* handler.pipe(
      Effect.provideService(HttpServerRequest.HttpServerRequest, bounded)
    );
  });
