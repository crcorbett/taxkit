import type { DocsPublicationOrigin } from "@taxkit/content/schemas";
import { Context } from "effect";
import type { McpProtocol } from "effect/ai";

// The composition root supplies the publication address and selects the
// native protocol adapter. Each host keeps its own native protocol scope while
// using the captured calculator/content owners.
export class TaxKitMcpHost extends Context.Service<
  TaxKitMcpHost,
  {
    readonly protocol: McpProtocol.ProtocolAdapter;
    readonly publicationOrigin: DocsPublicationOrigin;
  }
>()("@taxkit/api/TaxKitMcpHost") {}
