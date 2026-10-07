import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { CredentialsStore } from "alchemy/Auth/Credentials";
import { ProfileStore } from "alchemy/Auth/Profile";
import { Providers } from "alchemy/Cloudflare";
import { Worker } from "alchemy/Cloudflare/Workers";
import { layerNonInteractive } from "alchemy/Interaction";
import * as Provider from "alchemy/Provider";
import * as Stack from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import api, { TaxKitApiWorker } from "api/worker";
import { ConfigProvider, Effect, Layer, Option, Record } from "effect";
import { HttpClient } from "effect/http";

// Source builders need the SDK-generated export inventory to emit native
// Durable Object bridges. Discover it from the actual app declaration, using
// memory-only compilation. Every provider/credential/network method refuses.
// No provider plan, apply or persisted state is acquired by this boundary.
export const nativeApiSourceProps = Effect.gen(function* () {
  const blocked = Effect.die(
    "Native source discovery forbids external operations"
  );
  const worker = Provider.effect(
    Worker,
    Effect.succeed(
      Worker.Provider.of({
        delete: () => blocked,
        diff: () => blocked,
        list: () => blocked,
        read: () => blocked,
        reconcile: () => blocked,
      })
    )
  );
  const providers = Layer.effect(
    Providers,
    Provider.collection([Worker]).pipe(Effect.provide(worker))
  );
  const compiled = yield* Stack.make({
    name: "TaxKitLocalSourceDiscovery",
    providers,
    state: inMemoryState(),
  })(TaxKitApiWorker.pipe(Effect.provide(api))).pipe(
    Effect.provideService(Stage, "dev_native_pair"),
    Effect.provide(
      Layer.mergeAll(
        ConfigProvider.layerAdd(
          ConfigProvider.fromUnknown({ CALCULATOR_RATE_NAMESPACE: "10097" })
        ),
        Layer.succeed(AuthProviders, {}),
        layerNonInteractive(),
        Layer.succeed(
          ProfileStore,
          ProfileStore.of({
            createProfile: () => blocked,
            current: blocked,
            deleteProfile: () => blocked,
            deleteProviderConfig: () => blocked,
            ensureProfile: () => blocked,
            getProfile: () => blocked,
            loadProviderConfig: () => blocked,
            readManifest: blocked,
            renameProfile: () => blocked,
            setProviderConfig: () => blocked,
          })
        ),
        Layer.succeed(
          CredentialsStore,
          CredentialsStore.of({
            delete: () => blocked,
            deleteProfile: () => blocked,
            read: () => blocked,
            write: () => blocked,
          })
        ),
        HttpClient.layerMergedContext(
          Effect.succeed(HttpClient.make(() => blocked))
        )
      )
    )
  );
  const resource = yield* Record.get(compiled.resources, "TaxKitApi").pipe(
    Option.match({ onNone: () => blocked, onSome: Effect.succeed })
  );
  return resource.Props;
});
