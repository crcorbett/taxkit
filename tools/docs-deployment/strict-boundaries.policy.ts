import { Array as EffectArray } from "effect";

const strictAppBoundaryPaths = [
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "apps/docs/src/lib/runtime-factory.server.ts",
  "apps/docs/src/lib/runtime.server.ts",
  "apps/docs/src/server.ts",
  "tools/docs-deployment/inventory-credentials.boundary.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/doppler-custody.runtime.ts",
  "tools/docs-deployment/doppler-custody.boundary.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/local-doppler.ts",
  "tools/docs-deployment/workflow-artifact.runtime.ts",
  "tools/docs-deployment/workflow-artifact.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
] as const;

export type StrictAppBoundaryPath = (typeof strictAppBoundaryPaths)[number];
export type StrictAppBoundarySources = Readonly<
  Record<StrictAppBoundaryPath, string>
>;

export interface StrictAppBoundaryFinding {
  readonly invariant:
    | "credential-boundary"
    | "host-ingress"
    | "hosted-proof-boundary"
    | "local-doppler-boundary"
    | "raw-concurrency"
    | "runtime-owner"
    | "runtime-probe"
    | "workflow-artifact-boundary"
    | "workflow-boundary";
  readonly path: StrictAppBoundaryPath;
}

const workflowEvidenceRuntimePath =
  "tools/docs-deployment/workflow-evidence.runtime.ts" as const;
const hostedProofBoundaryPath =
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts" as const;
const hostedProofHostPath =
  "apps/docs/scripts/test-cloudflare-hosted.tsx" as const;
const localDopplerRuntimePath =
  "tools/docs-deployment/local-doppler.runtime.ts" as const;
const workflowRuntimePaths = EffectArray.filter(
  strictAppBoundaryPaths,
  (path) =>
    path.includes("workflow-") &&
    path !== workflowEvidenceRuntimePath &&
    path !== "tools/docs-deployment/workflow-artifact.runtime.ts" &&
    path !== "tools/docs-deployment/workflow-artifact.ts"
);

const finding = (
  invariant: StrictAppBoundaryFinding["invariant"],
  path: StrictAppBoundaryPath
): StrictAppBoundaryFinding => ({ invariant, path });

const includesAny = (source: string, values: readonly string[]): boolean =>
  EffectArray.some(values, (value) => source.includes(value));

const includesEvery = (source: string, values: readonly string[]): boolean =>
  EffectArray.every(values, (value) => source.includes(value));

const inspectGenericBoundaries = (
  sources: StrictAppBoundarySources
): StrictAppBoundaryFinding[] => {
  const findings: StrictAppBoundaryFinding[] = [];
  const hostIngressPatterns = [
    "process.env",
    "Bun.file",
    "JSON.parse",
    'from "node:fs',
    "from 'node:fs",
  ] as const;
  const runtimeExecutionPatterns = [
    "Effect.runPromise",
    "Effect.runSync",
  ] as const;
  const rawConcurrencyPatterns = [
    "Promise.all",
    'concurrency: "unbounded"',
  ] as const;

  for (const path of strictAppBoundaryPaths) {
    const source = sources[path];
    const applicableHostIngressPatterns = EffectArray.filter(
      hostIngressPatterns,
      (pattern) =>
        !(
          (path === hostedProofHostPath && pattern.includes("node:fs")) ||
          (path === localDopplerRuntimePath && pattern === "process.env")
        )
    );
    if (includesAny(source, applicableHostIngressPatterns)) {
      findings.push(finding("host-ingress", path));
    }
    if (includesAny(source, runtimeExecutionPatterns)) {
      findings.push(finding("runtime-owner", path));
    }
    if (includesAny(source, rawConcurrencyPatterns)) {
      findings.push(finding("raw-concurrency", path));
    }
  }
  return findings;
};

const inspectHostedProofBoundary = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => {
  const boundary = sources[hostedProofBoundaryPath];
  const host = sources[hostedProofHostPath];
  const validBoundary = includesEvery(boundary, [
    "Config.schema(",
    "Effect.acquireRelease(",
    "Effect.tryPromise({",
    "HostedProofConfigurationError",
    "HostedProofExecutionError",
    "HostedProofEvidenceError",
  ]);
  const validHost =
    includesEvery(host, [
      "runCloudflareHostedProof(",
      "chromium.launch(",
      "BunRuntime.runMain(program)",
    ]) && !includesAny(host, ["process.env", "Number.parseInt("]);

  return validBoundary && validHost
    ? []
    : [finding("hosted-proof-boundary", hostedProofBoundaryPath)];
};

const inspectWorkflowBoundaries = (
  sources: StrictAppBoundarySources
): StrictAppBoundaryFinding[] => {
  const findings: StrictAppBoundaryFinding[] = [];
  const requiredPatterns = [
    "Config.schema(",
    "readWorkflowReceipt(",
    "BunRuntime.runMain(program)",
  ] as const;

  for (const path of workflowRuntimePaths) {
    if (!includesEvery(sources[path], requiredPatterns)) {
      findings.push(finding("workflow-boundary", path));
    }
  }
  if (
    !includesEvery(sources[workflowEvidenceRuntimePath], [
      "Config.schema(",
      "runWorkflowEvidence",
      "BunRuntime.runMain(program)",
    ])
  ) {
    findings.push(finding("workflow-boundary", workflowEvidenceRuntimePath));
  }
  return findings;
};

const inspectWorkflowArtifactBoundary = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => {
  const runtimePath =
    "tools/docs-deployment/workflow-artifact.runtime.ts" as const;
  const servicePath = "tools/docs-deployment/workflow-artifact.ts" as const;
  const runtime = sources[runtimePath];
  const service = sources[servicePath];
  const valid =
    includesEvery(runtime, [
      "Config.schema(WorkflowArtifactConfig)",
      "prepareWorkflowArtifact(",
      "disableErrorReporting: true",
    ]) &&
    includesEvery(service, [
      "FileSystem.FileSystem",
      "allowedFiles",
      "forbiddenText",
      "realPath(",
      "concurrency: 1",
    ]) &&
    !includesAny(service, ["process.env", "Bun.file", "Object.entries"]);

  return valid ? [] : [finding("workflow-artifact-boundary", servicePath)];
};

const inspectCredentialBoundary = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => {
  const boundaryPath =
    "tools/docs-deployment/inventory-credentials.boundary.ts" as const;
  const credentialBoundary = sources[boundaryPath];
  const inventoryRuntime =
    sources["tools/docs-deployment/inventory.runtime.ts"];
  const boundaryRequirements = [
    "FileSystem.FileSystem",
    "Schema.fromJsonString(",
    'onExcessProperty: "error"',
  ] as const;
  const runtimeRequirements = [
    "Config.unwrap(",
    "readDocsDeploymentStateStoreCredentials(",
  ] as const;

  return includesEvery(credentialBoundary, boundaryRequirements) &&
    includesEvery(inventoryRuntime, runtimeRequirements)
    ? []
    : [finding("credential-boundary", boundaryPath)];
};

const inspectLocalDopplerBoundary = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => {
  const custodyPath =
    "tools/docs-deployment/doppler-custody.boundary.ts" as const;
  const custodyRuntimePath =
    "tools/docs-deployment/doppler-custody.runtime.ts" as const;
  const commandPath = "tools/docs-deployment/local-doppler.ts" as const;
  const custody = sources[custodyPath];
  const custodyRuntime = sources[custodyRuntimePath];
  const command = sources[commandPath];
  const runtime = sources[localDopplerRuntimePath];
  const valid =
    includesEvery(custody, [
      "FileSystem.FileSystem",
      "Schema.decodeUnknownEffect(DopplerUserConfig)",
      "KeyringReference",
      'reason: "system-keyring-reference"',
    ]) &&
    includesEvery(custodyRuntime, [
      "checkDopplerCustody(",
      "disableErrorReporting: true",
    ]) &&
    includesEvery(command, [
      '"DOPPLER_TOKEN"',
      '"CLOUDFLARE_API_TOKEN"',
      '"--no-read-env"',
      '"--no-fallback"',
      '"--only-secrets"',
      '"--no-env-file"',
      "extendEnv: false",
    ]) &&
    !command.includes("process.env") &&
    includesEvery(runtime, [
      "checkDopplerCustody(",
      'runLocalDocsWithDoppler("doppler", process.env)',
      "disableErrorReporting: true",
    ]);

  return valid ? [] : [finding("local-doppler-boundary", commandPath)];
};

const inspectDocsRuntimeBoundary = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => {
  const factoryPath = "apps/docs/src/lib/runtime-factory.server.ts" as const;
  const runtimeFactory = sources[factoryPath];
  const runtimeComposition = sources["apps/docs/src/lib/runtime.server.ts"];
  const serverAdapter = sources["apps/docs/src/server.ts"];
  const forbiddenFactoryPatterns = [
    "globalThis.crypto",
    "randomUUID",
    "Math.random",
  ] as const;
  const factoryRequirements = ["Context.Service", "Ref.make("] as const;
  const adapterRequirements = [
    "docsRuntime.runPromise(",
    "readDocsRuntimeProbe",
    "Schema.encodeUnknownEffect(",
  ] as const;
  const valid =
    !/^let\s+/mu.test(runtimeFactory) &&
    !includesAny(runtimeFactory, forbiddenFactoryPatterns) &&
    includesEvery(runtimeFactory, factoryRequirements) &&
    runtimeComposition.includes("Random.nextIntBetween(") &&
    runtimeComposition.match(/createDocsRuntime\(/gu)?.length === 1 &&
    runtimeComposition.match(/createDocsRuntimeProbeLayer\(/gu)?.length === 1 &&
    includesEvery(serverAdapter, adapterRequirements);

  return valid ? [] : [finding("runtime-probe", factoryPath)];
};

export const inspectStrictAppBoundaries = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => [
  ...inspectGenericBoundaries(sources),
  ...inspectWorkflowBoundaries(sources),
  ...inspectWorkflowArtifactBoundary(sources),
  ...inspectHostedProofBoundary(sources),
  ...inspectCredentialBoundary(sources),
  ...inspectLocalDopplerBoundary(sources),
  ...inspectDocsRuntimeBoundary(sources),
];
