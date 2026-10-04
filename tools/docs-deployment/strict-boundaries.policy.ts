import { Array as EffectArray, Option, Record, Schema } from "effect";

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

export const StrictAppBoundaryPath = Schema.Literals(strictAppBoundaryPaths);
export type StrictAppBoundaryPath = typeof StrictAppBoundaryPath.Type;
export const StrictAppBoundarySources = Schema.Record(
  StrictAppBoundaryPath,
  Schema.String
);
export type StrictAppBoundarySources = typeof StrictAppBoundarySources.Type;

export const StrictAppBoundaryFinding = Schema.Struct({
  invariant: Schema.Literals([
    "credential-boundary",
    "host-ingress",
    "hosted-proof-boundary",
    "local-doppler-boundary",
    "raw-concurrency",
    "runtime-owner",
    "runtime-probe",
    "workflow-artifact-boundary",
    "workflow-boundary",
  ]),
  path: StrictAppBoundaryPath,
});
export type StrictAppBoundaryFinding = typeof StrictAppBoundaryFinding.Type;

// Missing source is inspected as empty: required ownership patterns fail closed.
export const readStrictAppBoundarySource = (
  sources: StrictAppBoundarySources,
  path: StrictAppBoundaryPath
): string => Record.get(sources, path).pipe(Option.getOrElse(() => ""));

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
): readonly StrictAppBoundaryFinding[] => {
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

  return EffectArray.flatMap(strictAppBoundaryPaths, (path) => {
    const source = readStrictAppBoundarySource(sources, path);
    const applicableHostIngressPatterns = EffectArray.filter(
      hostIngressPatterns,
      (pattern) =>
        !(
          (path === hostedProofHostPath && pattern.includes("node:fs")) ||
          (path === localDopplerRuntimePath && pattern === "process.env")
        )
    );
    return [
      ...(includesAny(source, applicableHostIngressPatterns)
        ? [finding("host-ingress", path)]
        : []),
      ...(includesAny(source, runtimeExecutionPatterns)
        ? [finding("runtime-owner", path)]
        : []),
      ...(includesAny(source, rawConcurrencyPatterns)
        ? [finding("raw-concurrency", path)]
        : []),
    ];
  });
};

const inspectHostedProofBoundary = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => {
  const boundary = readStrictAppBoundarySource(
    sources,
    hostedProofBoundaryPath
  );
  const host = readStrictAppBoundarySource(sources, hostedProofHostPath);
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
): readonly StrictAppBoundaryFinding[] => {
  const requiredPatterns = [
    "Config.schema(",
    "readWorkflowReceipt(",
    "BunRuntime.runMain(program)",
  ] as const;

  return [
    ...EffectArray.flatMap(workflowRuntimePaths, (path) =>
      includesEvery(
        readStrictAppBoundarySource(sources, path),
        requiredPatterns
      )
        ? []
        : [finding("workflow-boundary", path)]
    ),
    ...(includesEvery(
      readStrictAppBoundarySource(sources, workflowEvidenceRuntimePath),
      ["Config.schema(", "runWorkflowEvidence", "BunRuntime.runMain(program)"]
    )
      ? []
      : [finding("workflow-boundary", workflowEvidenceRuntimePath)]),
  ];
};

const inspectWorkflowArtifactBoundary = (
  sources: StrictAppBoundarySources
): readonly StrictAppBoundaryFinding[] => {
  const runtimePath =
    "tools/docs-deployment/workflow-artifact.runtime.ts" as const;
  const servicePath = "tools/docs-deployment/workflow-artifact.ts" as const;
  const runtime = readStrictAppBoundarySource(sources, runtimePath);
  const service = readStrictAppBoundarySource(sources, servicePath);
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
  const credentialBoundary = readStrictAppBoundarySource(sources, boundaryPath);
  const inventoryRuntime = readStrictAppBoundarySource(
    sources,
    "tools/docs-deployment/inventory.runtime.ts"
  );
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
  const custody = readStrictAppBoundarySource(sources, custodyPath);
  const custodyRuntime = readStrictAppBoundarySource(
    sources,
    custodyRuntimePath
  );
  const command = readStrictAppBoundarySource(sources, commandPath);
  const runtime = readStrictAppBoundarySource(sources, localDopplerRuntimePath);
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
  const runtimeFactory = readStrictAppBoundarySource(sources, factoryPath);
  const runtimeComposition = readStrictAppBoundarySource(
    sources,
    "apps/docs/src/lib/runtime.server.ts"
  );
  const serverAdapter = readStrictAppBoundarySource(
    sources,
    "apps/docs/src/server.ts"
  );
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
