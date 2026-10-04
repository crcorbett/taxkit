import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  Effect,
  Exit,
  HashMap,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
  FileSystem,
} from "effect";

import {
  BuiltProofError,
  BuiltProofReceipt,
  BuiltProofResult,
  BuiltScreenshotManifest,
  LocalCloudflareBuiltProof,
} from "./cloudflare-built-proof.boundary.js";
import { runCloudflareBuiltProof } from "./test-cloudflare-built.js";

const fixture = Schema.decodeEffect(BuiltProofResult)({
  receipt: {
    browser: { name: "Chromium", version: "fixture-version" },
    candidate: {
      assetsSha256: "a".repeat(64),
      deploymentInputSha256: "b".repeat(64),
      sourceCommit: "c".repeat(40),
      workerModulesSha256: "d".repeat(64),
      worktreeQualifiedBeforeCommit: true,
    },
    dependencies: {
      cloudflareVitePlugin: "fixture-plugin",
      workerd: "fixture-workerd",
      wrangler: "fixture-wrangler",
    },
    evidenceClass: "local-workerd",
    filesystem: {
      isolatedOutputOnlyExecution: true,
      nodeFileSystemModules: [
        "assets/policy-fixture.js",
        "assets/runtime.server-fixture.js",
      ],
      providerCredentialEnvironmentAllowed: false,
      requestTimePolicyImportObserved: false,
    },
    limits: {
      firstResponseRequestMs: 1,
      gzipUploadBytes: 2,
      localProcessStartToFirstResponseMs: 3,
      rawServerModuleBytes: 4,
      rawUploadBytes: 5,
      workerSizeLimitBytes: 3_145_728,
    },
    nonClaims: [
      "Local workerd does not prove a Cloudflare account, provider deployment, workers.dev URL, remote state, Preview, Production or rollback.",
      "The startup observation is local workerd evidence; provider startup validation remains required.",
    ],
    oracles: {
      accessibility: "passed",
      assetCacheHeaders: "passed",
      assets: "passed",
      clientNavigationWithoutDocumentReload: "passed",
      clientNotFound: "passed",
      concurrentRequestIsolation: "passed",
      consoleAndPageErrors: "passed",
      directNotFound: "passed",
      hydration: "passed",
      malformedServerFunction: "passed",
      mobileNavigationDisclosure: "passed",
      pendingNavigation: "passed",
      recoverableError: "passed",
      reducedMotion: "passed",
      serverFunctionTransport: "passed",
      ssr: "passed",
    },
    owner: "DCD-001 local Cloudflare built-app harness",
    runtime: {
      concurrentRequestsPassed: 9,
      observedConstructionCount: 1,
      observedDescendantCount: 4,
      observedIsolateId: "fixture-isolate",
      observedWorkerdDescendantCount: 2,
      perRequestConstructionPatternAbsent: true,
    },
    schemaVersion: 1,
    screenshots: [],
  },
  serverFunctionRequests: 3,
});

it.effect(
  "writes and reads back the checked receipt only after the closed operation releases its resources",
  () =>
    Effect.gen(function* () {
      const observation = yield* fixture;
      const closed = yield* Ref.make(false);
      const written = yield* Ref.make(HashMap.empty<string, string>());
      const fs = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.makeNoop({
          makeDirectory: () => Effect.void,
          readFileString: (path) =>
            Ref.get(written).pipe(
              Effect.map((values) =>
                HashMap.get(values, path).pipe(
                  Option.getOrElse(() => "missing fixture bytes")
                )
              )
            ),
          writeFileString: (path, value) =>
            Effect.gen(function* () {
              expect(yield* Ref.get(closed)).toBe(true);
              yield* Ref.update(written, (values) =>
                HashMap.set(values, path, value)
              );
            }),
        })
      );
      const proof = Layer.succeed(
        LocalCloudflareBuiltProof,
        LocalCloudflareBuiltProof.of({
          verifyBuiltDeployment: () =>
            Effect.acquireRelease(Effect.succeed(observation), () =>
              Ref.set(closed, true)
            ).pipe(Effect.scoped),
        })
      );
      const receipt = yield* runCloudflareBuiltProof(false).pipe(
        Effect.provide(Layer.mergeAll(BunServices.layer, fs, proof))
      );
      expect(receipt).toEqual(observation.receipt);
      const bytes = yield* Ref.get(written);
      expect(HashMap.size(bytes)).toBe(1);
      const [, saved] = yield* Effect.fromOption(
        HashMap.findFirst(bytes, () => true)
      );
      expect(
        yield* Schema.decodeEffect(Schema.fromJsonString(BuiltProofReceipt))(
          saved
        )
      ).toEqual(receipt);
    })
);

it.effect(
  "rejects an altered readback without reporting successful evidence",
  () =>
    Effect.gen(function* () {
      const observation = yield* fixture;
      const fs = Layer.succeed(
        FileSystem.FileSystem,
        FileSystem.makeNoop({
          makeDirectory: () => Effect.void,
          readFileString: () => Effect.succeed("altered fixture bytes"),
          writeFileString: () => Effect.void,
        })
      );
      const proof = Layer.succeed(
        LocalCloudflareBuiltProof,
        LocalCloudflareBuiltProof.of({
          verifyBuiltDeployment: () => Effect.succeed(observation),
        })
      );
      expect(
        yield* runCloudflareBuiltProof(false).pipe(
          Effect.provide(Layer.mergeAll(BunServices.layer, fs, proof)),
          Effect.result
        )
      ).toEqual(
        Result.fail(
          new BuiltProofError({ operation: "evidence", reason: "invariant" })
        )
      );
    })
);

it.effect(
  "rejects missing requested screenshots before acquiring the receipt filesystem",
  () =>
    Effect.gen(function* () {
      const observation = yield* fixture;
      const proof = Layer.succeed(
        LocalCloudflareBuiltProof,
        LocalCloudflareBuiltProof.of({
          verifyBuiltDeployment: () => Effect.succeed(observation),
        })
      );
      expect(
        yield* runCloudflareBuiltProof(true).pipe(
          Effect.provide(Layer.mergeAll(BunServices.layer, proof)),
          Effect.result
        )
      ).toEqual(
        Result.fail(
          new BuiltProofError({ operation: "evidence", reason: "invariant" })
        )
      );
    })
);

it.effect("retains a process failure and writes no receipt", () =>
  Effect.gen(function* () {
    const written = yield* Ref.make(0);
    const fs = Layer.succeed(
      FileSystem.FileSystem,
      FileSystem.makeNoop({
        writeFileString: () => Ref.update(written, (count) => count + 1),
      })
    );
    const error = new BuiltProofError({ operation: "build", reason: "exit" });
    const proof = Layer.succeed(
      LocalCloudflareBuiltProof,
      LocalCloudflareBuiltProof.of({
        verifyBuiltDeployment: () => Effect.fail(error),
      })
    );
    expect(
      yield* runCloudflareBuiltProof(false).pipe(
        Effect.provide(Layer.mergeAll(BunServices.layer, fs, proof)),
        Effect.result
      )
    ).toEqual(Result.fail(error));
    expect(yield* Ref.get(written)).toBe(0);
  })
);

it.effect(
  "the whole receipt rejects non-finite metrics, extra screenshots and an unrecognised success claim",
  () =>
    Effect.gen(function* () {
      const { receipt } = yield* fixture;
      expect(
        Result.isFailure(
          yield* Schema.decodeUnknownEffect(BuiltProofReceipt)({
            ...receipt,
            limits: {
              ...receipt.limits,
              gzipUploadBytes: Number.POSITIVE_INFINITY,
            },
          }).pipe(Effect.result)
        )
      ).toBe(true);
      expect(
        Result.isFailure(
          yield* Schema.decodeUnknownEffect(BuiltProofReceipt)({
            ...receipt,
            screenshots: [{}],
          }).pipe(Effect.result)
        )
      ).toBe(true);
      expect(
        Result.isFailure(
          yield* Schema.decodeUnknownEffect(BuiltProofReceipt)({
            ...receipt,
            oracles: { ...receipt.oracles, hydration: "unchecked" },
          }).pipe(Effect.result)
        )
      ).toBe(true);
      expect(
        Result.isFailure(
          yield* Schema.decodeUnknownEffect(BuiltScreenshotManifest)({
            candidate: receipt.candidate,
            evidenceClass: "hosted",
            nonClaims: [],
            schemaVersion: 1,
            screenshots: [],
          }).pipe(Effect.result)
        )
      ).toBe(true);
    })
);

it.effect("a late cleanup defect prevents receipt writes", () =>
  Effect.gen(function* () {
    const observation = yield* fixture;
    const written = yield* Ref.make(0);
    const fs = Layer.succeed(
      FileSystem.FileSystem,
      FileSystem.makeNoop({
        writeFileString: () => Ref.update(written, (count) => count + 1),
      })
    );
    const proof = Layer.succeed(
      LocalCloudflareBuiltProof,
      LocalCloudflareBuiltProof.of({
        verifyBuiltDeployment: () =>
          Effect.acquireRelease(Effect.succeed(observation), () =>
            Effect.die(
              new BuiltProofError({ operation: "cleanup", reason: "invariant" })
            )
          ).pipe(Effect.scoped),
      })
    );
    expect(
      Exit.isFailure(
        yield* runCloudflareBuiltProof(false).pipe(
          Effect.provide(Layer.mergeAll(BunServices.layer, fs, proof)),
          Effect.exit
        )
      )
    ).toBe(true);
    expect(yield* Ref.get(written)).toBe(0);
  })
);
