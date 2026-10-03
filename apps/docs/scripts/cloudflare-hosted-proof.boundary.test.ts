import { describe, expect, test } from "bun:test";

import { ConfigProvider, Effect, Fiber, Match, Result } from "effect";

import {
  HostedProofAssetPropagationError,
  runCloudflareHostedProof,
} from "./cloudflare-hosted-proof.boundary.js";
import type { CloudflareHostedProofHost } from "./cloudflare-hosted-proof.boundary.js";

type TestConfig = Readonly<Record<string, string | undefined>>;

const validConfig = {
  TAXKIT_DOCS_ACCOUNT_ID: "b".repeat(32),
  TAXKIT_DOCS_CANDIDATE_COMMIT: "a".repeat(40),
  TAXKIT_DOCS_CONFIG_SHA256: "c".repeat(64),
  TAXKIT_DOCS_DEPLOYMENT_ID: "deployment-pr-24",
  TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256: "d".repeat(64),
  TAXKIT_DOCS_ENVIRONMENT: "preview",
  TAXKIT_DOCS_EVIDENCE_DIRECTORY: "docs/evidence/deployments/preview-pr-24",
  TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS: "6",
  TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS: "2000",
  TAXKIT_DOCS_HOSTED_URL: "https://taxkit-docs-pr-24.workers.dev",
  TAXKIT_DOCS_LOCKFILE_SHA256: "e".repeat(64),
  TAXKIT_DOCS_PLAN_SHA256: "f".repeat(64),
  TAXKIT_DOCS_PREVIEW_PR_NUMBER: "24",
  TAXKIT_DOCS_PREVIOUS_VERSION_ID: "previous-version",
  TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY: "preview-42",
  TAXKIT_DOCS_STAGE: "pr-24",
  TAXKIT_DOCS_STATE_STORE_ID: "alchemy-state-store",
  TAXKIT_DOCS_VERSION_ID: "version-pr-24",
  TAXKIT_DOCS_WORKER_NAME: "taxkit-docs-pr-24",
} satisfies TestConfig;

const browser = { fixture: "browser" };
type TestBrowser = typeof browser;
interface TestHostFixture {
  readonly counts: { closed: number; launched: number; ran: number };
  readonly host: CloudflareHostedProofHost<TestBrowser>;
}

const makeHost = (
  overrides: Partial<CloudflareHostedProofHost<TestBrowser>> = {}
): TestHostFixture => {
  const counts = { closed: 0, launched: 0, ran: 0 };
  return {
    counts,
    host: {
      close: () => {
        counts.closed += 1;
        return Promise.resolve();
      },
      launch: () => {
        counts.launched += 1;
        return Promise.resolve(browser);
      },
      run: () => {
        counts.ran += 1;
        return Promise.resolve({ status: "passed" });
      },
      ...overrides,
    },
  };
};

const configured = (
  host: CloudflareHostedProofHost<TestBrowser>,
  config: TestConfig = validConfig
) =>
  runCloudflareHostedProof(host).pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(config)
    )
  );

const runResult = (
  host: CloudflareHostedProofHost<TestBrowser>,
  config: TestConfig = validConfig
) =>
  configured(host, config).pipe(
    Effect.scoped,
    Effect.result,
    Effect.runPromise
  );

const invalidInputs = [
  ["missing input", { TAXKIT_DOCS_HOSTED_URL: undefined }],
  ["empty input", { TAXKIT_DOCS_DEPLOYMENT_ID: "" }],
  [
    "malformed URL",
    { TAXKIT_DOCS_HOSTED_URL: "https://taxkit-docs-pr-24.workers.dev/path" },
  ],
  ["invalid digest", { TAXKIT_DOCS_PLAN_SHA256: "f".repeat(63) }],
  ["invalid stage", { TAXKIT_DOCS_STAGE: "pr-0" }],
  ["prefix numeric", { TAXKIT_DOCS_PREVIEW_PR_NUMBER: "24x" }],
  ["zero numeric", { TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS: "0" }],
  ["out-of-range numeric", { TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS: "21" }],
  [
    "unsafe path",
    {
      TAXKIT_DOCS_EVIDENCE_DIRECTORY:
        "docs/evidence/deployments/preview-pr-24/../secret",
    },
  ],
] as const;

describe("Cloudflare hosted proof boundary", () => {
  for (const [name, override] of invalidInputs) {
    test(`rejects ${name} before browser acquisition`, async () => {
      const { counts, host } = makeHost();
      const result = await runResult(host, { ...validConfig, ...override });

      expect(counts).toEqual({ closed: 0, launched: 0, ran: 0 });
      Result.match(result, {
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("HostedProofConfigurationError", (failure) =>
              expect(failure.requirement).toBe("environment-input")
            ),
            Match.orElse(() => expect.unreachable())
          ),
        onSuccess: () => expect.unreachable(),
      });
    });
  }

  test("rejects a mismatched environment and stage before browser acquisition", async () => {
    const { counts, host } = makeHost();
    const result = await runResult(host, {
      ...validConfig,
      TAXKIT_DOCS_ENVIRONMENT: "production",
    });

    expect(counts.launched).toBe(0);
    Result.match(result, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("HostedProofConfigurationError", (failure) =>
            expect(failure.requirement).toBe("environment-stage-identity")
          ),
          Match.orElse(() => expect.unreachable())
        ),
      onSuccess: () => expect.unreachable(),
    });
  });

  test("closes the browser after success", async () => {
    const { counts, host } = makeHost();
    const result = await runResult(host);

    expect(Result.isSuccess(result)).toBe(true);
    expect(counts).toEqual({ closed: 1, launched: 1, ran: 1 });
  });

  test("closes the browser after an expected execution failure", async () => {
    const { counts, host } = makeHost({
      run: () => {
        counts.ran += 1;
        return Promise.reject(new Error("private-upstream-value"));
      },
    });
    const result = await runResult(host);

    expect(counts.closed).toBe(1);
    Result.match(result, {
      onFailure: (error) => {
        expect(error._tag).toBe("HostedProofExecutionError");
        expect(JSON.stringify(error)).not.toContain("private-upstream-value");
      },
      onSuccess: () => expect.unreachable(),
    });
  });

  test("reports a bounded asset propagation failure without raw browser data", async () => {
    const { counts, host } = makeHost({
      run: () =>
        Promise.reject(
          new HostedProofAssetPropagationError({
            reason: "missing-script-asset",
          })
        ),
    });
    const result = await runResult(host);

    expect(counts.closed).toBe(1);
    Result.match(result, {
      onFailure: (error) => {
        expect(error._tag).toBe("HostedProofExecutionError");
        if (error._tag === "HostedProofExecutionError") {
          expect(error.operation).toBe("asset-propagation");
        }
      },
      onSuccess: () => expect.unreachable(),
    });
  });

  test("closes the browser after interruption", async () => {
    const pending = Promise.withResolvers<unknown>();
    const started = Promise.withResolvers<boolean>();
    const { counts, host } = makeHost({
      run: () => {
        counts.ran += 1;
        started.resolve(true);
        return pending.promise;
      },
    });

    await Effect.gen(function* interruptionFixture() {
      const fiber = yield* configured(host).pipe(
        Effect.scoped,
        Effect.forkChild({ startImmediately: true })
      );
      expect(yield* Effect.promise(() => started.promise)).toBe(true);
      yield* Fiber.interrupt(fiber);
    }).pipe(Effect.runPromise);

    expect(counts).toEqual({ closed: 1, launched: 1, ran: 1 });
  });

  test("keeps configuration, execution and evidence errors secret-negative", async () => {
    const secret = "private-token-value";
    const invalid = makeHost();
    const invalidResult = await runResult(invalid.host, {
      ...validConfig,
      TAXKIT_DOCS_HOSTED_URL: `https://taxkit-docs-pr-24.workers.dev/?token=${secret}`,
    });
    expect(JSON.stringify(invalidResult)).not.toContain(secret);

    const execution = makeHost({
      run: () => Promise.reject(new Error(secret)),
    });
    const executionResult = await runResult(execution.host);
    expect(JSON.stringify(executionResult)).not.toContain(secret);

    const evidence = makeHost({
      run: () => Promise.resolve({ invalid: 1n }),
    });
    const evidenceResult = await runResult(evidence.host);
    Result.match(evidenceResult, {
      onFailure: (error) => {
        expect(error._tag).toBe("HostedProofEvidenceError");
        expect(JSON.stringify(error)).not.toContain(secret);
      },
      onSuccess: () => expect.unreachable(),
    });
  });
});
