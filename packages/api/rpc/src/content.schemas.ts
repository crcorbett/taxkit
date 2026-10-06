import {
  DocsDiscoveryPath,
  DocsPublicPagePath,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { Duration, Schema, SchemaGetter } from "effect";

export const DocsRpcVersion = "2";
export const DocsRpcDeadline = Duration.seconds(10);
export const DocsNavigationRpcPayload = Schema.Struct({
  version: Schema.String.check(Schema.isMaxLength(32)),
});
export const DocsPageRpcPayload = Schema.Struct({
  path: DocsPublicPagePath,
  ...DocsNavigationRpcPayload.fields,
});
export const DocsSearchRpcPayload = Schema.Struct({
  term: DocsSearchTerm,
  ...DocsNavigationRpcPayload.fields,
});
export const DocsDiscoveryRpcPayload = Schema.Struct({
  path: DocsDiscoveryPath,
  ...DocsNavigationRpcPayload.fields,
});
export const DocsRpcSafeDefect = Schema.Unknown.pipe(
  Schema.encodeTo(Schema.Literal("Documentation service failed"), {
    decode: SchemaGetter.transform((value: string) => value),
    encode: SchemaGetter.transform(
      () => "Documentation service failed" as const
    ),
  })
);
