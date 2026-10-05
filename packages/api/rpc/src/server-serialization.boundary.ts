import {
  Array,
  ByteSize,
  Effect,
  Layer,
  Match,
  Option,
  Result,
  Schema,
} from "effect";
import { RpcSerialization } from "effect/rpc";

import { TaxKitRpcGroup } from "./group.js";
import { CalculatorRequestBodyLimit } from "./request-boundary.js";

// Validate the native JSON parser's unknown envelopes before the native server
// can reflect an unchecked procedure tag or request identity. This is ingress
// validation, not a replacement message encoder or framing implementation.
const RequestIdentity = Schema.Union([
  Schema.String.check(Schema.isPattern(/^\d{1,20}$/u)),
  Schema.Int.check(
    Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 0 })
  ),
]);
const RequestEnvelope = Schema.TaggedStruct("Request", {
  headers: Schema.Array(
    Schema.Tuple([
      Schema.String.check(Schema.isMaxLength(128)),
      Schema.String.check(Schema.isMaxLength(4096)),
    ])
  ).check(Schema.isMaxLength(32)),
  id: RequestIdentity,
  payload: Schema.Unknown,
  tag: Schema.Literals(
    Array.map(
      Array.fromIterable(TaxKitRpcGroup.requests.values()),
      (procedure) => procedure._tag
    )
  ),
});
const RequestBytes = Schema.Union([Schema.String, Schema.Uint8Array]).check(
  Schema.makeFilter((bytes) =>
    ByteSize.isLessThanOrEqualTo(
      ByteSize.bytes(
        Match.value(bytes).pipe(
          Match.when(
            Match.string,
            (text) => new TextEncoder().encode(text).byteLength
          ),
          Match.orElse((buffer) => buffer.byteLength)
        )
      ),
      CalculatorRequestBodyLimit
    )
  )
);
const RequestBatch = Schema.Array(RequestEnvelope).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(16)
);

class RpcEnvelopeRejected extends Schema.TaggedError<RpcEnvelopeRejected>()(
  "RpcEnvelopeRejected",
  {}
) {}

export const TaxKitRpcServerSerialization = Layer.succeed(
  RpcSerialization.RpcSerialization,
  RpcSerialization.RpcSerialization.of({
    ...RpcSerialization.json,
    codecFor: <S extends Schema.Top>(schema: S) => {
      const codec = RpcSerialization.json.codecFor(schema);
      return schema.ast === Schema.Defect().ast
        ? codec.pipe(
            Schema.middlewareEncoding<typeof codec, S["EncodingServices"]>(() =>
              Effect.succeed(Option.some("Calculation service failed"))
            )
          )
        : codec;
    },
    makeUnsafe: () => {
      const parser = RpcSerialization.json.makeUnsafe();
      return {
        decode: (bytes) => {
          const input = Schema.decodeResult(RequestBytes)(bytes).pipe(
            Result.getOrThrowWith(() => new RpcEnvelopeRejected())
          );
          return Schema.decodeUnknownResult(RequestBatch, {
            onExcessProperty: "error",
          })(parser.decode(input)).pipe(
            Result.getOrThrowWith(() => new RpcEnvelopeRejected())
          );
        },
        encode: parser.encode,
      };
    },
  })
);
