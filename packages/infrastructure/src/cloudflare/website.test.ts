import { readFile } from "node:fs/promises";

import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { DocsDeploymentStage } from "../stage";
import {
  decodeDocsCloudflareStackStage,
  docsWorkerAssetHeaders,
  docsWorkerObservability,
} from "./website";

const decodeDocsDeploymentStage =
  Schema.decodeUnknownEffect(DocsDeploymentStage);

describe("docs Cloudflare stack policy", () => {
  it.each(["prod", "pr-1", "pr-214"])(
    "accepts the owned deployment stage %s",
    (stage) => {
      expect(Effect.runSync(decodeDocsDeploymentStage(stage))).toBe(stage);
    }
  );

  it.each(["", "preview", "pr-0", "pr-01", "prod-2"])(
    "rejects the unowned deployment stage %s",
    (stage) => {
      expect(Effect.runSyncExit(decodeDocsDeploymentStage(stage))._tag).toBe(
        "Failure"
      );
    }
  );

  it.each(["dev_cooper", "dev_taxkit-maintainer", "dev_ci_user"])(
    "accepts the local-only stack stage %s",
    (stage) => {
      expect(Effect.runSync(decodeDocsCloudflareStackStage(stage))).toBe(stage);
      expect(Effect.runSyncExit(decodeDocsDeploymentStage(stage))._tag).toBe(
        "Failure"
      );
    }
  );

  it.each(["dev", "dev_", "dev user", "development_cooper"])(
    "rejects the invalid local stack stage %s",
    (stage) => {
      expect(
        Effect.runSyncExit(decodeDocsCloudflareStackStage(stage))._tag
      ).toBe("Failure");
    }
  );

  it("keeps built-in logs bounded and traces disabled", () => {
    expect(docsWorkerObservability).toEqual({
      enabled: true,
      headSamplingRate: 1,
      logs: {
        enabled: true,
        headSamplingRate: 1,
        invocationLogs: true,
        persist: true,
      },
      traces: {
        enabled: false,
        headSamplingRate: 0,
        persist: false,
      },
    });
  });

  it("keeps immutable asset headers in the Vite public input", async () => {
    const headers = await readFile(
      new URL("../../../../apps/docs/public/_headers", import.meta.url),
      "utf-8"
    );

    expect(headers).toBe(docsWorkerAssetHeaders);
  });
});
