import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Ref,
  Schema,
} from "effect";
import {
  FetchHttpClient,
  Headers,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import {
  CloudflareHostedProof,
  CloudflareHostedProofConfig,
  HostedProofSha256,
} from "./cloudflare-hosted-proof.boundary.js";
import { CloudflareHostedProofLive } from "./cloudflare-hosted-proof.live.layer.js";

const title = "Calculate Australian take-home pay";
const script = `
const main=document.querySelector("main");
main.dataset.tkHydrated="true";
main.dataset.tkNavigationInteractive="true";
window.__TSR_ROUTER__={navigate:({to})=>{main.innerHTML='<div data-testid="route-not-found">Documentation page not found</div>';return Promise.resolve()}};
document.querySelector("#reference").addEventListener("click",event=>{event.preventDefault();fetch("/_serverFn/reference").then(()=>{main.innerHTML='<h1>Reference</h1>'})});
document.querySelector("#skip").addEventListener("click",event=>{event.preventDefault();main.focus()});
document.querySelector("#mobile").addEventListener("click",event=>{event.currentTarget.setAttribute("aria-label","Close navigation")});
`;
const html = `<html><head><style>:root{background:rgb(255,255,255)}.docs-article p{color:rgb(0,0,0)}</style><script defer src="/assets/route-ABC123xy.js"></script></head><body><a id="skip" href="#docs-main">Skip to documentation</a><nav aria-label="Documentation"><a id="reference" href="/reference">Reference</a></nav><button id="mobile" aria-label="Open navigation">Menu</button><main id="docs-main" tabindex="-1"><article class="docs-article"><h1>${title}</h1><p>Controlled browser fixture.</p></article></main></body></html>`;

it.live(
  "runs the complete named proof through native HTTP and Chromium and hashes both screenshots",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const repositoryRoot = yield* path.fromFileUrl(
        new URL("../../../", import.meta.url)
      );
      const directory = yield* fs.makeTempDirectoryScoped({
        directory: path.join(repositoryRoot, "docs/evidence/deployments"),
        prefix: ".hosted-local-",
      });
      const requests = yield* Ref.make<readonly string[]>([]);
      const server = yield* HttpServer.HttpServer;
      yield* server.serve(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          yield* Ref.update(requests, (values) =>
            Array.append(values, `${request.method} ${request.url}`)
          );
          if (request.url === "/__docs-evidence__/missing") {
            return HttpServerResponse.text("Documentation page not found", {
              contentType: "text/html",
              headers: {
                "x-taxkit-docs-runtime-constructions": "1",
                "x-taxkit-docs-runtime-isolate": "controlled-isolate",
              },
              status: 404,
            });
          }
          if (request.url === "/assets/route-ABC123xy.js") {
            return HttpServerResponse.text(script, {
              contentType: "text/javascript",
              headers: {
                "cache-control": "public, max-age=31536000, immutable",
                etag: "fixture-asset",
              },
            });
          }
          if (request.url === "/_serverFn/reference") {
            const body = request.method === "POST" ? yield* request.text : "";
            const contentType = Headers.get(request.headers, "content-type");
            const malformed =
              request.method === "POST" &&
              body === "{" &&
              contentType.pipe(Option.contains("application/json"));
            return HttpServerResponse.text("fixture", {
              status: malformed ? 400 : 200,
            });
          }
          if (request.url === "/favicon.ico") {
            return HttpServerResponse.empty({ status: 204 });
          }
          return HttpServerResponse.text(html, {
            contentType: "text/html",
            headers: {
              "x-taxkit-docs-runtime-constructions": "1",
              "x-taxkit-docs-runtime-isolate": "controlled-isolate",
            },
          });
        })
      );
      const hash = yield* HostedProofSha256.makeEffect("a".repeat(64));
      const commit =
        yield* CloudflareHostedProofConfig.fields.candidateCommit.makeEffect(
          "a".repeat(40)
        );
      const config = yield* Schema.decodeEffect(CloudflareHostedProofConfig)({
        acceptedPlanSha256: hash,
        accountId: "b".repeat(32),
        candidateCommit: commit,
        configSha256: hash,
        deploymentId: "local-fixture-deployment",
        deploymentInputSha256: hash,
        environment: "preview",
        evidenceDirectory: path.relative(repositoryRoot, directory),
        hostedPropagationAttempts: 2,
        hostedPropagationDelayMs: 10,
        lockfileSha256: hash,
        origin: HttpServer.formatAddress(server.address),
        previewPrNumber: Option.some(24),
        previousVersionId: Option.none(),
        rollbackRecoveryIdentity: "local-fixture-rollback",
        stage: "pr-24",
        stateStoreId: "local-fixture-store",
        versionId: "local-fixture-version",
        workerName: "local-fixture-worker",
      });
      const proof = yield* CloudflareHostedProof;
      const observation = yield* proof.verifyHostedDeployment(config);
      expect(observation).toMatchObject({
        accessibility: { contrastRatio: 21, skipLinkFocus: true },
        assetPropagationRetries: 0,
        diagnostics: [],
        direct404: 404,
        initialSsr: 200,
        malformedServerFunctionStatus: 400,
        navigation: { documentRequestsAdded: 0, serverFunctionResponses: 1 },
        runtime: {
          firstIsolate: "controlled-isolate",
          sameObservedIsolate: true,
          secondIsolate: "controlled-isolate",
        },
      });
      expect(
        Array.map(observation.screenshots, (screenshot) => screenshot.kind)
      ).toEqual(["desktop", "mobile"]);
      yield* Effect.forEach(observation.screenshots, (screenshot) =>
        Effect.gen(function* () {
          expect(screenshot.sha256).toMatch(/^[a-f0-9]{64}$/u);
          expect(
            (yield* fs.readFile(path.join(repositoryRoot, screenshot.path)))
              .length
          ).toBeGreaterThan(100);
        })
      );
      expect(yield* Ref.get(requests)).toEqual(
        expect.arrayContaining([
          "GET /guides/calculate-australian-take-home-pay",
          "GET /__docs-evidence__/missing",
          "GET /_serverFn/reference",
          "POST /_serverFn/reference",
        ])
      );
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          BunServices.layer,
          BunHttpServer.layer({ hostname: "127.0.0.1", port: 0 }),
          CloudflareHostedProofLive.pipe(
            Layer.provide(Layer.merge(BunServices.layer, FetchHttpClient.layer))
          )
        )
      )
    ),
  15_000
);

it.effect(
  "both docs test tasks retain and hash the installed browser location",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const repositoryRoot = yield* path.fromFileUrl(
        new URL("../../../", import.meta.url)
      );
      const Task = Schema.Struct({ env: Schema.Array(Schema.String) });
      const config = yield* fs
        .readFileString(path.join(repositoryRoot, "turbo.json"))
        .pipe(
          Effect.flatMap(
            Schema.decodeEffect(
              Schema.fromJsonString(
                Schema.Struct({
                  tasks: Schema.Struct({
                    "//#test:docs-boundaries:task": Task,
                    "docs#test": Task,
                  }),
                })
              )
            )
          )
        );
      const {
        "//#test:docs-boundaries:task": rootTask,
        "docs#test": packageTask,
      } = config.tasks;
      expect(rootTask.env).toEqual(["PLAYWRIGHT_BROWSERS_PATH"]);
      expect(packageTask.env).toEqual(["PLAYWRIGHT_BROWSERS_PATH"]);
    }).pipe(Effect.provide(BunServices.layer))
);
