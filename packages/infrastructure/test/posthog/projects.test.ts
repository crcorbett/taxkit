import { BunServices } from "@effect/platform-bun";
import { expect, it } from "@effect/vitest";
import { CaptureToken, PostHogProjectId } from "@taxkit/analytics/schemas";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { CredentialsStore } from "alchemy/Auth/Credentials";
import { ProfileStore } from "alchemy/Auth/Profile";
import { layerNonInteractive } from "alchemy/Interaction";
import * as Nuke from "alchemy/Nuke";
import * as Output from "alchemy/Output";
import * as Plan from "alchemy/Plan";
import { noopSession } from "alchemy/Report";
import * as Stack from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { State, inMemoryState } from "alchemy/State";
import {
  Function as EffectFunction,
  Array,
  ConfigProvider,
  Effect,
  Exit,
  Layer,
  Option,
  Record,
  Redacted,
  Ref,
  Schema,
} from "effect";
import { HttpClient } from "effect/http";

import { PostHogProjectProviderLive } from "../../src/posthog/projects.live.layer.js";
import {
  PostHogProject,
  PostHogProjectProvider,
} from "../../src/posthog/projects.provider.js";
import {
  ManagedProject,
  PostHogManagedName,
  PostHogOrganisationId,
  ProjectDefinition,
  desiredProjectPrivacy,
} from "../../src/posthog/schemas.js";
import { PostHogManagement } from "../../src/posthog/service.js";
import { declarePostHogProjects } from "../../src/posthog/stack.js";
import { makePostHogManagementTest } from "../../src/posthog/test.layer.js";

// Alchemy erases provider errors to any. Preserve their cause as checked failure data at this native boundary.
class NativeProviderError extends Schema.TaggedError<
  NativeProviderError,
  { readonly brand: unique symbol }
>()("NativeProviderError", { cause: Schema.Defect() }) {}

const organisation = PostHogOrganisationId.make(
  "00000000-0000-4000-8000-000000000079"
);
const definition = ProjectDefinition.make({
  marker: "taxkit:posthog:shared:v1",
  name: PostHogManagedName.make("TaxKit"),
  organisation,
  region: "us",
});
const saved = ManagedProject.make({
  ...definition,
  id: PostHogProjectId.make(80),
  privacy: desiredProjectPrivacy,
  token: Redacted.make(
    CaptureToken.make("phc_synthetic_taxkit_preview_fixture_only")
  ),
});
const identity = {
  fqn: "TaxKitProject",
  id: "TaxKitProject",
  instanceId: "fixture-instance",
};
const graphEnvironment = Effect.provide(
  Layer.mergeAll(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({ POSTHOG_ORGANISATION_ID: organisation })
    ),
    BunServices.layer,
    Layer.succeed(
      AlchemyContext,
      AlchemyContext.of({
        adopt: false,
        dev: false,
        dotAlchemy: "tmp/posthog-graph-proof",
      })
    ),
    Layer.succeed(ArtifactStore, createArtifactStore()),
    Layer.succeed(AuthProviders, {}),
    layerNonInteractive(),
    Layer.succeed(
      ProfileStore,
      ProfileStore.of({
        createProfile: () => Effect.die("Unexpected profile write"),
        current: Effect.die("Unexpected profile read"),
        deleteProfile: () => Effect.die("Unexpected profile write"),
        deleteProviderConfig: () => Effect.die("Unexpected profile write"),
        ensureProfile: () => Effect.die("Unexpected profile write"),
        getProfile: () => Effect.die("Unexpected profile read"),
        loadProviderConfig: () => Effect.die("Unexpected profile read"),
        readManifest: Effect.die("Unexpected profile read"),
        renameProfile: () => Effect.die("Unexpected profile write"),
        setProviderConfig: () => Effect.die("Unexpected profile write"),
      })
    ),
    Layer.succeed(
      CredentialsStore,
      CredentialsStore.of({
        delete: () => Effect.die("Unexpected credential write"),
        deleteProfile: () => Effect.die("Unexpected credential write"),
        read: () => Effect.die("Unexpected credential read"),
        scoped() {
          return this;
        },
        write: () => Effect.die("Unexpected credential write"),
      })
    ),
    HttpClient.layerMergedContext(
      Effect.succeed(
        HttpClient.make(() => Effect.die("Unexpected network access"))
      )
    )
  )
);
const session = { ...noopSession, note: () => Effect.void };
it.effect(
  "retains one shared project through the actual native destroy plan and nuke inventory",
  () =>
    Effect.gen(function* () {
      const native = yield* makePostHogManagementTest();
      const stateLayer = inMemoryState();
      const providers = Layer.merge(
        PostHogProjectProvider.pipe(Layer.provide(native.layer)),
        stateLayer
      );
      const compiled = yield* Stack.make({
        name: "TaxKitPostHogProof",
        providers,
        state: stateLayer,
      })(declarePostHogProjects).pipe(Effect.provideService(Stage, "prod"));
      const resources = Record.values(compiled.resources);
      expect(resources).toHaveLength(1);
      EffectFunction.pipe(
        EffectFunction.pipe(
          resources,
          Array.map((resource) => resource.LogicalId)
        ),
        (actual) => {
          expect(actual).toStrictEqual(["TaxKitProject"]);
        }
      );
      EffectFunction.pipe(
        EffectFunction.pipe(
          resources,
          Array.every((resource) => resource.RemovalPolicy === "retain")
        ),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
      const created = yield* Plan.make(compiled).pipe(
        Effect.provideContext(compiled.services)
      );
      EffectFunction.pipe(
        EffectFunction.pipe(
          Record.values(created.resources),
          Array.map((node) => node.action)
        ),
        (actual) => {
          expect(actual).toStrictEqual(["create"]);
        }
      );
      const state = yield* State.pipe(Effect.provideContext(compiled.services));
      const store = yield* state;
      const management = yield* PostHogManagement.pipe(
        Effect.provide(native.layer)
      );
      yield* EffectFunction.pipe(
        resources,
        Effect.forEach((resource) =>
          Effect.gen(function* () {
            const props = yield* Schema.decodeUnknownEffect(ProjectDefinition)(
              resource.Props
            );
            const attr = yield* management.createProject(props);
            yield* store.set({
              fqn: resource.FQN,
              stack: compiled.name,
              stage: compiled.stage,
              value: {
                attr,
                bindings: [],
                downstream: [],
                fqn: resource.FQN,
                instanceId: `proof-${resource.LogicalId}`,
                logicalId: resource.LogicalId,
                namespace: resource.Namespace,
                props,
                providerVersion: 0,
                removalPolicy: "retain",
                resourceType: resource.Type,
                status: "created",
              },
            });
          })
        )
      );
      const noop = yield* Plan.make(compiled).pipe(
        Effect.provideContext(compiled.services)
      );
      EffectFunction.pipe(
        EffectFunction.pipe(
          Record.values(noop.resources),
          Array.map((node) => node.action)
        ),
        (actual) => {
          expect(actual).toStrictEqual(["noop"]);
        }
      );
      const removed = yield* Plan.destroy(compiled).pipe(
        Effect.provideContext(compiled.services)
      );
      EffectFunction.pipe(
        EffectFunction.pipe(
          Record.values(removed.deletions),
          Array.flatMap((node) =>
            Option.fromNullishOr(node).pipe(
              Option.match({
                onNone: () => [],
                onSome: (checked) => [checked.action],
              })
            )
          )
        ),
        (actual) => {
          expect(actual).toStrictEqual(["orphaned"]);
        }
      );
      const context = yield* Layer.build(providers);
      const scanned = yield* Nuke.list({ context, mode: "live" });
      expect(scanned).toStrictEqual({ failures: [], resources: [] });
      EffectFunction.pipe(
        EffectFunction.pipe(
          yield* Ref.get(native.operations),
          Array.filter((operation) => operation === "create-project")
        ),
        (actual) => {
          expect(actual).toHaveLength(1);
        }
      );
    }).pipe(graphEnvironment)
);
it.effect(
  "keeps native identity and capture key during an in-place rename",
  () =>
    Effect.gen(function* () {
      const native = yield* makePostHogManagementTest([saved]);
      const provider = yield* PostHogProject.Provider.pipe(
        Effect.provide(PostHogProjectProvider.pipe(Layer.provide(native.layer)))
      );
      const renamed = ProjectDefinition.make({
        ...definition,
        name: PostHogManagedName.make("TaxKit renamed"),
      });
      const difference = yield* Option.match(
        Option.fromNullishOr(provider.diff?.bind(provider)),
        {
          onNone: () => Effect.die("Native diff missing"),
          onSome: (diff) => {
            const checkedDiff: Effect.Effect<
              Effect.Success<ReturnType<typeof diff>>,
              NativeProviderError
            > = diff({
              ...identity,
              newBindings: [],
              news: renamed,
              oldBindings: [],
              olds: definition,
              output: saved,
            }).pipe(
              Effect.mapError((cause) => new NativeProviderError({ cause }))
            );

            return checkedDiff;
          },
        }
      );
      expect(difference).toStrictEqual({
        action: "update",
        stables: ["id", "organisation", "marker", "region", "token"],
      });
      const checkedReconcile: Effect.Effect<
        Effect.Success<ReturnType<typeof provider.reconcile>>,
        NativeProviderError
      > = provider
        .reconcile({
          ...identity,
          bindings: [],
          news: renamed,
          olds: definition,
          output: saved,
          session,
        })
        .pipe(Effect.mapError((cause) => new NativeProviderError({ cause })));
      const changed = yield* checkedReconcile;
      expect(changed.id).toBe(saved.id);
      expect(changed.name).toBe(renamed.name);
      EffectFunction.pipe(
        Redacted.makeEquivalence(
          (a: typeof CaptureToken.Type, b: typeof CaptureToken.Type) => a === b
        )(changed.token, saved.token),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
      const checkedRefused: Effect.Effect<
        Effect.Success<ReturnType<typeof provider.delete>>,
        NativeProviderError
      > = provider
        .delete({
          ...identity,
          bindings: [],
          force: true,
          olds: renamed,
          output: changed,
          session,
        })
        .pipe(Effect.mapError((cause) => new NativeProviderError({ cause })));
      const refused = yield* checkedRefused.pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(refused), (actual) => {
        expect(actual).toBeTruthy();
      });
    })
);
it.effect(
  "refuses replacing ownership or recreating a missing retained project",
  () =>
    Effect.gen(function* () {
      const native = yield* makePostHogManagementTest([]);
      const provider = yield* PostHogProject.Provider.pipe(
        Effect.provide(PostHogProjectProvider.pipe(Layer.provide(native.layer)))
      );
      const checkedMissing: Effect.Effect<
        Effect.Success<ReturnType<typeof provider.reconcile>>,
        NativeProviderError
      > = provider
        .reconcile({
          ...identity,
          bindings: [],
          news: definition,
          olds: definition,
          output: saved,
          session,
        })
        .pipe(Effect.mapError((cause) => new NativeProviderError({ cause })));
      const missing = yield* checkedMissing.pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(missing), (actual) => {
        expect(actual).toBeTruthy();
      });
      const checkedLostOutput: Effect.Effect<
        Effect.Success<ReturnType<typeof provider.reconcile>>,
        NativeProviderError
      > = provider
        .reconcile({
          ...identity,
          bindings: [],
          news: definition,
          olds: definition,
          output: Option.getOrUndefined(Option.none<ManagedProject>()),
          session,
        })
        .pipe(Effect.mapError((cause) => new NativeProviderError({ cause })));
      const lostOutput = yield* checkedLostOutput.pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(lostOutput), (actual) => {
        expect(actual).toBeTruthy();
      });
      const foreign = ProjectDefinition.make({
        ...definition,
        organisation: PostHogOrganisationId.make(
          "00000000-0000-4000-8000-000000000080"
        ),
      });
      const checkedRejected: Effect.Effect<
        Effect.Success<ReturnType<typeof provider.reconcile>>,
        NativeProviderError
      > = provider
        .reconcile({
          ...identity,
          bindings: [],
          news: foreign,
          olds: definition,
          output: saved,
          session,
        })
        .pipe(Effect.mapError((cause) => new NativeProviderError({ cause })));
      const rejected = yield* checkedRejected.pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(rejected), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Ref.get(native.operations)).toStrictEqual([
        "update-project",
        "find-project",
      ]);
      const unresolved = yield* Option.match(
        Option.fromNullishOr(provider.diff?.bind(provider)),
        {
          onNone: () => Effect.die("Native diff missing"),
          onSome: (diff) => {
            const checkedDiff: Effect.Effect<
              Effect.Success<ReturnType<typeof diff>>,
              NativeProviderError
            > = diff({
              ...identity,
              newBindings: [],
              news: {
                ...definition,
                organisation: Output.asOutput(organisation),
              },
              oldBindings: [],
              olds: definition,
              output: saved,
            }).pipe(
              Effect.mapError((cause) => new NativeProviderError({ cause }))
            );

            return checkedDiff;
          },
        }
      );
      expect(unresolved).toBeUndefined();
    })
);
it.effect(
  "registers the real live provider without credentials and reports typed acquisition failure on use",
  () =>
    Effect.gen(function* () {
      const provider = yield* PostHogProject.Provider.pipe(
        Effect.provide(PostHogProjectProviderLive),
        Effect.provide(
          ConfigProvider.layerAdd(
            ConfigProvider.fromUnknown({ POSTHOG_MANAGEMENT_KEY: "PRIVATE9" })
          )
        )
      );
      const read = yield* Option.match(
        Option.fromNullishOr(provider.read?.bind(provider)),
        {
          onNone: () => Effect.die("Native read missing"),
          onSome: (readProject) => {
            const checkedReadProject: Effect.Effect<
              Effect.Success<ReturnType<typeof readProject>>,
              NativeProviderError
            > = readProject({
              ...identity,
              olds: definition,
              output: saved,
            }).pipe(
              Effect.mapError((cause) => new NativeProviderError({ cause }))
            );

            return checkedReadProject;
          },
        }
      ).pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(read), (actual) => {
        expect(actual).toBeTruthy();
      });
      const checkedCreate: Effect.Effect<
        Effect.Success<ReturnType<typeof provider.reconcile>>,
        NativeProviderError
      > = provider
        .reconcile({
          ...identity,
          bindings: [],
          news: definition,
          olds: Option.getOrUndefined(Option.none<ProjectDefinition>()),
          output: Option.getOrUndefined(Option.none<ManagedProject>()),
          session,
        })
        .pipe(Effect.mapError((cause) => new NativeProviderError({ cause })));
      const create = yield* checkedCreate.pipe(Effect.exit);
      EffectFunction.pipe(Exit.isFailure(create), (actual) => {
        expect(actual).toBeTruthy();
      });
      const context = yield* Layer.build(PostHogProjectProviderLive);
      expect(yield* Nuke.list({ context, mode: "live" })).toStrictEqual({
        failures: [],
        resources: [],
      });
    })
);
it.effect.each(["pr-79", "dev_posthog_proof"])(
  "rejects ephemeral project declarations at %s",
  (stage) =>
    Effect.gen(function* () {
      const native = yield* makePostHogManagementTest();
      const compiled = yield* Stack.make({
        name: "TaxKitPostHogProof",
        providers: PostHogProjectProvider.pipe(Layer.provide(native.layer)),
        state: inMemoryState(),
      })(declarePostHogProjects).pipe(
        Effect.provideService(Stage, stage),
        Effect.exit
      );
      EffectFunction.pipe(Exit.isFailure(compiled), (actual) => {
        expect(actual).toBeTruthy();
      });
      expect(yield* Ref.get(native.operations)).toStrictEqual([]);
    }).pipe(graphEnvironment)
);
