import { Match, Option, Schema } from "effect";
import type { RpcClientError } from "effect/rpc";

import {
  DocsRpcInvalidResponse,
  DocsRpcResponseTooLarge,
  DocsRpcUnavailable,
} from "./content.errors.js";
import { RpcResponseBodyTooLarge } from "./response-budget.boundary.js";

const OversizedHttpReply = Schema.TaggedStruct("DecodeError", {
  cause: RpcResponseBodyTooLarge,
});

// Native HTTP causes are representation-level values. Read only the private
// byte-limit marker; never copy a request, response, header or body into errors.
export const docsRpcTransportFailure = (error: RpcClientError.RpcClientError) =>
  Match.value(error.reason).pipe(
    Match.tag("RpcClientDefect", () => new DocsRpcInvalidResponse()),
    Match.tag("HttpError", (reason) =>
      Schema.decodeUnknownOption(OversizedHttpReply)(reason.cause).pipe(
        Option.match({
          onNone: () =>
            Match.value(reason.kind).pipe(
              Match.whenOr(
                "DecodeError",
                "EmptyBodyError",
                () => new DocsRpcInvalidResponse()
              ),
              Match.orElse(() => new DocsRpcUnavailable())
            ),
          onSome: () => new DocsRpcResponseTooLarge(),
        })
      )
    ),
    Match.orElse(() => new DocsRpcUnavailable())
  );
