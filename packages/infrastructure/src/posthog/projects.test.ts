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
  Array,
  ConfigProvider,
  Effect,
  Exit,
  Layer,
  Option,
  Record,
  Redacted,
  Ref,
} from "effect";
import { HttpClient } from "effect/http";

import { PostHogProjectProviderLive } from "./projects.live.layer.js";
import { PostHogProject, PostHogProjectProvider } from "./projects.provider.js";
import {
  ManagedProject,
  PostHogManagedName,
  PostHogOrganisationId,
  ProjectDefinition,
  desiredProjectPrivacy,
} from "./schemas.js";
import { PostHogManagement } from "./service.js";
import { declarePostHogProjects } from "./stack.js";
import { makePostHogManagementTest } from "./test.layer.js";

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
      expect(Array.map(resources, (resource) => resource.LogicalId)).toEqual([
        "TaxKitProject",
      ]);
      expect(
        Array.every(
          resources,
          (resource) => resource.RemovalPolicy === "retain"
        )
      ).toBe(true);
      const created = yield* Plan.make(compiled).pipe(
        Effect.provideContext(compiled.services)
      );
      expect(
        Array.map(Record.values(created.resources), (node) => node.action)
      ).toEqual(["create"]);
      const state = yield* State.pipe(Effect.provideContext(compiled.services));
      const store = yield* state;
      const management = yield* PostHogManagement.pipe(
        Effect.provide(native.layer)
      );
      yield* Effect.forEach(resources, (resource) =>
        Effect.gen(function* () {
          const props = yield* ProjectDefinition.makeEffect(resource.Props);
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
      );
      const noop = yield* Plan.make(compiled).pipe(
        Effect.provideContext(compiled.services)
      );
      expect(
        Array.map(Record.values(noop.resources), (node) => node.action)
      ).toEqual(["noop"]);
      const removed = yield* Plan.destroy(compiled).pipe(
        Effect.provideContext(compiled.services)
      );
      expect(
        Array.flatMap(Record.values(removed.deletions), (node) =>
          Option.fromNullishOr(node).pipe(
            Option.match({
              onNone: () => [],
              onSome: (checked) => [checked.action],
            })
          )
        )
      ).toEqual(["orphaned"]);
      const context = yield* Layer.build(providers);
      const scanned = yield* Nuke.list({ context, mode: "live" });
      expect(scanned).toEqual({ failures: [], resources: [] });
      expect(
        Array.filter(
          yield* Ref.get(native.operations),
          (operation) => operation === "create-project"
        )
      ).toHaveLength(1);
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
        Option.fromNullishOr(provider.diff),
        {
          onNone: () => Effect.die("Native diff missing"),
          onSome: (diff) =>
            diff({
              ...identity,
              newBindings: [],
              news: renamed,
              oldBindings: [],
              olds: definition,
              output: saved,
            }),
        }
      );
      expect(difference).toEqual({
        action: "update",
        stables: ["id", "organisation", "marker", "region", "token"],
      });
      const changed = yield* provider.reconcile({
        ...identity,
        bindings: [],
        news: renamed,
        olds: definition,
        output: saved,
        session,
      });
      expect(changed.id).toBe(saved.id);
      expect(changed.name).toBe(renamed.name);
      expect(
        Redacted.makeEquivalence(
          (a: typeof CaptureToken.Type, b: typeof CaptureToken.Type) => a === b
        )(changed.token, saved.token)
      ).toBe(true);
      const refused = yield* provider
        .delete({
          ...identity,
          bindings: [],
          force: true,
          olds: renamed,
          output: changed,
          session,
        })
        .pipe(Effect.exit);
      expect(Exit.isFailure(refused)).toBe(true);
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
      const missing = yield* provider
        .reconcile({
          ...identity,
          bindings: [],
          news: definition,
          olds: definition,
          output: saved,
          session,
        })
        .pipe(Effect.exit);
      expect(Exit.isFailure(missing)).toBe(true);
      const lostOutput = yield* provider
        .reconcile({
          ...identity,
          bindings: [],
          news: definition,
          olds: definition,
          output: Option.getOrUndefined(Option.none<ManagedProject>()),
          session,
        })
        .pipe(Effect.exit);
      expect(Exit.isFailure(lostOutput)).toBe(true);
      const foreign = ProjectDefinition.make({
        ...definition,
        organisation: PostHogOrganisationId.make(
          "00000000-0000-4000-8000-000000000080"
        ),
      });
      const rejected = yield* provider
        .reconcile({
          ...identity,
          bindings: [],
          news: foreign,
          olds: definition,
          output: saved,
          session,
        })
        .pipe(Effect.exit);
      expect(Exit.isFailure(rejected)).toBe(true);
      expect(yield* Ref.get(native.operations)).toEqual([
        "update-project",
        "find-project",
      ]);
      const unresolved = yield* Option.match(
        Option.fromNullishOr(provider.diff),
        {
          onNone: () => Effect.die("Native diff missing"),
          onSome: (diff) =>
            diff({
              ...identity,
              newBindings: [],
              news: {
                ...definition,
                organisation: Output.asOutput(organisation),
              },
              oldBindings: [],
              olds: definition,
              output: saved,
            }),
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
      const read = yield* Option.match(Option.fromNullishOr(provider.read), {
        onNone: () => Effect.die("Native read missing"),
        onSome: (readProject) =>
          readProject({ ...identity, olds: definition, output: saved }),
      }).pipe(Effect.exit);
      expect(Exit.isFailure(read)).toBe(true);
      const create = yield* provider
        .reconcile({
          ...identity,
          bindings: [],
          news: definition,
          olds: Option.getOrUndefined(Option.none<ProjectDefinition>()),
          output: Option.getOrUndefined(Option.none<ManagedProject>()),
          session,
        })
        .pipe(Effect.exit);
      expect(Exit.isFailure(create)).toBe(true);
      const context = yield* Layer.build(PostHogProjectProviderLive);
      expect(yield* Nuke.list({ context, mode: "live" })).toEqual({
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
      expect(Exit.isFailure(compiled)).toBe(true);
      expect(yield* Ref.get(native.operations)).toEqual([]);
    }).pipe(graphEnvironment)
);
