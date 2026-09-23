import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { docsCloudflareStackName } from "@taxkit/infrastructure/website";
import { AlchemyContextLive, AuthProviders } from "alchemy";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { credentialsFilePath } from "alchemy/Auth/Credentials";
import { LoggingCli } from "alchemy/Cli/LoggingCli";
import * as Cloudflare from "alchemy/Cloudflare";
import { Stack } from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { makeHttpStateStore, State } from "alchemy/State";
import {
  Config,
  Console,
  Effect,
  Layer,
  Match,
  Option,
  Redacted,
  Schema,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import {
  readDocsDeploymentStateStoreCredentials,
  requireDocsDeploymentStateStoreAccount,
} from "./inventory-credentials.boundary.js";
import type { DocsDeploymentStateStoreCredentials } from "./inventory.schemas.js";
import {
  DocsDeploymentInventoryInputError,
  DocsDeploymentInventoryReport,
} from "./inventory.schemas.js";
import {
  DocsDeploymentInventory,
  DocsDeploymentInventoryLive,
} from "./inventory.service.js";

const InventoryRuntimeConfig = Config.unwrap({
  ci: Config.schema(Schema.Literals(["1", "true"]), "CI"),
  profile: Config.string("ALCHEMY_PROFILE").pipe(Config.withDefault("default")),
  reportPath: Config.string("TAXKIT_DOCS_DEPLOYMENT_INVENTORY_REPORT").pipe(
    Config.option
  ),
  stateCredentialsJson: Config.redacted(
    "ALCHEMY_STATE_STORE_CREDENTIALS_JSON"
  ).pipe(Config.option),
});

const deploymentStack = {
  actions: {},
  bindings: {},
  name: docsCloudflareStackName,
  resources: {},
  stage: "prod",
};

const platformLayer = Layer.mergeAll(
  BunServices.layer,
  FetchHttpClient.layer,
  LoggingCli,
  Layer.succeed(AuthProviders, {}),
  Layer.succeed(ArtifactStore, createArtifactStore()),
  Layer.succeed(Stack, deploymentStack),
  Layer.succeed(Stage, "prod")
);
const runtimeLayer = Layer.merge(
  platformLayer,
  AlchemyContextLive.pipe(Layer.provide(platformLayer))
);
const cloudflareApiLayer = Cloudflare.CloudflareApiLive().pipe(
  Layer.provideMerge(runtimeLayer)
);
// `Cloudflare.state()` builds its own Cloudflare API layer and may refresh or
// delete cached credentials. The report-only path decodes its account-matched
// cache (or the same protected JSON credential when a nested process cannot
// see that cache) once, then uses Alchemy's public HTTP State service directly;
// this keeps the inventory read-only and leaves mutation/bootstrap ownership
// with the deployment workflows.
const makeReadOnlyStateLayer = (
  credentials: DocsDeploymentStateStoreCredentials
) =>
  Layer.effect(
    State,
    Effect.succeed(
      makeHttpStateStore({
        authToken: Redacted.value(credentials.authToken),
        id: "cloudflare-http",
        url: credentials.url.toString(),
      }).pipe(Effect.provide(FetchHttpClient.layer))
    )
  );

const makeInventoryLayer = (credentials: DocsDeploymentStateStoreCredentials) =>
  Layer.merge(
    DocsDeploymentInventoryLive,
    Layer.merge(
      makeReadOnlyStateLayer(credentials),
      Cloudflare.Workers.LiveWorkerProvider().pipe(
        Layer.provideMerge(cloudflareApiLayer)
      )
    )
  );

const readInventoryProgram = (reportPath: Option.Option<string>) =>
  Effect.gen(function* readInventory() {
    const inventory = yield* DocsDeploymentInventory;
    const report = yield* inventory.read();
    const encoded = yield* Schema.encodeUnknownEffect(
      DocsDeploymentInventoryReport
    )(report);
    const output = `${JSON.stringify(encoded, null, 2)}\n`;
    yield* Option.match(reportPath, {
      onNone: () => Console.log(output.trimEnd()),
      onSome: (path) =>
        FileSystem.FileSystem.pipe(
          Effect.flatMap((fileSystem) =>
            fileSystem.writeFileString(path, output)
          )
        ),
    });
  });

const program = Effect.gen(function* inventoryProgram() {
  const config = yield* InventoryRuntimeConfig.pipe(
    Effect.mapError(
      () => new DocsDeploymentInventoryInputError({ target: "CI=1" })
    )
  );
  const currentEnvironment = yield* Effect.flatten(
    Cloudflare.CloudflareEnvironment
  );
  const decodedStateCredentials =
    yield* readDocsDeploymentStateStoreCredentials(
      credentialsFilePath(config.profile, "cloudflare-state-store"),
      config.stateCredentialsJson
    );
  yield* requireDocsDeploymentStateStoreAccount(
    currentEnvironment.accountId,
    decodedStateCredentials
  );
  return yield* readInventoryProgram(config.reportPath).pipe(
    Effect.provide(makeInventoryLayer(decodedStateCredentials))
  );
}).pipe(
  Effect.tapErrorTag("DocsDeploymentInventoryInputError", (error) =>
    Console.error(
      Option.match(Option.fromNullishOr(error.fileVisible), {
        onNone: () => `FAIL [inventory-input] target=${error.target}`,
        onSome: (fileVisible) =>
          `FAIL [inventory-input] target=${error.target} fileVisible=${fileVisible} fileJsonObject=${error.fileJsonObject === true}`,
      })
    )
  ),
  Effect.tapErrorTag("DocsDeploymentInventoryReadError", (error) =>
    Console.error(`FAIL [inventory-read] operation=${error.operation}`)
  ),
  Effect.tapErrorTag("DocsDeploymentInventoryDisagreementError", (error) =>
    Console.error(`FAIL [inventory-disagreement] ${error.findings.join("; ")}`)
  ),
  Effect.provide(cloudflareApiLayer),
  Effect.scoped
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
