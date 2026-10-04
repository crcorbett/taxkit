import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array as EffectArray, Effect, FileSystem } from "effect";

import {
  inspectStrictAppBoundaries,
  readStrictAppBoundarySource,
} from "./strict-boundaries.policy.js";
import type {
  StrictAppBoundaryPath,
  StrictAppBoundarySources,
} from "./strict-boundaries.policy.js";

const readGovernedSources = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  return {
    "apps/docs/scripts/cloudflare-built-browser.live.ts":
      yield* fileSystem.readFileString(
        "apps/docs/scripts/cloudflare-built-browser.live.ts"
      ),
    "apps/docs/scripts/cloudflare-built-proof.boundary.ts":
      yield* fileSystem.readFileString(
        "apps/docs/scripts/cloudflare-built-proof.boundary.ts"
      ),
    "apps/docs/scripts/cloudflare-built-proof.live.layer.ts":
      yield* fileSystem.readFileString(
        "apps/docs/scripts/cloudflare-built-proof.live.layer.ts"
      ),
    "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts":
      yield* fileSystem.readFileString(
        "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts"
      ),
    "apps/docs/scripts/cloudflare-hosted-proof.live.layer.ts":
      yield* fileSystem.readFileString(
        "apps/docs/scripts/cloudflare-hosted-proof.live.layer.ts"
      ),
    "apps/docs/scripts/test-cloudflare-built.tsx":
      yield* fileSystem.readFileString(
        "apps/docs/scripts/test-cloudflare-built.tsx"
      ),
    "apps/docs/scripts/test-cloudflare-hosted.tsx":
      yield* fileSystem.readFileString(
        "apps/docs/scripts/test-cloudflare-hosted.tsx"
      ),
    "apps/docs/src/lib/runtime-factory.server.ts":
      yield* fileSystem.readFileString(
        "apps/docs/src/lib/runtime-factory.server.ts"
      ),
    "apps/docs/src/lib/runtime.server.ts": yield* fileSystem.readFileString(
      "apps/docs/src/lib/runtime.server.ts"
    ),
    "apps/docs/src/server.ts": yield* fileSystem.readFileString(
      "apps/docs/src/server.ts"
    ),
    "tools/docs-deployment/doppler-custody.boundary.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/doppler-custody.boundary.ts"
      ),
    "tools/docs-deployment/doppler-custody.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/doppler-custody.runtime.ts"
      ),
    "tools/docs-deployment/inventory-credentials.boundary.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/inventory-credentials.boundary.ts"
      ),
    "tools/docs-deployment/inventory.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/inventory.runtime.ts"
      ),
    "tools/docs-deployment/local-doppler.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/local-doppler.runtime.ts"
      ),
    "tools/docs-deployment/local-doppler.ts": yield* fileSystem.readFileString(
      "tools/docs-deployment/local-doppler.ts"
    ),
    "tools/docs-deployment/workflow-artifact.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-artifact.runtime.ts"
      ),
    "tools/docs-deployment/workflow-artifact.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-artifact.ts"
      ),
    "tools/docs-deployment/workflow-evidence.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-evidence.runtime.ts"
      ),
    "tools/docs-deployment/workflow-input-check.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-input-check.runtime.ts"
      ),
    "tools/docs-deployment/workflow-plan-check.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-plan-check.runtime.ts"
      ),
    "tools/docs-deployment/workflow-proof-check.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-proof-check.runtime.ts"
      ),
    "tools/docs-deployment/workflow-run-check.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-run-check.runtime.ts"
      ),
    "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts":
      yield* fileSystem.readFileString(
        "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts"
      ),
  } satisfies StrictAppBoundarySources;
}).pipe(Effect.provide(BunServices.layer));

const replaceSource = (
  sources: StrictAppBoundarySources,
  path: StrictAppBoundaryPath,
  mutate: (source: string) => string
): StrictAppBoundarySources => ({
  ...sources,
  [path]: mutate(readStrictAppBoundarySource(sources, path)),
});

const findingInvariants = (sources: StrictAppBoundarySources) =>
  EffectArray.map(
    inspectStrictAppBoundaries(sources),
    ({ invariant }) => invariant
  );

describe("strict docs app and deployment architecture", () => {
  test.effect("accepts the exact governed Effect and host boundaries", () =>
    Effect.gen(function* () {
      const sources = yield* readGovernedSources;
      expect(inspectStrictAppBoundaries(sources)).toEqual([]);
    })
  );

  test.effect(
    "rejects direct environment, manual JSON/file and raw runtime execution",
    () =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
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
      })
  );

  test.effect("rejects raw concurrency", () =>
    Effect.gen(function* () {
      const sources = yield* readGovernedSources;
      const path = "tools/docs-deployment/inventory.runtime.ts";
      const contaminated = replaceSource(
        sources,
        path,
        (source) => `${source}\nPromise.all([]);\n`
      );
      expect(findingInvariants(contaminated)).toContain("raw-concurrency");
    })
  );

  test.effect("rejects unmanaged docs runtime proof state and randomness", () =>
    Effect.gen(function* () {
      const sources = yield* readGovernedSources;
      const path = "apps/docs/src/lib/runtime-factory.server.ts";
      const contaminated = replaceSource(sources, path, (source) =>
        [
          "let runtimeConstructionCount = 0;",
          "const isolateId = globalThis.crypto.randomUUID();",
          source,
        ].join("\n")
      );
      expect(findingInvariants(contaminated)).toContain("runtime-probe");
    })
  );

  test.effect(
    "rejects bypassed shared credential and workflow boundaries",
    () =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
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
      })
  );

  test.effect("rejects a widened or ambient local Doppler boundary", () =>
    Effect.gen(function* () {
      const sources = yield* readGovernedSources;
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
      const bypassedEnvironment = replaceSource(
        sources,
        "tools/docs-deployment/local-doppler.runtime.ts",
        (source) =>
          source.replace("readLocalDopplerEnvironment(", "readRawEnvironment(")
      );
      expect(findingInvariants(bypassedEnvironment)).toContain(
        "local-doppler-boundary"
      );
      const ambientRuntime = replaceSource(
        sources,
        "tools/docs-deployment/local-doppler.runtime.ts",
        (source) => `${source}\nconst ambient = process.env;\n`
      );
      expect(findingInvariants(ambientRuntime)).toContain("host-ingress");
    })
  );

  test.effect("rejects a widened workflow artifact boundary", () =>
    Effect.gen(function* () {
      const sources = yield* readGovernedSources;
      const widened = replaceSource(
        sources,
        "tools/docs-deployment/workflow-artifact.ts",
        (source) => source.replaceAll("allowedFiles", "unboundedFiles")
      );
      expect(findingInvariants(widened)).toContain(
        "workflow-artifact-boundary"
      );
    })
  );

  test.effect(
    "rejects bypassed hosted-proof Config and browser lifetime boundaries",
    () =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
        const withoutConfig = replaceSource(
          sources,
          "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
          (source) => source.replace("Config.schema(", "readRawEnvironment(")
        );
        const withoutScope = replaceSource(
          sources,
          "apps/docs/scripts/cloudflare-hosted-proof.live.layer.ts",
          (source) =>
            source.replace(
              "const acquireBrowser = Effect.acquireRelease(",
              "const acquireBrowser = launchBrowser("
            )
        );
        const rawHostEnvironment = replaceSource(
          sources,
          "apps/docs/scripts/test-cloudflare-hosted.tsx",
          (source) => `${source}\nprocess.env["TOKEN"];\n`
        );

        expect(findingInvariants(withoutConfig)).toContain(
          "hosted-proof-boundary"
        );
        expect(findingInvariants(withoutScope)).toContain(
          "hosted-proof-boundary"
        );
        expect(findingInvariants(rawHostEnvironment)).toEqual(
          expect.arrayContaining(["host-ingress", "hosted-proof-boundary"])
        );
      })
  );

  test.effect.each([
    {
      from: "verifyHostedDeployment",
      path: "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
      to: "useRawBrowser",
    },
    {
      from: "Schema.encodeEffect(",
      path: "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
      to: "writeUncheckedJson(",
    },
    {
      from: "HostedProofProbe.makeEffect(",
      path: "apps/docs/scripts/cloudflare-hosted-proof.live.layer.ts",
      to: "uncheckedBrowserResult(",
    },
    {
      from: "Queue.offerUnsafe(",
      path: "apps/docs/scripts/cloudflare-hosted-proof.live.layer.ts",
      to: "events.push(",
    },
    {
      from: "",
      path: "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
      to: "export interface CloudflareHostedProofHost<BrowserHandle> {}",
    },
  ] as const)(
    "rejects a bypassed named hosted-proof boundary: $to",
    ({ path, from, to }) =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
        const changed = replaceSource(sources, path, (source) =>
          from === "" ? `${source}\n${to}\n` : source.replaceAll(from, to)
        );
        expect(findingInvariants(changed)).toContain("hosted-proof-boundary");
      })
  );

  test.effect.each([
    {
      from: "verifyBuiltDeployment",
      path: "apps/docs/scripts/cloudflare-built-proof.boundary.ts",
      to: "rawSdkCallback",
    },
    {
      from: "Config.schema(LocalEnvironment)",
      path: "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      to: "Config.schema(Schema.Unknown)",
    },
    {
      from: "1_048_576",
      path: "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      to: "Infinity",
    },
    {
      from: "67_108_864",
      path: "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      to: "Infinity",
    },
    {
      from: "10_000",
      path: "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      to: "Infinity",
    },
    {
      from: "if (Number(exit) !== 0)",
      path: "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      to: "if (false)",
    },
    {
      from: "new Uint8Array([0])",
      path: "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      to: "new Uint8Array([])",
    },
    {
      from: 'duration: "5 minutes"',
      path: "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      to: 'duration: "100 years"',
    },
    {
      from: 'data: Buffer.from("{")',
      path: "apps/docs/scripts/cloudflare-built-browser.live.ts",
      to: 'data: "{"',
    },
    {
      from: "Queue.size(overflow)",
      path: "apps/docs/scripts/cloudflare-built-browser.live.ts",
      to: "Effect.succeed(0)",
    },
    {
      from: "value.close()",
      path: "apps/docs/scripts/cloudflare-built-browser.live.ts",
      to: "value.version()",
    },
    {
      from: "page.off(",
      path: "apps/docs/scripts/cloudflare-built-browser.live.ts",
      to: "page.on(",
    },
    {
      from: "Schema.encodeEffect(",
      path: "apps/docs/scripts/test-cloudflare-built.tsx",
      to: "uncheckedJson(",
    },
    {
      from: "if (saved !==",
      path: "apps/docs/scripts/test-cloudflare-built.tsx",
      to: "if (saved ===",
    },
    {
      from: "receipt.screenshots.length !==",
      path: "apps/docs/scripts/test-cloudflare-built.tsx",
      to: "receipt.screenshots.length ===",
    },
  ] as const)(
    "rejects bypassed local built proof ownership: $from",
    ({ path, from, to }) =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
        expect(readStrictAppBoundarySource(sources, path)).toContain(from);
        const changed = replaceSource(sources, path, (source) =>
          source.replaceAll(from, to)
        );
        expect(findingInvariants(changed)).toContain("built-proof-boundary");
      })
  );

  test.effect("permits the Worker host callback", () =>
    Effect.gen(function* () {
      const sources = yield* readGovernedSources;
      expect(
        readStrictAppBoundarySource(sources, "apps/docs/src/server.ts")
      ).toContain("fetch: (request: Request)");
      expect(inspectStrictAppBoundaries(sources)).toEqual([]);
    })
  );
  test.effect.each([
    {
      from: "docsRuntime.contextEffect",
      invariant: "runtime-probe",
      to: "uncheckedContext",
    },
    {
      from: "Effect.provide(context)",
      invariant: "runtime-probe",
      to: "Effect.provide(otherContext)",
    },
    {
      from: "Schema.encodeEffect(DocsRuntimeProbeSnapshot)",
      invariant: "runtime-probe",
      to: "encodeUncheckedProbe()",
    },
    {
      from: "{ signal: request.signal }",
      invariant: "runtime-probe",
      to: "{}",
    },
    {
      from: "name !== runtimeProofResponseHeader",
      invariant: "runtime-probe",
      to: "true",
    },
    {
      from: "name !== runtimeProofIsolateHeader",
      invariant: "runtime-probe",
      to: "true",
    },
    {
      from: "new Response(response.body",
      invariant: "runtime-probe",
      to: "new Response(null",
    },
    {
      from: "status: response.status",
      invariant: "runtime-probe",
      to: "status: 200",
    },
    {
      from: "statusText: response.statusText",
      invariant: "runtime-probe",
      to: 'statusText: ""',
    },
  ] as const)(
    "rejects a bypassed Worker response contract: $from",
    ({ from, invariant, to }) =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
        const source = readStrictAppBoundarySource(
          sources,
          "apps/docs/src/server.ts"
        );
        expect(source).toContain(from);
        expect(
          findingInvariants(
            replaceSource(sources, "apps/docs/src/server.ts", (current) =>
              current.replace(from, to)
            )
          )
        ).toContain(invariant);
      })
  );
  test.effect(
    "rejects eager docs context acquisition and extra Worker execution",
    () =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
        const eager = replaceSource(
          sources,
          "apps/docs/src/server.ts",
          (source) =>
            source
              .replace("const context = yield* docsRuntime.contextEffect;", "")
              .replace(
                "const response = yield*",
                "const context = yield* docsRuntime.contextEffect;\nconst response = yield*"
              )
        );
        expect(findingInvariants(eager)).toContain("runtime-probe");
        const extra = replaceSource(
          sources,
          "apps/docs/src/server.ts",
          (source) => `${source}\nEffect.runPromise(Effect.void);\n`
        );
        expect(findingInvariants(extra)).toContain("runtime-owner");
      })
  );
  test.effect(
    "fails required source ownership when the inspected source is empty",
    () =>
      Effect.gen(function* () {
        const sources = yield* readGovernedSources;
        const absent = replaceSource(
          sources,
          "tools/docs-deployment/workflow-artifact.runtime.ts",
          () => ""
        );
        expect(findingInvariants(absent)).toContain(
          "workflow-artifact-boundary"
        );
      })
  );
});
