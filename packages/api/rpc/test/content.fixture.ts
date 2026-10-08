import { DocsPublicPagePath, DocsSearchTerm } from "@taxkit/content/schemas";
import { Effect, Result, Schema } from "effect";
import type { RpcClient, RpcClientError } from "effect/rpc";

import type { DocsRpcGroup } from "../src/content.group.js";
import type { DocsRpcClient } from "../src/content.service.js";

export const docsPath = Schema.decodeResult(DocsPublicPagePath)(
  "/start/overview"
).pipe(Result.getOrThrowWith(() => new Error("Invalid fixture page address")));
export const docsTerm = Schema.decodeResult(DocsSearchTerm)("Start").pipe(
  Result.getOrThrowWith(() => new Error("Invalid fixture search term"))
);
export const DocsRpcOperationCases = [
  {
    invoke: (client: DocsRpcClient["Service"]) =>
      client.getDiscovery("/sitemap.xml").pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof DocsRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client
        .GetDocsDiscovery({ path: "/sitemap.xml", version })
        .pipe(Effect.asVoid),
    operation: "getDiscovery",
  },
  {
    invoke: (client: DocsRpcClient["Service"]) =>
      client.getNavigation().pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof DocsRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) => client.GetDocsNavigation({ version }).pipe(Effect.asVoid),
    operation: "getNavigation",
  },
  {
    invoke: (client: DocsRpcClient["Service"]) =>
      client.getPage(docsPath).pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof DocsRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) => client.GetDocsPage({ path: docsPath, version }).pipe(Effect.asVoid),
    operation: "getPage",
  },
  {
    invoke: (client: DocsRpcClient["Service"]) =>
      client.getMarkdown(docsPath).pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof DocsRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client.GetDocsMarkdown({ path: docsPath, version }).pipe(Effect.asVoid),
    operation: "getMarkdown",
  },
  {
    invoke: (client: DocsRpcClient["Service"]) =>
      client.searchPages(docsTerm).pipe(Effect.asVoid),
    nativeInvoke: (
      client: RpcClient.FromGroup<
        typeof DocsRpcGroup,
        RpcClientError.RpcClientError
      >,
      version: string
    ) =>
      client.SearchDocsPages({ term: docsTerm, version }).pipe(Effect.asVoid),
    operation: "searchPages",
  },
];
