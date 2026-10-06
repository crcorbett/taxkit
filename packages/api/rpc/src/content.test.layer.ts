import { Effect, Layer } from "effect";
import { RpcTest } from "effect/rpc";

import { DocsRpcGroup } from "./content.group.js";
import { DocsRpcHandlersLive } from "./content.handlers.js";
import { DocsRpcVersion } from "./content.schemas.js";
import { DocsRpcClient } from "./content.service.js";

export const DocsRpcClientTest = Layer.effect(
  DocsRpcClient,
  RpcTest.makeClient(DocsRpcGroup).pipe(
    Effect.map((client) =>
      DocsRpcClient.of({
        getMarkdown: Effect.fn("DocsRpcClient.getMarkdown")((path) =>
          client.GetDocsMarkdown({ path, version: DocsRpcVersion })
        ),
        getNavigation: Effect.fn("DocsRpcClient.getNavigation")(() =>
          client.GetDocsNavigation({ version: DocsRpcVersion })
        ),
        getPage: Effect.fn("DocsRpcClient.getPage")((path) =>
          client.GetDocsPage({ path, version: DocsRpcVersion })
        ),
        searchPages: Effect.fn("DocsRpcClient.searchPages")((term) =>
          client.SearchDocsPages({ term, version: DocsRpcVersion })
        ),
      })
    )
  )
).pipe(Layer.provide(DocsRpcHandlersLive));
