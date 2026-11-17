import { CalculatorRunRequest } from "@taxkit/calculators/schemas";
import {
  DocsPublicPagePath,
  DocsSearchResult,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { ByteSize, Duration, Predicate, Schema } from "effect";

// MCP requires an object root; the native check keeps the shared union's codecs.
export const McpCalculationRequest = CalculatorRunRequest.check(
  Schema.makeFilter(Predicate.isReadonlyObject, {
    expected: "calculator request object",
    toJsonSchema: () => ({ type: "object" }),
  })
);
export const McpResponseLimit = ByteSize.mebibytes(2);
export const McpResponseDeadline = Duration.seconds(10);
export const McpDocsSearchRequest = Schema.Struct({ term: DocsSearchTerm });
export const McpDocsReadRequest = Schema.Struct({ path: DocsPublicPagePath });
export const McpDocsSearchResponse = Schema.Struct({
  results: Schema.Array(DocsSearchResult),
});
