import {
  ByteSize,
  Duration,
  Effect,
  Option,
  Result,
  Schema,
  Stream,
} from "effect";
import {
  Headers,
  HttpClientRequest,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

export const CalculatorRequestBodyLimit = ByteSize.kibibytes(64);
export const CalculatorRequestBodyDeadline = Duration.seconds(5);
export class CalculatorRequestBodyRejected extends Schema.TaggedError<CalculatorRequestBodyRejected>()(
  "CalculatorRequestBodyRejected",
  { reason: Schema.Literals(["size", "deadline"]) }
) {}

// Native web-request readers do not use MaxBodySize in this selected version.
// Bound the native stream before materialising bytes, then reuse the native
// request conversion rather than replacing JSON parsing or RPC framing.
export const withCalculatorRequestBodyLimit = <E, R>(
  handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
) =>
  Effect.gen(function* () {
    const incoming = yield* HttpServerRequest.HttpServerRequest;
    if (incoming.method !== "POST") {
      return yield* handler;
    }
    const read = yield* incoming.stream.pipe(
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
    if (Result.isFailure(read)) {
      return HttpServerResponse.empty({
        status: read.failure.reason === "size" ? 413 : 408,
      });
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
