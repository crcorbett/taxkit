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
