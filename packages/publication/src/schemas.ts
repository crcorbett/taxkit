import { DiscoveryPath, discoveryPaths } from "@taxkit/api-http/routes";
import {
  DocsPublicationOrigin,
  PublicHttpOrigin,
} from "@taxkit/content/schemas";
import { Schema } from "effect";

export const DocsDiscoverySettings = Schema.Struct({
  apiOrigin: PublicHttpOrigin,
  publicationOrigin: DocsPublicationOrigin,
});
export type DocsDiscoverySettings = typeof DocsDiscoverySettings.Type;
export { DiscoveryPath as DocsDiscoveryPath } from "@taxkit/api-http/routes";
// Even six-byte JSON escaping of every character fits the existing 2 MiB RPC
// response budget, including its small fixed framing and metadata.
export const DocsDiscoveryBody = Schema.String.check(
  Schema.isMaxLength(300_000)
).pipe(Schema.brand("taxkit/DocsDiscoveryBody"));
export const DocsDiscoveryDocument = Schema.Struct({
  body: DocsDiscoveryBody,
  contentType: Schema.Literals(["application/xml", "text/plain"]),
  path: DiscoveryPath,
}).check(
  Schema.makeFilter(
    (document) =>
      document.contentType ===
      (document.path === discoveryPaths.sitemap
        ? "application/xml"
        : "text/plain"),
    { message: "The discovery address and media type must agree." }
  )
);
export type DocsDiscoveryDocument = typeof DocsDiscoveryDocument.Type;
