import { CalculatorId } from "@taxkit/calculators/schemas";
import { Schema } from "effect";

// Transport addresses have one owner. Authored page identities stay in Content;
// Website file routes stay in the Website application.
export const healthPath = "/api/health";
export const mcpPath = "/mcp";
export const referencePath = "/api/docs";
export const openApiPath = "/api/docs/openapi.json";

export const calculatorPaths = {
  calculate: "/api/v1/calculators/:calculatorId/calculate",
  calculator: "/api/v1/calculators/:calculatorId",
  calculators: "/api/v1/calculators",
  facts: "/api/v1/facts",
  graph: "/api/v1/calculators/:calculatorId/graph",
  jurisdictions: "/api/v1/jurisdictions",
  rules: "/api/v1/rules",
  schema: "/api/v1/calculators/:calculatorId/schema",
  taxYears: "/api/v1/tax-years",
} as const;

export const docsPaths = {
  markdown: "/api/v1/docs/markdown",
  navigation: "/api/v1/docs/navigation",
  page: "/api/v1/docs/page",
  search: "/api/v1/docs/search",
} as const;

export const discoveryPaths = {
  llms: "/llms.txt",
  llmsFull: "/llms-full.txt",
  robots: "/robots.txt",
  sitemap: "/sitemap.xml",
} as const;
export const DiscoveryPath = Schema.Literals([
  discoveryPaths.sitemap,
  discoveryPaths.robots,
  discoveryPaths.llms,
  discoveryPaths.llmsFull,
]);
export type DiscoveryPath = typeof DiscoveryPath.Type;
export const docsDiscoveryPrefix = "/api/v1/docs/discovery";
export const discoveryApiPath = (path: DiscoveryPath) =>
  `${docsDiscoveryPrefix}${path}` as const;
export const DocsDiscoveryApiPath = Schema.TemplateLiteral([
  docsDiscoveryPrefix,
  DiscoveryPath,
]);

// One share image per published page, rendered by the API. The Website serves
// the same image at /og<page>.png by forwarding here.
export const docsImagePrefix = "/api/v1/docs/og";
export const docsImageApiPath = (pagePath: string) =>
  `${docsImagePrefix}${pagePath}.png` as const;
export const DocsImageApiPath = Schema.TemplateLiteral([
  docsImagePrefix,
  "/",
  Schema.String,
  ".png",
]);

export const DocsApiPath = Schema.Literals([
  docsPaths.navigation,
  docsPaths.page,
  docsPaths.search,
  docsPaths.markdown,
]);
export const HealthPath = Schema.Literal(healthPath);
export const ApiReferencePath = Schema.Literals([referencePath, openApiPath]);
export const McpRoutePath = Schema.Union([
  Schema.Literal(mcpPath),
  Schema.TemplateLiteral([mcpPath, "/", Schema.String]),
]);

const CalculatorCollectionPath = Schema.Literals([
  calculatorPaths.jurisdictions,
  calculatorPaths.taxYears,
  calculatorPaths.calculators,
  calculatorPaths.facts,
  calculatorPaths.rules,
]);
const CalculatorMetadataPath = Schema.TemplateLiteral([
  calculatorPaths.calculators,
  "/",
  CalculatorId,
  Schema.Literals(["", "/schema", "/graph"]),
]);
// Invalid identifiers still belong to their transport family. Cache and trusted
// calculation admission use only the checked identifier subsets below.
export const CalculationFamilyPath = Schema.TemplateLiteral([
  calculatorPaths.calculators,
  "/",
  Schema.String,
  "/calculate",
]);
export const CalculationPath = Schema.TemplateLiteral([
  calculatorPaths.calculators,
  "/",
  CalculatorId,
  "/calculate",
]);
export const CalculatorApiPath = Schema.Union([
  CalculatorCollectionPath,
  Schema.TemplateLiteral([calculatorPaths.calculators, "/", Schema.String]),
]);
export const ApiDataPath = Schema.Union([
  HealthPath,
  CalculatorApiPath,
  DocsApiPath,
]);
export const PublicReadApiPath = Schema.Union([
  CalculatorCollectionPath,
  CalculatorMetadataPath,
  DocsApiPath,
  DocsDiscoveryApiPath,
  DocsImageApiPath,
  ApiReferencePath,
]);
export const isPublicReadApiPath = Schema.is(PublicReadApiPath);
