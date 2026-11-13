import {
  makeSourceContext,
  resolveSource,
} from "@alchemy.run/cloudflare/Workers";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { workerCompatibility } from "@taxkit/infrastructure/worker-settings";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { provideFreshArtifactStore, scopedArtifacts } from "alchemy/Artifacts";
import {
  Effect,
  FileSystem,
  Layer,
  Path,
  Function as EffectFunction,
} from "effect";
import { Digest, SecureRandom } from "effect/crypto";

import { nativeApiSourceProps } from "./native-api-source.boundary.js";
// SDK declaration discovery is memory-only with all external operations
// refused. Build sequentially because Vite owns dist/server and source fixtures.
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(".");
  const output = path.join(root, ".alchemy/native-pair");
  const compatibility = workerCompatibility;
  // Start from empty bundles so the suites never read an earlier build's files.
  yield* fs.remove(path.join(output, "bundles"), {
    force: true,
    recursive: true,
  });
  yield* fs.makeDirectory(output, { recursive: true });
  yield* Effect.gen(function* () {
    const apiDeclaration = yield* nativeApiSourceProps;
    // Each fixture is its own Worker entry module: the real API composition
    // seam over replaced Layers. No product source is edited for a build.
    yield* EffectFunction.pipe(
      [
        {
          entry: "api-stalled-work.worker.ts",
          fixtureId: "TaxKitApiStalledWork",
          workerName: "taxkit-api-local-stalled-work",
        },
        {
          entry: "api-stalled-body.worker.ts",
          fixtureId: "TaxKitApiStalledBody",
          workerName: "taxkit-api-local-stalled-body",
        },
        {
          entry: "api-stalled-headers.worker.ts",
          fixtureId: "TaxKitApiStalledHeaders",
          workerName: "taxkit-api-local-stalled-headers",
        },
        {
          entry: "api-docs-address.worker.ts",
          fixtureId: "TaxKitApiDocsAddress",
          workerName: "taxkit-api-local-docs-address",
        },
      ] as const,
      Effect.forEach(({ entry, fixtureId, workerName }) =>
        Effect.gen(function* nativeApiFixtureBuild() {
          yield* fs.remove(path.join(output, "bundles", fixtureId), {
            force: true,
            recursive: true,
          });
          const props = {
            ...apiDeclaration,
            build: {
              output: {
                dir: path.join(output, "bundles", fixtureId),
                entryFileNames: "worker.js",
              },
            },
            compatibility,
            main: path.join(root, "tools/apps-local/fixtures", entry),
          };
          const artifacts = scopedArtifacts(fixtureId);
          const source = yield* resolveSource(props).pipe(
            Effect.provide(artifacts)
          );
          yield* source
            .build(
              makeSourceContext({
                compatibility,
                dotAlchemy: output,
                fqn: fixtureId,
                id: fixtureId,
                props,
                stack: {
                  name: "TaxKitAppsLocalProof",
                  stage: "dev_native_pair",
                },
                workerName,
              })
            )
            .pipe(Effect.provide(artifacts));
        })
      )
    );
    const apiProps = {
      ...apiDeclaration,
      build: {
        output: {
          dir: path.join(output, "bundles", "TaxKitApi"),
          entryFileNames: "worker.js",
        },
      },
      compatibility,
      main: path.join(root, "apps/api/src/worker.ts"),
    };
    const apiArtifacts = scopedArtifacts("TaxKitApi");
    const apiSource = yield* resolveSource(apiProps).pipe(
      Effect.provide(apiArtifacts)
    );
    yield* apiSource
      .build(
        makeSourceContext({
          compatibility,
          dotAlchemy: output,
          fqn: "TaxKitApi",
          id: "TaxKitApi",
          props: apiProps,
          stack: { name: "TaxKitAppsLocalProof", stage: "dev_native_pair" },
          workerName: "taxkit-api-local-candidate",
        })
      )
      .pipe(Effect.provide(apiArtifacts));
    const websiteProps = { compatibility, vite: { rootDir: "apps/web" } };
    // Build one controlled internal settings defect through the same native
    // compiler. The fixture's Vite root reuses the Website's own configuration
    // and resolves its settings Layer module to a fixture Layer; no product
    // source, test flag, alternate handler or protocol is added.
    yield* Effect.gen(function* nativeSettingsDefectBuild() {
      const defectProps = {
        compatibility,
        vite: { rootDir: "apps/web/test/fixtures/settings-defect" },
      };
      const defectArtifacts = scopedArtifacts("TaxKitWebsiteSettingsDefect");
      const defectSource = yield* resolveSource(defectProps).pipe(
        Effect.provide(defectArtifacts)
      );
      yield* defectSource
        .build(
          makeSourceContext({
            compatibility,
            dotAlchemy: output,
            fqn: "TaxKitWebsiteSettingsDefect",
            id: "TaxKitWebsiteSettingsDefect",
            props: defectProps,
            stack: { name: "TaxKitAppsLocalProof", stage: "dev_native_pair" },
            workerName: "taxkit-website-local-settings-defect",
          })
        )
        .pipe(Effect.provide(defectArtifacts));
      const defectOutput = path.join(output, "settings-defect");
      // This exact ignored fixture output is command-owned. Fresh modules keep
      // an older unreachable defect chunk from satisfying the artifact oracle.
      yield* fs.remove(defectOutput, { force: true, recursive: true });
      yield* fs.makeDirectory(defectOutput, { recursive: true });
      yield* fs.copy(
        path.join(root, "apps/web/dist/server"),
        path.join(defectOutput, "server"),
        { overwrite: true }
      );
    });
    const websiteArtifacts = scopedArtifacts("TaxKitWebsite");
    const websiteSource = yield* resolveSource(websiteProps).pipe(
      Effect.provide(websiteArtifacts)
    );
    yield* websiteSource
      .build(
        makeSourceContext({
          compatibility,
          dotAlchemy: output,
          fqn: "TaxKitWebsite",
          id: "TaxKitWebsite",
          props: websiteProps,
          stack: { name: "TaxKitAppsLocalProof", stage: "dev_native_pair" },
          workerName: "taxkit-website-local-candidate",
        })
      )
      .pipe(Effect.provide(websiteArtifacts));
  }).pipe(
    Effect.provideService(AlchemyContext, {
      adopt: false,
      dev: false,
      dotAlchemy: output,
    })
  );
}).pipe(
  provideFreshArtifactStore,
  Effect.scoped,
  Effect.provide(
    Layer.mergeAll(
      BunServices.layer,
      SecureRandom.layerWebCrypto,
      Digest.layerWebCrypto
    )
  )
);
BunRuntime.runMain(program);
