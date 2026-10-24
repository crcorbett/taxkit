import { Array, Number, Option } from "effect";

// Roles are independent of package exports and dependency declarations. Adding
// an export or dependency cannot grant a browser or deployment permission.
const frontendModules = [
  "@taxkit/analytics/collection-policy",
  "@taxkit/analytics/schemas",
  "@taxkit/analytics/errors",
  "@taxkit/analytics/service",
  "@taxkit/api-http/api",
  "@taxkit/api-http/errors",
  "@taxkit/api-http/negotiation",
  "@taxkit/api-http/origin",
  "@taxkit/api-http/request-boundary",
  "@taxkit/api-http/requests",
  "@taxkit/api-http/response-policy",
  "@taxkit/api-http/routes",
  "@taxkit/calculators/schemas",
  "@taxkit/calculators/errors",
  "@taxkit/calculators/form",
  "@taxkit/calculators/page",
  "@taxkit/calculators/page-schemas",
  "@taxkit/calculators/page-tools",
  "@taxkit/calculators/summaries",
  "@taxkit/content/schemas",
  "@taxkit/content/errors",
  "@taxkit/content/publication",
  "@taxkit/content/service",
  "@taxkit/content/response-check",
  "@taxkit/core/primitives",
  "@taxkit/core/ledger",
  "@taxkit/core/trace",
  "@taxkit/observability/edge-identity",
  "@taxkit/rules-au-income-tax/schemas",
  "@taxkit/rules-au-pay/schemas",
  "@taxkit/rules-au-pay/facts",
  "@taxkit/webmcp/host",
  "@taxkit/webmcp/registration",
  "@taxkit/webmcp/schemas",
  "@taxkit/webmcp/service",
];
const hostModuleExceptions = [
  {
    file: "apps/web/src/server.ts",
    module: "@taxkit/observability/host-telemetry",
  },
  {
    file: "apps/web/src/lib/runtime.server.ts",
    module: "@taxkit/observability/host-telemetry",
  },
  {
    file: "apps/web/src/lib/host/config.server.ts",
    module: "@taxkit/content/config",
  },
  {
    file: "apps/web/src/lib/host/config.server.ts",
    module: "@taxkit/infrastructure/api-worker",
  },
  {
    file: "apps/web/src/lib/host/binding.server.ts",
    module: "@taxkit/infrastructure/api-worker",
  },
];
// Native isomorphic/server composition imports these local server boundaries.
// The grant is for one source and one module address, never a browser subtree.
const hostSourceImports = [
  { file: "apps/web/src/lib/pages/loaders.ts", module: "../runtime.server" },
  {
    file: "apps/web/src/lib/host/settings.server.layer.ts",
    module: "./config.server",
  },
];
export const isHostSourceImport = (file: string, address: string) =>
  Array.some(
    hostSourceImports,
    (exception) => exception.file === file && exception.module === address
  );
const isDeploymentDependency = (dependency: string) =>
  dependency === "@taxkit/infrastructure" ||
  dependency.startsWith("@taxkit/infrastructure/") ||
  dependency.startsWith("@distilled.cloud/");
const isInfrastructureOwner = (owner: string) =>
  owner === "packages/infrastructure";
// Runtime support is consumed by domain packages and hosts, never the reverse:
// these owners depend on no other TaxKit workspace package.
const domainFreeOwners = ["packages/observability"];
export const isForbiddenPackageDependency = (
  owner: string,
  dependency: string
) =>
  (Array.contains(domainFreeOwners, owner) &&
    (dependency === "taxkit" ||
      dependency.startsWith("taxkit/") ||
      dependency.startsWith("@taxkit/"))) ||
  (owner.startsWith("packages/") &&
    !isInfrastructureOwner(owner) &&
    (isDeploymentDependency(dependency) ||
      dependency === "alchemy" ||
      dependency.startsWith("alchemy/")));
export const isFrontendModule = (file: string, address: string) =>
  Array.contains(frontendModules, address) ||
  (/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(file) &&
    /\/testing\/(?:fixtures|observations)$/u.test(address)) ||
  Array.some(
    hostModuleExceptions,
    (exception) => exception.file === file && exception.module === address
  );
// File ownership uses the longest root because transport/rule/SDK packages nest.
interface WorkspaceOwner {
  readonly owner: string;
}
export const workspaceOwner = (
  owners: readonly WorkspaceOwner[],
  file: string
) =>
  Array.findFirst(
    Array.sort(owners, (left: WorkspaceOwner, right: WorkspaceOwner) =>
      Number.Order(right.owner.length, left.owner.length)
    ),
    ({ owner }) => file.startsWith(`${owner}/`)
  ).pipe(Option.map(({ owner }) => owner));
