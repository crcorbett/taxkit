import { BunRuntime, BunServices } from "@effect/platform-bun";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { provideFreshArtifactStore, scopedArtifacts } from "alchemy/Artifacts";
import { makeSourceContext, resolveSource } from "alchemy/Cloudflare/Workers";
import { Effect, FileSystem, Path } from "effect";

// Only the native source builders run here. No provider, state, credentials,
// plan or apply is acquired. Build sequentially because Vite owns dist/server.
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(".");
  const output = path.join(root, ".alchemy/native-pair");
  const compatibility = { date: "2026-10-04", flags: ["nodejs_compat"] };
  yield* fs.makeDirectory(output, { recursive: true });
  yield* Effect.gen(function* () {
    const apiProps = { compatibility, main: import.meta.resolve("api/worker") };
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
    // compiler. The scoped source replacement is restored before the ordinary
    // build; no production test flag, alternate handler or protocol is added.
    yield* Effect.gen(function* nativeSettingsDefectBuild() {
      const owner = path.join(root, "apps/web/src/lib/live.server.layer.ts");
      const original = yield* Effect.acquireRelease(
        fs.readFileString(owner),
        (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
      );
      const injected = original.replace(
        /settings: Effect\.succeed\(\s*WebsitePublicSettings\.make\(\{ apiOrigin: settings\.apiOrigin \}\)\s*\)/u,
        'settings: Effect.die("PRIVATE9")'
      );
      if (injected === original) {
        return yield* Effect.die(
          "Native settings defect fixture no longer matches its source owner"
        );
      }
      yield* fs.writeFileString(owner, injected);
      const defectArtifacts = scopedArtifacts("TaxKitWebsiteSettingsDefect");
      const defectSource = yield* resolveSource(websiteProps).pipe(
        Effect.provide(defectArtifacts)
      );
      yield* defectSource
        .build(
          makeSourceContext({
            compatibility,
            dotAlchemy: output,
            fqn: "TaxKitWebsiteSettingsDefect",
            id: "TaxKitWebsiteSettingsDefect",
            props: websiteProps,
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
    }).pipe(Effect.scoped);
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
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program);
