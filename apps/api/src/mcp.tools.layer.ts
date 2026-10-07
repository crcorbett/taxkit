import {
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
  CalculatorSchemaResponse,
  GetCalculatorRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import {
  DocsPublicNavigation,
  DocsPublicPage,
  DocsPublicPagePath,
  DocsSearchTerm,
} from "@taxkit/content/schemas";
import { ContentService } from "@taxkit/content/service";
import { Effect, Layer, Match, Schema } from "effect";
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/ai";

import { withMcpRequestCancellation } from "./mcp-cancellation.boundary.js";
import { McpDocsSearchResponse, McpToolUnavailable } from "./mcp.schemas.js";
import type { ApiWorkerSettings } from "./schemas.js";

const TaxKitMcpToolkit = Toolkit.make(
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
    parameters: Schema.Struct({ term: DocsSearchTerm }),
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
    parameters: Schema.Struct({ path: DocsPublicPagePath }),
    success: DocsPublicPage,
  })
    .annotate(Tool.Readonly, true)
    .annotate(Tool.Destructive, false)
    .annotate(Tool.OpenWorld, false)
    .annotate(Tool.Strict, true)
);

const TaxKitMcpHandlersLive = TaxKitMcpToolkit.toLayer(
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    const content = yield* ContentService;
    return TaxKitMcpToolkit.of({
      taxkit_calculate: Effect.fn("TaxKitMcp.calculate")((request) =>
        calculator.calculate(request).pipe(
          Effect.mapError((error) =>
            Match.value(error).pipe(
              Match.tag(
                "CalculatorRateLimited",
                () =>
                  new McpToolUnavailable({
                    code: "rate-limited",
                    retry: "wait-then-try-manually",
                  })
              ),
              Match.tag(
                "CalculatorCapacityExceeded",
                () =>
                  new McpToolUnavailable({
                    code: "capacity-exceeded",
                    retry: "try-again-manually",
                  })
              ),
              Match.tag(
                "CalculatorOperationTimedOut",
                () =>
                  new McpToolUnavailable({
                    code: "operation-timeout",
                    retry: "try-again-manually",
                  })
              ),
              Match.tag(
                "CalculatorAdmissionUnavailable",
                () =>
                  new McpToolUnavailable({
                    code: "service-unavailable",
                    retry: "try-again-manually",
                  })
              ),
              Match.tag(
                "CalculationError",
                "CalculatorInputDecodeError",
                "UnsupportedCalculatorError",
                "UnsupportedCalculatorContextError",
                () =>
                  new McpToolUnavailable({
                    code: "invalid-calculation",
                    retry: "check-input-before-retrying",
                  })
              ),
              Match.exhaustive
            )
          ),
          withMcpRequestCancellation
        )
      ),
      taxkit_docs_navigation: Effect.fn("TaxKitMcp.docsNavigation")(() =>
        content.getNavigation().pipe(withMcpRequestCancellation)
      ),
      taxkit_find_docs: Effect.fn("TaxKitMcp.findDocs")(({ term }) =>
        content.searchPages(term).pipe(
          Effect.map((results) => ({ results })),
          Effect.mapError(
            () =>
              new McpToolUnavailable({
                code: "service-unavailable",
                retry: "try-again-manually",
              })
          ),
          withMcpRequestCancellation
        )
      ),
      taxkit_get_calculator_schema: Effect.fn("TaxKitMcp.getCalculatorSchema")(
        (request) =>
          calculator.getCalculatorSchema(request).pipe(
            Effect.mapError(
              () =>
                new McpToolUnavailable({
                  code: "service-unavailable",
                  retry: "try-again-manually",
                })
            ),
            withMcpRequestCancellation
          )
      ),
      taxkit_list_calculators: Effect.fn("TaxKitMcp.listCalculators")((query) =>
        calculator.listCalculators(query).pipe(
          Effect.mapError(
            () =>
              new McpToolUnavailable({
                code: "operation-timeout",
                retry: "try-again-manually",
              })
          ),
          withMcpRequestCancellation
        )
      ),
      taxkit_read_doc: Effect.fn("TaxKitMcp.readDoc")(({ path }) =>
        content.getPage(path).pipe(
          Effect.mapError(
            () =>
              new McpToolUnavailable({
                code: "service-unavailable",
                retry: "try-again-manually",
              })
          ),
          withMcpRequestCancellation
        )
      ),
    });
  })
);

// Only the stateless adapter is composed here. The older adapter remains
// unexposed until its native Worker session routing and expiry are qualified.
export const TaxKitMcpHttpLayer = (
  websiteOrigin: ApiWorkerSettings["websiteOrigin"]
) =>
  McpServer.toolkit(TaxKitMcpToolkit).pipe(
    Layer.provide(TaxKitMcpHandlersLive),
    Layer.provide(
      McpServer.layerHttp({
        allowedOrigins: [websiteOrigin.origin],
        name: "TaxKit",
        path: "/mcp",
        protocols: [McpProtocol.v2026_07_28],
        version: "1",
      })
    )
  );
