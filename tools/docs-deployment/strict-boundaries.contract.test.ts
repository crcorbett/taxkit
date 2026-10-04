import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { Array as EffectArray } from "effect";

import { inspectStrictAppBoundaries } from "./strict-boundaries.policy.js";
import type {
  StrictAppBoundaryPath,
  StrictAppBoundarySources,
} from "./strict-boundaries.policy.js";

const readSource = (path: StrictAppBoundaryPath) => readFile(path, "utf-8");

const readGovernedSources = async (): Promise<StrictAppBoundarySources> => ({
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts": await readSource(
    "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts"
  ),
  "apps/docs/scripts/test-cloudflare-hosted.tsx": await readSource(
    "apps/docs/scripts/test-cloudflare-hosted.tsx"
  ),
  "apps/docs/src/lib/runtime-factory.server.ts": await readSource(
    "apps/docs/src/lib/runtime-factory.server.ts"
  ),
  "apps/docs/src/lib/runtime.server.ts": await readSource(
    "apps/docs/src/lib/runtime.server.ts"
  ),
  "apps/docs/src/server.ts": await readSource("apps/docs/src/server.ts"),
  "tools/docs-deployment/doppler-custody.boundary.ts": await readSource(
    "tools/docs-deployment/doppler-custody.boundary.ts"
  ),
  "tools/docs-deployment/doppler-custody.runtime.ts": await readSource(
    "tools/docs-deployment/doppler-custody.runtime.ts"
  ),
  "tools/docs-deployment/inventory-credentials.boundary.ts": await readSource(
    "tools/docs-deployment/inventory-credentials.boundary.ts"
  ),
  "tools/docs-deployment/inventory.runtime.ts": await readSource(
    "tools/docs-deployment/inventory.runtime.ts"
  ),
  "tools/docs-deployment/local-doppler.runtime.ts": await readSource(
    "tools/docs-deployment/local-doppler.runtime.ts"
  ),
  "tools/docs-deployment/local-doppler.ts": await readSource(
    "tools/docs-deployment/local-doppler.ts"
  ),
  "tools/docs-deployment/workflow-artifact.runtime.ts": await readSource(
    "tools/docs-deployment/workflow-artifact.runtime.ts"
  ),
  "tools/docs-deployment/workflow-artifact.ts": await readSource(
    "tools/docs-deployment/workflow-artifact.ts"
  ),
  "tools/docs-deployment/workflow-evidence.runtime.ts": await readSource(
    "tools/docs-deployment/workflow-evidence.runtime.ts"
  ),
  "tools/docs-deployment/workflow-input-check.runtime.ts": await readSource(
    "tools/docs-deployment/workflow-input-check.runtime.ts"
  ),
  "tools/docs-deployment/workflow-plan-check.runtime.ts": await readSource(
    "tools/docs-deployment/workflow-plan-check.runtime.ts"
  ),
  "tools/docs-deployment/workflow-proof-check.runtime.ts": await readSource(
    "tools/docs-deployment/workflow-proof-check.runtime.ts"
  ),
  "tools/docs-deployment/workflow-run-check.runtime.ts": await readSource(
    "tools/docs-deployment/workflow-run-check.runtime.ts"
  ),
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts":
    await readSource(
      "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts"
    ),
});

const replaceSource = (
  sources: StrictAppBoundarySources,
  path: StrictAppBoundaryPath,
  mutate: (source: string) => string
): StrictAppBoundarySources => ({
  ...sources,
  [path]: mutate(sources[path]),
});

const findingInvariants = (sources: StrictAppBoundarySources) =>
  EffectArray.map(
    inspectStrictAppBoundaries(sources),
    ({ invariant }) => invariant
  );

describe("strict docs app and deployment architecture", () => {
  test("accepts the exact governed Effect and host boundaries", async () => {
    const sources = await readGovernedSources();
    expect(inspectStrictAppBoundaries(sources)).toEqual([]);
  });

  test("rejects direct environment, manual JSON/file and raw runtime execution", async () => {
    const sources = await readGovernedSources();
    const path = "tools/docs-deployment/inventory.runtime.ts";
    const contaminated = replaceSource(sources, path, (source) =>
      [
        source,
        'const token = process.env["TOKEN"];',
        'const input = JSON.parse("{}");',
        'const file = Bun.file("receipt.json");',
        "Effect.runPromise(Effect.void);",
      ].join("\n")
    );
    expect(findingInvariants(contaminated)).toEqual(
      expect.arrayContaining(["host-ingress", "runtime-owner"])
    );
  });

  test("rejects raw concurrency", async () => {
    const sources = await readGovernedSources();
    const path = "tools/docs-deployment/inventory.runtime.ts";
    const contaminated = replaceSource(
      sources,
      path,
      (source) => `${source}\nPromise.all([]);\n`
    );
    expect(findingInvariants(contaminated)).toContain("raw-concurrency");
  });

  test("rejects unmanaged docs runtime proof state and randomness", async () => {
    const sources = await readGovernedSources();
    const path = "apps/docs/src/lib/runtime-factory.server.ts";
    const contaminated = replaceSource(sources, path, (source) =>
      [
        "let runtimeConstructionCount = 0;",
        "const isolateId = globalThis.crypto.randomUUID();",
        source,
      ].join("\n")
    );
    expect(findingInvariants(contaminated)).toContain("runtime-probe");
  });

  test("rejects bypassed shared credential and workflow boundaries", async () => {
    const sources = await readGovernedSources();
    const withoutCredentialBoundary = replaceSource(
      sources,
      "tools/docs-deployment/inventory.runtime.ts",
      (source) =>
        source.replace(
          "readDocsDeploymentStateStoreCredentials(",
          "readUncheckedCredentials("
        )
    );
    const withoutWorkflowBoundary = replaceSource(
      sources,
      "tools/docs-deployment/workflow-input-check.runtime.ts",
      (source) => source.replace("readWorkflowReceipt(", "readReceipt(")
    );
    expect(findingInvariants(withoutCredentialBoundary)).toContain(
      "credential-boundary"
    );
    expect(findingInvariants(withoutWorkflowBoundary)).toContain(
      "workflow-boundary"
    );
    const withoutEvidenceBoundary = replaceSource(
      sources,
      "tools/docs-deployment/workflow-evidence.runtime.ts",
      (source) => source.replaceAll("Config.schema(", "readRawConfig(")
    );
    expect(findingInvariants(withoutEvidenceBoundary)).toContain(
      "workflow-boundary"
    );
  });

  test("rejects a widened or ambient local Doppler boundary", async () => {
    const sources = await readGovernedSources();
    const ambientCommand = replaceSource(
      sources,
      "tools/docs-deployment/local-doppler.ts",
      (source) =>
        source
          .replace('"--no-read-env",', "")
          .replace("extendEnv: false", "extendEnv: true")
    );
    const bypassedCustody = replaceSource(
      sources,
      "tools/docs-deployment/local-doppler.runtime.ts",
      (source) => source.replace("checkDopplerCustody(", "skipCustody(")
    );
    expect(findingInvariants(ambientCommand)).toContain(
      "local-doppler-boundary"
    );
    expect(findingInvariants(bypassedCustody)).toContain(
      "local-doppler-boundary"
    );
  });

  test("rejects a widened workflow artifact boundary", async () => {
    const sources = await readGovernedSources();
    const widened = replaceSource(
      sources,
      "tools/docs-deployment/workflow-artifact.ts",
      (source) => source.replaceAll("allowedFiles", "unboundedFiles")
    );
    expect(findingInvariants(widened)).toContain("workflow-artifact-boundary");
  });

  test("rejects bypassed hosted-proof Config and browser lifetime boundaries", async () => {
    const sources = await readGovernedSources();
    const withoutConfig = replaceSource(
      sources,
      "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
      (source) => source.replace("Config.schema(", "readRawEnvironment(")
    );
    const withoutScope = replaceSource(
      sources,
      "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
      (source) => source.replace("Effect.acquireRelease(", "launchBrowser(")
    );
    const rawHostEnvironment = replaceSource(
      sources,
      "apps/docs/scripts/test-cloudflare-hosted.tsx",
      (source) => `${source}\nprocess.env["TOKEN"];\n`
    );

    expect(findingInvariants(withoutConfig)).toContain("hosted-proof-boundary");
    expect(findingInvariants(withoutScope)).toContain("hosted-proof-boundary");
    expect(findingInvariants(rawHostEnvironment)).toEqual(
      expect.arrayContaining(["host-ingress", "hosted-proof-boundary"])
    );
  });

  test("permits the Worker host callback", async () => {
    const sources = await readGovernedSources();
    expect(sources["apps/docs/src/server.ts"]).toContain(
      "fetch: async (request: Request)"
    );
    expect(inspectStrictAppBoundaries(sources)).toEqual([]);
  });
});
