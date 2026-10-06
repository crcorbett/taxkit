import { BunRuntime, BunServices } from "@effect/platform-bun";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { provideFreshArtifactStore, scopedArtifacts } from "alchemy/Artifacts";
import { makeSourceContext, resolveSource } from "alchemy/Cloudflare/Workers";
import { Effect, FileSystem, Match, Path } from "effect";

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
    // Qualify native fatal RPC replies using the real application entry and
    // operation. Restore the root before the ordinary API source build.
    yield* Effect.forEach(["defect", "stalled-work"] as const, (mode) =>
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
            "Native RPC defect fixture no longer matches its source owner"
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
                calculate: (request) => ${
                  mode === "defect"
                    ? 'calculator.calculate(request).pipe(Effect.andThen(Effect.die("PRIVATE9")))'
                    : 'Effect.logWarning("PRIVATE9 work started").pipe(Effect.andThen(Effect.sleep("12 seconds")), Effect.andThen(calculator.calculate(request)), Effect.ensuring(Effect.logInfo("PRIVATE9 work released")))'
                },
                ${mode === "stalled-work" ? 'getCalculatorSchema: (request) => Effect.logWarning("PRIVATE9 metadata started").pipe(Effect.andThen(Effect.sleep("12 seconds")), Effect.andThen(calculator.getCalculatorSchema(request)), Effect.ensuring(Effect.logInfo("PRIVATE9 metadata released"))),' : ""}
              });
            })
          ).pipe(Layer.provide(PublicCalculatorServiceLive)))`
          );
        yield* fs.writeFileString(owner, injected);
        const fixtureId =
          mode === "defect" ? "TaxKitApiRpcDefect" : "TaxKitApiStalledWork";
        yield* fs.remove(path.join(output, "bundles", fixtureId), {
          force: true,
          recursive: true,
        });
        const props = {
          compatibility,
          main: import.meta.resolve("api/worker"),
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
              workerName:
                mode === "defect"
                  ? "taxkit-api-local-rpc-defect"
                  : "taxkit-api-local-stalled-work",
            })
          )
          .pipe(Effect.provide(artifacts));
      }).pipe(Effect.scoped)
    );
    // Corrupt one field in the actual native encoded reply. The native message
    // framing and server remain intact; this qualifies the client's decoder.
    yield* Effect.gen(function* nativeInvalidReplyBuild() {
      const owner = path.join(root, "apps/api/src/worker.application.ts");
      const original = yield* Effect.acquireRelease(
        fs.readFileString(owner),
        (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
      );
      const declaration = ").pipe(Effect.provideContext(telemetry));";
      if (!original.includes(declaration)) {
        return yield* Effect.die(
          "Native invalid-reply fixture no longer matches its source owner"
        );
      }
      const injected = original
        .replace(
          declaration,
          `).pipe(
          Effect.provideContext(telemetry),
          Effect.flatMap((response) =>
            Effect.promise(() => HttpServerResponse.toWeb(response).text()).pipe(
              Effect.map((text) => HttpServerResponse.text(
                text.replace('"netPay":', '"PRIVATE9":'),
                {
                  contentType: "application/json",
                  headers: Headers.remove(response.headers, "content-length"),
                  status: response.status,
                }
              ))
            )
          )
        );`
        )
        .replace("HttpClientRequest,", "Headers, HttpClientRequest,");
      yield* fs.writeFileString(owner, injected);
      const fixtureId = "TaxKitApiInvalidReply";
      yield* fs.remove(path.join(output, "bundles", fixtureId), {
        force: true,
        recursive: true,
      });
      const props = { compatibility, main: import.meta.resolve("api/worker") };
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
            workerName: "taxkit-api-local-invalid-reply",
          })
        )
        .pipe(Effect.provide(artifacts));
    }).pipe(Effect.scoped);
    // The native JSON RPC encoder returns an owned byte body. Delay either
    // headers or the remaining bytes after real encoding; keep its framing.
    yield* Effect.forEach(["body", "headers"] as const, (phase) =>
      Effect.gen(function* nativeStalledReplyBuild() {
        const owner = path.join(root, "apps/api/src/worker.application.ts");
        const original = yield* Effect.acquireRelease(
          fs.readFileString(owner),
          (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
        );
        const declaration = ").pipe(Effect.provideContext(telemetry));";
        const imports = "HttpClientRequest,";
        if (!original.includes(declaration) || !original.includes(imports)) {
          return yield* Effect.die(
            "Native stalled-reply fixture no longer matches its source owner"
          );
        }
        const reply =
          phase === "body"
            ? `response.body._tag === "Uint8Array"
            ? HttpServerResponse.stream(
                Stream.make(response.body.body.subarray(0, 1)).pipe(
                  Stream.concat(Stream.fromEffect(
                    Effect.logWarning("PRIVATE9 started").pipe(
                      Effect.andThen(Effect.sleep("12 seconds")),
                      Effect.as(response.body.body.subarray(1))
                    )
                  )),
                  Stream.ensuring(Effect.logInfo("PRIVATE9 released")),
                  Stream.provideContext(telemetry)
                ),
                {
                  contentType: "application/json",
                  headers: Headers.set(Headers.remove(response.headers, "content-length"), "content-encoding", "identity"),
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
        const injected = original
          .replace(imports, "Headers, HttpClientRequest,")
          .replace(
            declaration,
            `).pipe(Effect.provideContext(telemetry), ${operation});`
          );
        yield* fs.writeFileString(owner, injected);
        const fixtureId =
          phase === "body" ? "TaxKitApiStalledBody" : "TaxKitApiStalledHeaders";
        yield* fs.remove(path.join(output, "bundles", fixtureId), {
          force: true,
          recursive: true,
        });
        const props = {
          compatibility,
          main: import.meta.resolve("api/worker"),
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
      }).pipe(Effect.scoped)
    );
    // Qualify mismatched API/presentation activations through real native
    // ContentService replies. Each replacement is scoped and restored before
    // the ordinary build; no product test mode or request flag is introduced.
    yield* Effect.forEach(
      ["Body", "Metadata", "MissingModule"] as const,
      (mode) =>
        Effect.gen(function* nativeDocsPresentationFixtureBuild() {
          const owner = path.join(root, "apps/api/src/worker.ts");
          const original = yield* Effect.acquireRelease(
            fs.readFileString(owner),
            (saved) => fs.writeFileString(owner, saved).pipe(Effect.orDie)
          );
          const declaration = "Effect.provide(ApiContentLive),";
          if (!original.includes(declaration)) {
            return yield* Effect.die(
              "Native docs presentation fixture no longer matches its source owner"
            );
          }
          const replacement = Match.value(mode).pipe(
            Match.when(
              "Body",
              () => '({ ...page, markdown: page.markdown + "\\n\\nPRIVATE9" })'
            ),
            Match.when(
              "Metadata",
              () =>
                '({ ...page, frontmatter: { ...page.frontmatter, title: "PRIVATE9" } })'
            ),
            Match.orElse(
              () =>
                'DocsPublicPage.make({ ...page, path: DocsPublicPagePath.make("/private9"), slugs: [DocsPageSlug.make("private9")], source: DocsSourcePath.make("content/private9.mdx") })'
            )
          );
          const injected = original
            .replace(
              'import { ApiContentLive } from "./content.boundary.js";',
              'import { ApiContentLive } from "./content.boundary.js";\nimport { ContentService } from "@taxkit/content/service";\nimport { DocsPublicPage, DocsPublicPagePath, DocsPageSlug, DocsSourcePath } from "@taxkit/content/schemas";'
            )
            .replace(
              declaration,
              `Effect.provide(Layer.effect(ContentService, Effect.gen(function* () {
          const content = yield* ContentService;
          return ContentService.of({ ...content,
            getPage: (path) => content.getPage(path).pipe(Effect.map((page) => ${replacement})),
          });
        })).pipe(Layer.provide(ApiContentLive))),`
            );
          yield* fs.writeFileString(owner, injected);
          const fixtureId = `TaxKitApiDocs${mode}`;
          yield* fs.remove(path.join(output, "bundles", fixtureId), {
            force: true,
            recursive: true,
          });
          const props = {
            compatibility,
            main: import.meta.resolve("api/worker"),
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
        }).pipe(Effect.scoped)
    );
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
        /settings: Effect\.succeed\(\s*WebsitePublicSettings\.make\(\{\s*apiOrigin: settings\.apiOrigin,\s*websiteOrigin: settings\.websiteOrigin,?\s*\}\)\s*\)/u,
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
