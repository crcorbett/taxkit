import * as BunServices from "@effect/platform-bun/BunServices";
import { ConfigProvider, Effect, Match, Result } from "effect";
import type { Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import { describe, expect, test } from "vitest";

import { readWorkflowSha256 } from "./workflow-check.boundary.js";
import { checkWorkflowInput } from "./workflow-input-check.runtime.js";

const candidateCommit = "a".repeat(40);
const workflowCommit = "b".repeat(40);
const workflowRunId = "42";
const workflowPath = ".github/workflows/docs-preview.yml";
type TestConfig = Readonly<Record<string, string | undefined>>;

const runInputCheck = (
  receipt: typeof Schema.Unknown.Type,
  configOverrides: TestConfig = {}
) =>
  Effect.gen(function* runInputCheckFixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-workflow-check-",
    });
    const receiptPath = `${directory}/workflow-input.json`;
    yield* fileSystem.writeFileString(receiptPath, JSON.stringify(receipt));
    const configProvider = ConfigProvider.fromUnknown({
      TAXKIT_WORKFLOW_INPUT_CANDIDATE_COMMIT: candidateCommit,
      TAXKIT_WORKFLOW_INPUT_OPERATION: "deploy",
      TAXKIT_WORKFLOW_INPUT_PR_NUMBER: "24",
      TAXKIT_WORKFLOW_INPUT_RECEIPT: receiptPath,
      TAXKIT_WORKFLOW_INPUT_RUN_ID: workflowRunId,
      TAXKIT_WORKFLOW_INPUT_WORKFLOW_COMMIT: workflowCommit,
      TAXKIT_WORKFLOW_INPUT_WORKFLOW_PATH: workflowPath,
      ...configOverrides,
    });

    return yield* checkWorkflowInput.pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, configProvider),
      Effect.result
    );
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer), Effect.runPromise);

const validReceipt = {
  candidateCommit,
  operation: "deploy",
  prNumber: 24,
  sourceRef: "refs/heads/main",
  workflowCommit,
  workflowName: "Docs Preview",
  workflowPath,
  workflowRunId,
};

describe("workflow check boundary", () => {
  test("accepts a Schema-owned Config and exact receipt", async () => {
    const result = await runInputCheck(validReceipt);
    expect(Result.isSuccess(result)).toBe(true);
  });

  test("rejects an excess receipt property at JSON ingress", async () => {
    const result = await runInputCheck({
      ...validReceipt,
      secret: "forbidden",
    });
    Result.match(result, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("WorkflowCheckInputError", (failure) => {
            expect(failure.check).toBe("workflow-input");
            expect(failure.target).toBe("input-receipt");
          }),
          Match.orElse(() => expect.unreachable())
        ),
      onSuccess: () => expect.unreachable(),
    });
  });

  test("distinguishes a typed identity mismatch from malformed input", async () => {
    const result = await runInputCheck({
      ...validReceipt,
      candidateCommit: "c".repeat(40),
    });
    Result.match(result, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("WorkflowCheckMismatchError", (failure) => {
            expect(failure.invariant).toBe("source-run-operation-candidate");
          }),
          Match.orElse(() => expect.unreachable())
        ),
      onSuccess: () => expect.unreachable(),
    });
  });

  test("maps missing Config to a safe input error", async () => {
    const result = await runInputCheck(validReceipt, {
      TAXKIT_WORKFLOW_INPUT_CANDIDATE_COMMIT: undefined,
    });
    Result.match(result, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("WorkflowCheckInputError", (failure) => {
            expect(failure.target).toBe("environment");
          }),
          Match.orElse(() => expect.unreachable())
        ),
      onSuccess: () => expect.unreachable(),
    });
  });

  test("hashes screenshot bytes through Effect Crypto and maps missing bytes", async () => {
    const [digest, missing] = await Effect.gen(function* screenshotFixture() {
      const fileSystem = yield* FileSystem.FileSystem;
      const directory = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-workflow-screenshot-",
      });
      const screenshotPath = `${directory}/desktop.png`;
      yield* fileSystem.writeFileString(screenshotPath, "abc");

      return yield* Effect.all([
        readWorkflowSha256(
          "workflow-proof",
          screenshotPath,
          "screenshot-desktop"
        ),
        readWorkflowSha256(
          "workflow-proof",
          `${directory}/missing.png`,
          "screenshot-mobile"
        ).pipe(Effect.result),
      ]);
    }).pipe(
      Effect.scoped,
      Effect.provide(BunServices.layer),
      Effect.runPromise
    );

    expect(digest).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    Result.match(missing, {
      onFailure: (error) => {
        expect(error.check).toBe("workflow-proof");
        expect(error.operation).toBe("read-screenshot-mobile");
      },
      onSuccess: () => expect.unreachable(),
    });
  });
});
