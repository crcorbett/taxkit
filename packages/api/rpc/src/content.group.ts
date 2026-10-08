import {
  DocsDiscoveryDocument,
  DocsPublicNavigation,
  DocsPublicPage,
  DocsSearchResult,
} from "@taxkit/content/schemas";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import { DocsRpcExpectedError } from "./content.errors.js";
import {
  DocsDiscoveryRpcPayload,
  DocsNavigationRpcPayload,
  DocsPageRpcPayload,
  DocsSearchRpcPayload,
  DocsRpcSafeDefect,
} from "./content.schemas.js";

export class GetDocsNavigation extends Rpc.make("GetDocsNavigation", {
  defect: DocsRpcSafeDefect,
  error: DocsRpcExpectedError,
  payload: DocsNavigationRpcPayload,
  success: DocsPublicNavigation,
}) {}
export class GetDocsPage extends Rpc.make("GetDocsPage", {
  defect: DocsRpcSafeDefect,
  error: DocsRpcExpectedError,
  payload: DocsPageRpcPayload,
  success: DocsPublicPage,
}) {}
export class SearchDocsPages extends Rpc.make("SearchDocsPages", {
  defect: DocsRpcSafeDefect,
  error: DocsRpcExpectedError,
  payload: DocsSearchRpcPayload,
  success: Schema.Array(DocsSearchResult),
}) {}
export class GetDocsMarkdown extends Rpc.make("GetDocsMarkdown", {
  defect: DocsRpcSafeDefect,
  error: DocsRpcExpectedError,
  payload: DocsPageRpcPayload,
  success: Schema.String,
}) {}

export class GetDocsDiscovery extends Rpc.make("GetDocsDiscovery", {
  defect: DocsRpcSafeDefect,
  error: DocsRpcExpectedError,
  payload: DocsDiscoveryRpcPayload,
  success: DocsDiscoveryDocument,
}) {}

export const DocsRpcGroup = RpcGroup.make(
  GetDocsNavigation,
  GetDocsPage,
  SearchDocsPages,
  GetDocsMarkdown,
  GetDocsDiscovery
);
