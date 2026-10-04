import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import type { MemoOptions } from "alchemy/Command/Memo";
import { Array, Effect, Exit, FileSystem, Path, Schema } from "effect";

import { DocsDeploymentStage } from "../stage.js";
import {
  decodeDocsCloudflareStackStage,
  docsWorkerAssetHeaders,
  docsWorkerMemo,
  docsWorkerObservability,
} from "./website.js";

const decodeDocsDeploymentStage =
  Schema.decodeUnknownEffect(DocsDeploymentStage);

describe("docs Cloudflare stack policy", () => {
  it.effect("requires copying readonly memo arrays at Alchemy input", () =>
    Effect.gen(function* () {
      // @ts-expect-error The provider's include field requires a fresh writable array.
      const mutableInclude: MemoOptions["include"] = docsWorkerMemo.include;
      const workspace = yield* Effect.fromOption(
        Array.head(docsWorkerMemo.workspaces)
      );
      // @ts-expect-error Nested workspace arrays also require a fresh boundary copy.
      const mutableWorkspaceInclude: MemoOptions["include"] = workspace.include;
      expect(mutableInclude).toBe(docsWorkerMemo.include);
      expect(mutableWorkspaceInclude).toBe(workspace.include);
    })
  );
  it.effect.each(["prod", "pr-1", "pr-214"])(
    "accepts the owned deployment stage %s",
    (stage) =>
      Effect.gen(function* () {
        expect(yield* decodeDocsDeploymentStage(stage)).toBe(stage);
      })
  );

  it.effect.each(["", "preview", "pr-0", "pr-01", "prod-2"])(
    "rejects the unowned deployment stage %s",
    (stage) =>
      Effect.gen(function* () {
        expect(
          Exit.isFailure(yield* Effect.exit(decodeDocsDeploymentStage(stage)))
        ).toBe(true);
      })
  );

  it.effect.each(["dev_cooper", "dev_taxkit-maintainer", "dev_ci_user"])(
    "accepts the local-only stack stage %s",
    (stage) =>
      Effect.gen(function* () {
        expect(yield* decodeDocsCloudflareStackStage(stage)).toBe(stage);
        expect(
          Exit.isFailure(yield* Effect.exit(decodeDocsDeploymentStage(stage)))
        ).toBe(true);
      })
  );

  it.effect.each(["dev", "dev_", "dev user", "development_cooper"])(
    "rejects the invalid local stack stage %s",
    (stage) =>
      Effect.gen(function* () {
        expect(
          Exit.isFailure(
            yield* Effect.exit(decodeDocsCloudflareStackStage(stage))
          )
        ).toBe(true);
      })
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

  it.effect("keeps immutable asset headers in the Vite public input", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const headersPath = yield* path.fromFileUrl(
        new URL("../../../../apps/docs/public/_headers", import.meta.url)
      );
      expect(yield* fs.readFileString(headersPath)).toBe(
        docsWorkerAssetHeaders
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
});
