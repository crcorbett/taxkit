import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Console,
  Effect,
  FileSystem,
  Layer,
  Match,
  Path,
  Schema,
} from "effect";
import { Command, Flag } from "effect/cli";
import { FetchHttpClient } from "effect/http";

import {
  BuiltProofError,
  BuiltProofReceipt,
  BuiltScreenshotManifest,
  LocalCloudflareBuiltProof,
} from "./cloudflare-built-proof.boundary.js";
import { LocalCloudflareBuiltProofLive } from "./cloudflare-built-proof.live.layer.js";

export const runCloudflareBuiltProof = (captureScreenshots: boolean) =>
  Effect.gen(function* () {
    const proof = yield* LocalCloudflareBuiltProof;
    // The closed operation finishes all scoped process/browser cleanup before
    // an observation is written or the human success summary is printed.
    const result = yield* proof.verifyBuiltDeployment({ captureScreenshots });
    const { receipt } = result;
    if (receipt.screenshots.length !== (captureScreenshots ? 2 : 0)) {
      return yield* new BuiltProofError({
        operation: "evidence",
        reason: "invariant",
      });
    }
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const repositoryRoot = yield* path.fromFileUrl(
      new URL("../../../", import.meta.url)
    );
    const receiptRoot = path.join(repositoryRoot, "tmp/docs-cloudflare");
    const json = yield* Schema.encodeEffect(
      Schema.fromJsonString(BuiltProofReceipt, { space: 2 })
    )(receipt);
    yield* fs.makeDirectory(receiptRoot, { recursive: true });
    const receiptPath = path.join(receiptRoot, "local-workerd-receipt.json");
    yield* fs.writeFileString(receiptPath, `${json}\n`);
    const saved = yield* fs.readFileString(receiptPath);
    if (saved !== `${json}\n`) {
      return yield* new BuiltProofError({
        operation: "evidence",
        reason: "invariant",
      });
    }
    if (captureScreenshots) {
      const manifest = yield* Schema.encodeEffect(
        Schema.fromJsonString(BuiltScreenshotManifest, { space: 2 })
      )({
        candidate: {
          assetsSha256: receipt.candidate.assetsSha256,
          deploymentInputSha256: receipt.candidate.deploymentInputSha256,
          sourceCommit: receipt.candidate.sourceCommit,
          workerModulesSha256: receipt.candidate.workerModulesSha256,
        },
        evidenceClass: "local-workerd-visual-review-input",
        nonClaims: [
          "Screenshots supplement behavioral assertions and do not prove request type, focus behavior, contrast, reduced motion, HTTP status, hydration, console cleanliness or hosted behavior.",
        ],
        schemaVersion: 1,
        screenshots: receipt.screenshots,
      });
      const manifestPath = path.join(receiptRoot, "screenshot-manifest.json");
      yield* fs.writeFileString(manifestPath, `${manifest}\n`);
      if ((yield* fs.readFileString(manifestPath)) !== `${manifest}\n`) {
        return yield* new BuiltProofError({
          operation: "evidence",
          reason: "invariant",
        });
      }
    }
    yield* Console.log(
      `Cloudflare docs proof passed: SSR=200, asset=200/immutable, missing=404, clientNavigationDocuments=0, serverFunctions=${result.serverFunctionRequests}, diagnostics=0, gzipUploadKiB=${(receipt.limits.gzipUploadBytes / 1024).toFixed(2)}, processStartToFirstResponseMs=${receipt.limits.localProcessStartToFirstResponseMs.toFixed(2)}, firstResponseRequestMs=${receipt.limits.firstResponseRequestMs.toFixed(2)}.`
    );
    return receipt;
  }).pipe(
    Effect.mapError((error) =>
      Match.value(error).pipe(
        Match.tag("BuiltProofError", (value) => value),
        Match.orElse(
          () =>
            new BuiltProofError({
              operation: "evidence",
              reason: "start-or-read",
            })
        )
      )
    )
  );

const command = Command.make(
  "test-cloudflare-built",
  {
    screenshots: Flag.Boolean("screenshots").pipe(Flag.withDefault(false)),
  },
  ({ screenshots }) => runCloudflareBuiltProof(screenshots)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(
      Command.run(command, {
        renderErrors: false,
        version: "repository-local",
      }).pipe(
        Effect.tapErrorTag("BuiltProofError", (error) =>
          Console.error(
            `FAIL [built-proof] operation=${error.operation} reason=${error.reason}`
          )
        ),
        Effect.scoped,
        Effect.provide(
          Layer.mergeAll(
            BunServices.layer,
            LocalCloudflareBuiltProofLive.pipe(
              Layer.provide(
                Layer.merge(BunServices.layer, FetchHttpClient.layer)
              )
            )
          )
        )
      ),
      { disableErrorReporting: true }
    )
  ),
  Match.orElse(() => false)
);
