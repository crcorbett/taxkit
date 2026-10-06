import type { DocsPagePath, DocsSearchTerm } from "@taxkit/content/schemas";
import { Array, Effect, Layer, Schema } from "effect";
import type { Scope } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { Rpc, RpcClient, RpcSerialization } from "effect/rpc";
import type { RpcClientError } from "effect/rpc";

import { docsRpcTransportFailure } from "./content-client-response.boundary.js";
import {
  DocsRpcDeadlineExceeded,
  DocsRpcInvalidResponse,
} from "./content.errors.js";
import type { DocsRpcExpectedError } from "./content.errors.js";
import { DocsRpcGroup } from "./content.group.js";
import { DocsRpcDeadline, DocsRpcVersion } from "./content.schemas.js";
import { DocsRpcClient } from "./content.service.js";
import { boundedRpcHttpClient } from "./response-budget.boundary.js";
import type { CalculatorRpcOrigin } from "./schemas.js";

class DocsReplyDecodeDefect extends Schema.TaggedError<DocsReplyDecodeDefect>()(
  "DocsReplyDecodeDefect",
  {}
) {}

const replySerialization = Layer.succeed(
  RpcSerialization.RpcSerialization,
  RpcSerialization.RpcSerialization.of({
    ...RpcSerialization.json,
    codecFor: <S extends Schema.Top>(schema: S) => {
      const codec = RpcSerialization.json.codecFor(schema);
      return Array.some(
        Array.fromIterable(DocsRpcGroup.requests.values()),
        (procedure) => schema.ast === Rpc.exitSchema(procedure).ast
      )
        ? codec.pipe(
            Schema.catchDecoding<typeof codec>(() =>
              Effect.die(new DocsReplyDecodeDefect())
            )
          )
        : codec;
    },
  })
);

// Four concrete documentation calls share lifetime and failure policy. This
// accepts a native Effect, never an open-ended raw-client callback.
const checkedDocsRpcOperation = <A>(
  operation: Effect.Effect<
    A,
    typeof DocsRpcExpectedError.Type | RpcClientError.RpcClientError,
    Scope.Scope | RpcClient.Protocol
  >,
  protocol: RpcClient.Protocol["Service"]
) =>
  operation.pipe(
    Effect.scoped,
    Effect.provideService(RpcClient.Protocol, protocol),
    Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
    Effect.provideService(FetchHttpClient.RequestInit, {
      credentials: "omit",
      redirect: "error",
    }),
    Effect.timeoutOrElse({
      duration: DocsRpcDeadline,
      orElse: () => Effect.fail(new DocsRpcDeadlineExceeded()),
    }),
    Effect.catchTag("RpcClientError", (error) =>
      Effect.fail(docsRpcTransportFailure(error))
    ),
    Effect.catchDefect((defect) =>
      Schema.is(DocsReplyDecodeDefect)(defect)
        ? Effect.fail(new DocsRpcInvalidResponse())
        : Effect.die(defect)
    )
  );

export const DocsRpcClientLive = (origin: CalculatorRpcOrigin) =>
  Layer.effect(
    DocsRpcClient,
    Effect.gen(function* () {
      const protocol = yield* RpcClient.Protocol;
      return DocsRpcClient.of({
        getMarkdown: Effect.fn("DocsRpcClient.getMarkdown")(
          (path: DocsPagePath) =>
            checkedDocsRpcOperation(
              RpcClient.make(DocsRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.GetDocsMarkdown({ path, version: DocsRpcVersion })
                )
              ),
              protocol
            )
        ),
        getNavigation: Effect.fn("DocsRpcClient.getNavigation")(() =>
          checkedDocsRpcOperation(
            RpcClient.make(DocsRpcGroup, { disableTracing: true }).pipe(
              Effect.flatMap((client) =>
                client.GetDocsNavigation({ version: DocsRpcVersion })
              )
            ),
            protocol
          )
        ),
        getPage: Effect.fn("DocsRpcClient.getPage")((path: DocsPagePath) =>
          checkedDocsRpcOperation(
            RpcClient.make(DocsRpcGroup, { disableTracing: true }).pipe(
              Effect.flatMap((client) =>
                client.GetDocsPage({ path, version: DocsRpcVersion })
              )
            ),
            protocol
          )
        ),
        searchPages: Effect.fn("DocsRpcClient.searchPages")(
          (term: DocsSearchTerm) =>
            checkedDocsRpcOperation(
              RpcClient.make(DocsRpcGroup, { disableTracing: true }).pipe(
                Effect.flatMap((client) =>
                  client.SearchDocsPages({ term, version: DocsRpcVersion })
                )
              ),
              protocol
            )
        ),
      });
    })
  ).pipe(
    Layer.provide(
      Layer.effect(
        RpcClient.Protocol,
        HttpClient.HttpClient.pipe(
          Effect.map((client) =>
            client.pipe(
              HttpClient.mapRequest(
                HttpClientRequest.setUrl(new URL("/rpc", origin).href)
              ),
              boundedRpcHttpClient
            )
          ),
          Effect.flatMap(RpcClient.makeProtocolHttp)
        )
      )
    ),
    Layer.provide(replySerialization)
  );
