import {
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
  CalculatorSchemaResponse,
  GetCalculatorRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { DocsPublicNavigation, DocsPublicPage } from "@taxkit/content/schemas";
import { Tool, Toolkit } from "effect/ai";

import {
  McpDocsReadRequest,
  McpDocsSearchRequest,
  McpDocsSearchResponse,
  McpToolUnavailable,
} from "./schemas.js";

// Name the Schema owners so emitted declarations never expose private rule paths.
export const TaxKitMcpToolkit: Toolkit.Toolkit<{
  readonly taxkit_list_calculators: Tool.Tool<
    "taxkit_list_calculators",
    {
      readonly parameters: typeof MetadataQuery;
      readonly success: typeof CalculatorCatalogResponse;
      readonly failure: typeof McpToolUnavailable;
      readonly failureMode: "error";
    }
  >;
  readonly taxkit_get_calculator_schema: Tool.Tool<
    "taxkit_get_calculator_schema",
    {
      readonly parameters: typeof GetCalculatorRequest;
      readonly success: typeof CalculatorSchemaResponse;
      readonly failure: typeof McpToolUnavailable;
      readonly failureMode: "error";
    }
  >;
  readonly taxkit_calculate: Tool.Tool<
    "taxkit_calculate",
    {
      readonly parameters: typeof CalculatorRunServiceRequest;
      readonly success: typeof CalculatorRunResponse;
      readonly failure: typeof McpToolUnavailable;
      readonly failureMode: "error";
    }
  >;
  readonly taxkit_docs_navigation: Tool.Tool<
    "taxkit_docs_navigation",
    {
      readonly parameters: typeof Tool.EmptyParams;
      readonly success: typeof DocsPublicNavigation;
      readonly failure: typeof McpToolUnavailable;
      readonly failureMode: "error";
    }
  >;
  readonly taxkit_find_docs: Tool.Tool<
    "taxkit_find_docs",
    {
      readonly parameters: typeof McpDocsSearchRequest;
      readonly success: typeof McpDocsSearchResponse;
      readonly failure: typeof McpToolUnavailable;
      readonly failureMode: "error";
    }
  >;
  readonly taxkit_read_doc: Tool.Tool<
    "taxkit_read_doc",
    {
      readonly parameters: typeof McpDocsReadRequest;
      readonly success: typeof DocsPublicPage;
      readonly failure: typeof McpToolUnavailable;
      readonly failureMode: "error";
    }
  >;
}> = Toolkit.make(
  Tool.make("taxkit_list_calculators", {
    description:
      "List the supported calculators and their current input and output facts.",
    failure: McpToolUnavailable,
    parameters: MetadataQuery,
    success: CalculatorCatalogResponse,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.OpenWorld, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_get_calculator_schema", {
    description:
      "Read a supported calculator's input questions, output facts, rules and sources before calculating.",
    failure: McpToolUnavailable,
    parameters: GetCalculatorRequest,
    success: CalculatorSchemaResponse,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.OpenWorld, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_calculate", {
    description:
      "Run a supported calculator with checked facts and return its report. Uses the shared anonymous calculation allowance. Figures are not saved. Do not retry automatically.",
    failure: McpToolUnavailable,
    parameters: CalculatorRunServiceRequest,
    success: CalculatorRunResponse,
  })
    .annotate(Tool.Destructive, false)
    .annotate(Tool.OpenWorld, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_docs_navigation", {
    description:
      "Find the accepted public documentation pages through the same navigation as the website.",
    failure: McpToolUnavailable,
    parameters: Tool.EmptyParams,
    success: DocsPublicNavigation,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.OpenWorld, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_find_docs", {
    description:
      "Search accepted public documentation using up to 100 characters of search words.",
    failure: McpToolUnavailable,
    parameters: McpDocsSearchRequest,
    success: McpDocsSearchResponse,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.OpenWorld, false)
    .annotate(Tool.Strict, true),
  Tool.make("taxkit_read_doc", {
    description:
      "Read an accepted public documentation page, including its processed Markdown, at a discovered page address.",
    failure: McpToolUnavailable,
    parameters: McpDocsReadRequest,
    success: DocsPublicPage,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.OpenWorld, false)
    .annotate(Tool.Strict, true)
);
