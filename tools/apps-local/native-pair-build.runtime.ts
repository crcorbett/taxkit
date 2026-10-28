import {
  makeSourceContext,
  resolveSource,
} from "@alchemy.run/cloudflare/Workers";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { workerCompatibility } from "@taxkit/infrastructure/worker-settings";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { provideFreshArtifactStore, scopedArtifacts } from "alchemy/Artifacts";
import { Effect, FileSystem, Path } from "effect";

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
    // Qualify stalled calculation work using the real application entry and
    // operation. Restore the root before the ordinary API source build.
    yield* Effect.forEach(
      [
        {
          fixtureId: "TaxKitApiStalledWork",
          workerName: "taxkit-api-local-stalled-work",
        },
      ] as const,
      ({ fixtureId, workerName }) =>
        Effect.gen(function* nativeCalculationPolicyBuild() {
          const owner = path.join(root, "apps/api/src/worker.ts");
          const original = yield* Effect.acquireRelease(
            fs.readFileString(owner),
            (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
          );
          if (
            !original.includes(
              'import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";'
            ) ||
            !original.includes("Layer.provide(PublicCalculatorServiceLive)")
          ) {
            return yield* Effect.die(
              "Native stalled-work fixture no longer matches its source owner"
            );
          }
          const injected = original
            .replace(
              'import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";',
              'import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";\nimport { PublicCalculatorService } from "@taxkit/calculators/service";'
            )
            .replace(
              "Layer.provide(PublicCalculatorServiceLive)",
              `Layer.provide(Layer.effect(
            PublicCalculatorService,
            Effect.gen(function* () {
              const calculator = yield* PublicCalculatorService;
              return PublicCalculatorService.of({
                ...calculator,
                calculate: (request) => Effect.logWarning("PRIVATE9 work started").pipe(Effect.andThen(Effect.sleep("12 seconds")), Effect.andThen(calculator.calculate(request)), Effect.ensuring(Effect.logInfo("PRIVATE9 work released"))),
                getCalculatorSchema: (request) => Effect.logWarning("PRIVATE9 metadata started").pipe(Effect.andThen(Effect.sleep("12 seconds")), Effect.andThen(calculator.getCalculatorSchema(request)), Effect.ensuring(Effect.logInfo("PRIVATE9 metadata released"))),
              });
            })
          ).pipe(Layer.provide(PublicCalculatorServiceLive)))`
            );
          yield* fs.writeFileString(owner, injected);
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
            main: path.join(root, "apps/api/src/worker.ts"),
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
          return yield* Effect.void;
        }).pipe(Effect.scoped)
    );
    // The native JSON encoder returns an owned byte body. Delay either
    // headers or the remaining bytes after real encoding.
    yield* Effect.forEach(["body", "headers"] as const, (phase) =>
      Effect.gen(function* nativeStalledReplyBuild() {
        const owner = path.join(root, "apps/api/src/worker.application.ts");
        const original = yield* Effect.acquireRelease(
          fs.readFileString(owner),
          (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
        );
        const declaration =
          "  ).pipe(\n    // Every reply, including native error responses, gets one cache decision.";
        if (!original.includes(declaration)) {
          return yield* Effect.die(
            "Native stalled-reply fixture no longer matches its source owner"
          );
        }
        const reply =
          phase === "body"
            ? `response.body._tag === "Uint8Array"
            ? HttpServerResponse.stream(
                NativeFixtureStream.make(response.body.body.subarray(0, 1)).pipe(
                  NativeFixtureStream.concat(NativeFixtureStream.fromEffect(
                    Effect.logWarning("PRIVATE9 started").pipe(
                      Effect.andThen(Effect.sleep("12 seconds")),
                      Effect.as(response.body.body.subarray(1))
                    )
                  )),
                  NativeFixtureStream.ensuring(Effect.logInfo("PRIVATE9 released")),
                  NativeFixtureStream.provideContext(telemetry)
                ),
                {
                  contentType: "application/json",
                  headers: NativeFixtureHeaders.set(NativeFixtureHeaders.remove(response.headers, "content-length"), "content-encoding", "identity"),
                  status: response.status,
                }
              )
            : response`
            : `response`;
        const operation =
          phase === "body"
            ? `Effect.map((response) => ${reply})`
            : `Effect.flatMap((response) => Effect.logWarning("PRIVATE9 headers").pipe(
              Effect.andThen(Effect.sleep("12 seconds")),
              Effect.as(response),
              Effect.provideContext(telemetry)
            ))`;
        const injected = original.replace(
          declaration,
          `  ).pipe(${operation},\n    // Every reply, including native error responses, gets one cache decision.`
        );
        // This artificial stream owns its imports; product HTTP composition
        // needs neither Stream nor Headers.
        if (
          phase === "body" &&
          (original.includes("NativeFixtureStream") ||
            original.includes("NativeFixtureHeaders"))
        ) {
          return yield* Effect.die(
            "Native stalled-body fixture import collides with its source owner"
          );
        }
        yield* fs.writeFileString(
          owner,
          phase === "body"
            ? `import * as NativeFixtureStream from "effect/Stream";\nimport { Headers as NativeFixtureHeaders } from "effect/http";\n${injected}`
            : injected
        );
        const fixtureId =
          phase === "body" ? "TaxKitApiStalledBody" : "TaxKitApiStalledHeaders";
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
          main: path.join(root, "apps/api/src/worker.ts"),
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
              stack: { name: "TaxKitAppsLocalProof", stage: "dev_native_pair" },
              workerName: `taxkit-api-local-stalled-${phase}`,
            })
          )
          .pipe(Effect.provide(artifacts));
        return yield* Effect.void;
      }).pipe(Effect.scoped)
    );
    // Qualify an API that answers with another page's identity through a real
    // native ContentService reply. The replacement is scoped and restored
    // before the ordinary build; no product test mode or request flag is
    // introduced.
    yield* Effect.forEach(["Address"] as const, (mode) =>
      Effect.gen(function* nativeDocsPresentationFixtureBuild() {
        const owner = path.join(root, "apps/api/src/worker.ts");
        const original = yield* Effect.acquireRelease(
          fs.readFileString(owner),
          (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
        );
        const declaration = "  ApiContentLive,";
        if (!original.includes(declaration)) {
          return yield* Effect.die(
            "Native docs presentation fixture no longer matches its source owner"
          );
        }
        const replacement =
          'DocsPublicPage.make({ ...page, path: DocsPublicPagePath.make("/private9"), slugs: [DocsPageSlug.make("private9")], source: DocsSourcePath.make("private9.mdx") })';
        const injected = original
          .replace(
            'import { ApiContentLive } from "./content.boundary.js";',
            'import { ApiContentLive } from "./content.boundary.js";\nimport { ContentService } from "@taxkit/content/service";\nimport { DocsPublicPage, DocsPublicPagePath, DocsPageSlug, DocsSourcePath } from "@taxkit/content/schemas";'
          )
          .replace(
            declaration,
            `Layer.effect(ContentService, Effect.gen(function* () {
          const content = yield* ContentService;
          return ContentService.of({ ...content,
            getPage: (path) => content.getPage(path).pipe(Effect.map((page) => ${replacement})),
          });
        })).pipe(Layer.provideMerge(ApiContentLive)),`
          );
        yield* fs.writeFileString(owner, injected);
        const fixtureId = `TaxKitApiDocs${mode}`;
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
          main: path.join(root, "apps/api/src/worker.ts"),
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
              workerName: `taxkit-api-local-docs-${mode.toLowerCase()}`,
            })
          )
          .pipe(Effect.provide(artifacts));
        return yield* Effect.void;
      }).pipe(Effect.scoped)
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
    // compiler. The scoped source replacement is restored before the ordinary
    // build; no production test flag, alternate handler or protocol is added.
    yield* Effect.gen(function* nativeSettingsDefectBuild() {
      const owner = path.join(root, "apps/web/src/lib/pages/root.load.ts");
      const original = yield* Effect.acquireRelease(
        fs.readFileString(owner),
        (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
      );
      const injected = original.replace(
        "  const settings = yield* Effect.fromResult(host.settings);",
        '  const settings = yield* Effect.die("PRIVATE9");'
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
      return yield* Effect.void;
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
