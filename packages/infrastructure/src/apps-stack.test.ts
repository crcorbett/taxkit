import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import { Unowned } from "alchemy/AdoptPolicy";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { CredentialsStore } from "alchemy/Auth/Credentials";
import { ProfileStore } from "alchemy/Auth/Profile";
import { formatPlanLines } from "alchemy/Cli/LoggingCli";
import { Providers } from "alchemy/Cloudflare";
import { ZoneDnsSettings } from "alchemy/Cloudflare/DNS";
import {
  Worker,
  isDurableObjectExport,
  isSelfUrl,
} from "alchemy/Cloudflare/Workers";
import { Zone } from "alchemy/Cloudflare/Zone";
import { layerNonInteractive } from "alchemy/Interaction";
import * as Output from "alchemy/Output";
import * as Plan from "alchemy/Plan";
import * as Provider from "alchemy/Provider";
import { packEnvValue } from "alchemy/RuntimeContext";
import * as Stack from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { inMemoryState, State } from "alchemy/State";
import { StackConfigOverrides } from "alchemy/Util/ConfigProvider";
import {
  Array,
  Cause,
  Config,
  ConfigProvider,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Option,
  Order,
  Predicate,
  Record,
  Redacted,
  Ref,
  Result,
  Schema,
} from "effect";
import { HttpClient } from "effect/http";

import {
  nativeAppsDopplerSelection,
  nativeAppsSecrets,
} from "./apps-secrets.boundary.js";
import { declareNativeAppsStack } from "./apps-stack.js";

const graphFixture = Effect.fnUntraced(function* (
  mode: "create" | "noop" | "update" | "without-precreate" | "adopted",
  stage = "dev_native_graph_proof"
) {
  const providerWrites = yield* Ref.make(0);
  const forbiddenWrite = Ref.update(providerWrites, (count) => count + 1).pipe(
    Effect.andThen(Effect.die("Provider writes are forbidden in graph proof"))
  );
  const workerService = Worker.Provider.of({
    delete: () => forbiddenWrite,
    diff: () =>
      Effect.succeed(
        mode === "update"
          ? { action: "update", stables: ["workerId"] }
          : { action: "noop" }
      ),
    list: () => Effect.die("Unexpected provider enumeration"),
    read: ({ output }: { readonly output: Worker["Attributes"] | undefined }) =>
      Effect.succeed(output),
    reconcile: () => forbiddenWrite,
  });
  const workerProvider = Provider.effect(
    Worker,
    Effect.succeed(
      mode === "without-precreate"
        ? workerService
        : { ...workerService, precreate: () => forbiddenWrite }
    )
  );
  const stateLayer = inMemoryState();
  const zoneProvider = Provider.succeed(Zone, {
    delete: () => forbiddenWrite,
    diff: () => Effect.void,
    read: ({ output }) =>
      Effect.succeed(
        mode === "adopted"
          ? Unowned({
              accountId: "f9f94270a4a5af8af7010d891020922d",
              accountName: undefined,
              activatedOn: undefined,
              cnameSuffix: undefined,
              createdOn: "2026-10-03T05:08:24Z",
              developmentMode: 0,
              meta: {
                cdnOnly: undefined,
                customCertificateQuota: undefined,
                dnsOnly: undefined,
                foundationDns: false,
                pageRuleQuota: undefined,
                phishingDetected: undefined,
                step: undefined,
              },
              modifiedOn: "2026-10-03T05:08:24Z",
              name: "taxkit.dev",
              nameServers: ["joan.ns.cloudflare.com", "kip.ns.cloudflare.com"],
              originalDnshost: undefined,
              originalNameServers: undefined,
              originalRegistrar: undefined,
              owner: { id: undefined, name: undefined, type: undefined },
              paused: false,
              status: "active",
              tenant: undefined,
              tenantUnit: undefined,
              type: "full",
              vanityNameServers: undefined,
              verificationKey: undefined,
              zoneId: "15103853342ab9f18f7894b7fae39c39",
            } satisfies Zone["Attributes"])
          : output
      ),
    reconcile: () => forbiddenWrite,
  });
  const settingsProvider = Provider.succeed(ZoneDnsSettings, {
    delete: () => forbiddenWrite,
    diff: () => Effect.void,
    read: ({ output }) => Effect.succeed(output),
    reconcile: () => forbiddenWrite,
  });
  const providers = Layer.merge(
    Layer.effect(
      Providers,
      Provider.collection([Worker, Zone, ZoneDnsSettings]).pipe(
        Effect.provide(
          Layer.mergeAll(workerProvider, zoneProvider, settingsProvider)
        )
      )
    ),
    stateLayer
  );
  // The actual stage selects its native resources. Unlisted providers still
  // fail rather than receive invented services; all writes refuse.
  const compiled = yield* Stack.make<Providers | State>({
    name: "TaxKitAppsGraphProof",
    providers,
    state: stateLayer,
  })(declareNativeAppsStack).pipe(Effect.provideService(Stage, stage));
  if (mode === "noop" || mode === "update") {
    const state = yield* State.pipe(Effect.provideContext(compiled.services));
    const store = yield* state;
    yield* Effect.forEach(Record.values(compiled.resources), (resource) =>
      store.set({
        fqn: resource.FQN,
        stack: compiled.name,
        stage: compiled.stage,
        value: {
          attr: {
            accountId: "graph-proof-account",
            crons: [],
            durableObjectNamespaces: {},
            routes: [],
            url:
              resource.LogicalId === "TaxKitApi"
                ? "https://api.example.com"
                : "https://website.example.com",
            urls: [],
            workerId: `proof-${resource.LogicalId}`,
            workerName: resource.LogicalId,
          },
          // These are the actual already-applied native bindings, including
          // the circular address placeholders resolved later by the planner.
          bindings:
            resource.LogicalId === "TaxKitApi"
              ? [
                  {
                    data: {
                      bindings: [
                        { name: "API_PUBLIC_ORIGIN", type: "self_url" },
                      ],
                    },
                    sid: "API_PUBLIC_ORIGIN",
                  },
                  {
                    data: {
                      bindings: [
                        {
                          name: "CALCULATOR_HOST_MODE",
                          text: "edge",
                          type: "plain_text",
                        },
                      ],
                    },
                    sid: "CALCULATOR_HOST_MODE",
                  },
                  {
                    data: {
                      bindings: [
                        {
                          name: "CALCULATOR_RATE_LIMIT",
                          namespaceId: "10076",
                          simple: { limit: 60, period: 60 },
                          type: "ratelimit",
                        },
                      ],
                    },
                    sid: "CALCULATOR_RATE_LIMIT",
                  },
                  {
                    data: { bindings: [undefined] },
                    sid: "WEBSITE_PUBLIC_ORIGIN",
                  },
                ]
              : [
                  { data: { bindings: [undefined] }, sid: "API_PUBLIC_ORIGIN" },
                  {
                    data: {
                      bindings: [
                        {
                          name: "CALCULATOR_HOST_MODE",
                          text: "edge",
                          type: "plain_text",
                        },
                      ],
                    },
                    sid: "CALCULATOR_HOST_MODE",
                  },
                  {
                    data: {
                      bindings: [{ name: "TAXKIT_API", type: "service" }],
                    },
                    sid: "TAXKIT_API",
                  },
                  {
                    data: {
                      bindings: [
                        { name: "WEBSITE_PUBLIC_ORIGIN", type: "self_url" },
                      ],
                    },
                    sid: "WEBSITE_PUBLIC_ORIGIN",
                  },
                ],
          downstream: [],
          fqn: resource.FQN,
          instanceId: `proof-${resource.LogicalId}`,
          logicalId: resource.LogicalId,
          namespace: resource.Namespace,
          props:
            resource.LogicalId === "TaxKitApi"
              ? {
                  env: {
                    CALCULATOR_RATE_NAMESPACE: Redacted.make(
                      packEnvValue(Redacted.make("10076"))
                    ),
                  },
                }
              : {},
          providerVersion: 0,
          resourceType: resource.Type,
          status: "created",
        },
      })
    );
  }
  const planned = yield* Plan.make(compiled).pipe(
    Effect.provideContext(compiled.services),
    Effect.timeout("1 second"),
    Effect.exit
  );
  return { compiled, planned, providerWrites: yield* Ref.get(providerWrites) };
});

const graphEnvironment = Effect.provide(
  Layer.mergeAll(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({ CALCULATOR_RATE_NAMESPACE: "10076" })
    ),
    BunServices.layer,
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
const localContext = {
  adopt: false,
  dev: false,
  dotAlchemy: "tmp/native-apps-graph-proof",
};

describe("native paired app graph and planner", () => {
  it.live.each(["pr-214", "dev_ci_user"])(
    "keeps Production DNS out of %s",
    (stage) =>
      Effect.gen(function* () {
        const result = yield* graphFixture("create", stage);
        const plan = yield* result.planned;
        expect(Array.sort(Record.keys(plan.resources), Order.String)).toEqual([
          "TaxKitApi",
          "TaxKitWebsite",
        ]);
        expect(result.compiled.stage).toBe(stage);
        expect(result.providerWrites).toBe(0);
        if (stage === "pr-214") {
          expect(formatPlanLines(plan).join("\n")).toBe(
            (yield* (yield* FileSystem.FileSystem).readFileString(
              "../../tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-preview.txt"
            )).trimEnd()
          );
        }
        const members = Record.values(result.compiled.resources);
        expect(
          Array.every(
            members,
            (resource) => !Object.hasOwn(resource.Props, "domain")
          )
        ).toBe(true);
      }).pipe(
        Effect.provideService(AlchemyContext, localContext),
        graphEnvironment,
        Effect.scoped
      )
  );
  it.live("pins Production domains to the adopted retained zone", () =>
    Effect.gen(function* () {
      const result = yield* graphFixture("adopted", "prod");
      const plan = yield* result.planned;
      expect(Array.sort(Record.keys(plan.resources), Order.String)).toEqual([
        "TaxKitApi",
        "TaxKitProductionDnsSettings",
        "TaxKitProductionZone",
        "TaxKitWebsite",
      ]);
      expect(result.providerWrites).toBe(0);
      expect(formatPlanLines(plan).join("\n")).toBe(
        (yield* (yield* FileSystem.FileSystem).readFileString(
          "../../tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-production.txt"
        )).trimEnd()
      );
      const zone = Record.get(
        result.compiled.resources,
        "TaxKitProductionZone"
      ).pipe(
        Option.getOrElse(() => expect.fail("Expected native graph member"))
      );
      const settings = Record.get(
        result.compiled.resources,
        "TaxKitProductionDnsSettings"
      ).pipe(
        Option.getOrElse(() => expect.fail("Expected native graph member"))
      );
      const api = Record.get(result.compiled.resources, "TaxKitApi").pipe(
        Option.getOrElse(() => expect.fail("Expected native graph member"))
      );
      const website = Record.get(
        result.compiled.resources,
        "TaxKitWebsite"
      ).pipe(
        Option.getOrElse(() => expect.fail("Expected native graph member"))
      );
      expect(zone.Adopt).toBe(true);
      expect(zone.RemovalPolicy).toBe("retain");
      expect(settings.RemovalPolicy).toBe("retain");
      expect(zone.Props).toEqual({
        name: "taxkit.dev",
        paused: false,
        type: "full",
      });
      const domains = yield* Output.evaluate(
        {
          api: api.Props.domain,
          settingsZone: settings.Props.zoneId,
          website: website.Props.domain,
        },
        { TaxKitProductionZone: { zoneId: "15103853342ab9f18f7894b7fae39c39" } }
      ).pipe(Effect.provideContext(result.compiled.services));
      expect(domains).toEqual({
        api: {
          name: "api.taxkit.dev",
          zoneId: "15103853342ab9f18f7894b7fae39c39",
        },
        settingsZone: "15103853342ab9f18f7894b7fae39c39",
        website: {
          name: "taxkit.dev",
          redirects: ["www.taxkit.dev"],
          zoneId: "15103853342ab9f18f7894b7fae39c39",
        },
      });
      expect(isSelfUrl(api.Props.env?.API_PUBLIC_ORIGIN)).toBe(true);
      expect(isSelfUrl(website.Props.env?.WEBSITE_PUBLIC_ORIGIN)).toBe(true);
      expect(Object.hasOwn(settings.Props, "soa")).toBe(false);
      expect(Object.hasOwn(settings.Props, "internalDns")).toBe(false);
    }).pipe(
      Effect.provideService(AlchemyContext, localContext),
      graphEnvironment,
      Effect.scoped
    )
  );
  it.live.each(["create", "noop", "update"] as const)(
    "keeps the actual circular address graph live for %s",
    (mode) =>
      Effect.gen(function* () {
        const result = yield* graphFixture(mode);
        expect(result.providerWrites).toBe(0);
        const plan = yield* result.planned;
        expect(Array.sort(Record.keys(plan.resources), Order.String)).toEqual([
          "TaxKitApi",
          "TaxKitWebsite",
        ]);
        expect(
          Array.sort(Array.fromIterable(plan.cycleMembers), Order.String)
        ).toEqual(["TaxKitApi", "TaxKitWebsite"]);
        expect(
          Array.map(Record.values(plan.resources), ({ resource, action }) => ({
            action,
            id: resource.LogicalId,
          }))
        ).toEqual([
          { action: mode, id: "TaxKitWebsite" },
          { action: mode, id: "TaxKitApi" },
        ]);
        const api = Record.get(result.compiled.resources, "TaxKitApi").pipe(
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        const website = Record.get(
          result.compiled.resources,
          "TaxKitWebsite"
        ).pipe(
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        expect(api.Props).toBeDefined();
        expect(website.Props).toBeDefined();
        expect(
          Record.get(api.Props.exports ?? {}, "TaxKitMcpSessions").pipe(
            Option.exists(isDurableObjectExport)
          )
        ).toBe(true);
        expect(
          Record.get(website.Props.exports ?? {}, "TaxKitMcpSessions").pipe(
            Option.isNone
          )
        ).toBe(true);
        expect(isSelfUrl(api.Props.env?.API_PUBLIC_ORIGIN)).toBe(true);
        expect(isSelfUrl(website.Props.env?.WEBSITE_PUBLIC_ORIGIN)).toBe(true);
        expect(
          Array.sort(Record.keys(website.Props.env ?? {}), Order.String)
        ).toEqual([
          "API_PUBLIC_ORIGIN",
          "CALCULATOR_HOST_MODE",
          "TAXKIT_API",
          "WEBSITE_PUBLIC_ORIGIN",
        ]);
        const apiNode = Record.get(plan.resources, "TaxKitApi").pipe(
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        const websiteNode = Record.get(plan.resources, "TaxKitWebsite").pipe(
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        const apiProps = "props" in apiNode ? apiNode.props : api.Props;
        const websiteProps =
          "props" in websiteNode ? websiteNode.props : website.Props;
        // This is the actual native planned graph, not an assertion against
        // an unused policy constant. Omitted metadata invokes SDK defaults.
        const disabledPlatformTelemetry = Schema.Struct({
          enabled: Schema.Literal(false),
          headSamplingRate: Schema.Literal(0),
          logs: Schema.Struct({
            enabled: Schema.Literal(false),
            headSamplingRate: Schema.Literal(0),
            invocationLogs: Schema.Literal(false),
            persist: Schema.Literal(false),
          }),
          traces: Schema.Struct({
            enabled: Schema.Literal(false),
            headSamplingRate: Schema.Literal(0),
            persist: Schema.Literal(false),
          }),
        });
        expect(
          Schema.is(disabledPlatformTelemetry)(apiProps.observability)
        ).toBe(true);
        expect(
          Schema.is(disabledPlatformTelemetry)(websiteProps.observability)
        ).toBe(true);
        const privateBinding = Option.fromNullishOr(website.Props.env).pipe(
          Option.flatMap((env) => Record.get(env, "TAXKIT_API")),
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        expect(privateBinding).toBe(api);
        expect(result.compiled.stage).toBe("dev_native_graph_proof");
        expect(result.compiled.name).toBe("TaxKitAppsGraphProof");
        const absent = yield* Output.evaluate(
          {
            api: websiteProps.env?.API_PUBLIC_ORIGIN,
            website: apiProps.env?.WEBSITE_PUBLIC_ORIGIN,
          },
          { TaxKitApi: { url: undefined }, TaxKitWebsite: { url: null } }
        ).pipe(Effect.provideContext(result.compiled.services));
        expect(absent).toEqual({ api: null, website: null });
        const resolved = yield* Output.evaluate(
          {
            api: websiteProps.env?.API_PUBLIC_ORIGIN,
            website: apiProps.env?.WEBSITE_PUBLIC_ORIGIN,
          },
          {
            TaxKitApi: { url: "https://fresh-api.example.com" },
            TaxKitWebsite: { url: "https://fresh-website.example.com" },
          }
        ).pipe(Effect.provideContext(result.compiled.services));
        expect(resolved).toEqual({
          api: "https://fresh-api.example.com",
          website: "https://fresh-website.example.com",
        });
      }).pipe(
        Effect.provideService(AlchemyContext, localContext),
        Effect.provideService(Stage, "dev_native_graph_proof"),
        graphEnvironment,
        Effect.scoped
      )
  );
  it.live("refuses a cycle whose provider cannot precreate", () =>
    Effect.gen(function* () {
      const result = yield* graphFixture("without-precreate");
      expect(result.providerWrites).toBe(0);
      expect(Exit.isFailure(result.planned)).toBe(true);
      expect(Exit.hasDies(result.planned)).toBe(true);
      if (Exit.isFailure(result.planned)) {
        const die = Cause.findDie(result.planned.cause).pipe(Result.getOrThrow);
        expect(Predicate.isTagged(die.defect, "UnsatisfiedResourceCycle")).toBe(
          true
        );
      }
    }).pipe(
      Effect.provideService(AlchemyContext, localContext),
      Effect.provideService(Stage, "dev_native_graph_proof"),
      graphEnvironment,
      Effect.scoped
    )
  );
});

describe("native app root secret selection", () => {
  it.live.each([
    { namespace: "10078", stage: "prod" },
    { namespace: "10078160", stage: "pr-160" },
    { namespace: "10078161", stage: "pr-161" },
    { namespace: "selected-doppler-fixture", stage: "dev_ci_user" },
  ])("isolates the rate namespace for $stage", ({ namespace, stage }) =>
    Effect.gen(function* () {
      const compiled = yield* Stack.make({
        name: "TaxKitAppsNamespaceProof",
        providers: Layer.empty,
        secrets: (context) => [
          ConfigProvider.layerAdd(
            ConfigProvider.fromUnknown({
              CALCULATOR_RATE_NAMESPACE: "selected-doppler-fixture",
            }),
            { asPrimary: true }
          ),
          ...Array.drop(nativeAppsSecrets(context), 1),
        ],
        state: inMemoryState(),
      })(Config.schema(Schema.String, "CALCULATOR_RATE_NAMESPACE"));
      expect(compiled.output).toBe(namespace);
    }).pipe(
      Effect.provideService(AlchemyContext, localContext),
      Effect.provideService(Stage, stage),
      graphEnvironment,
      Effect.scoped
    )
  );
  it.effect.each([
    { config: "prd", stage: "prod" },
    { config: "stg_preview", stage: "pr-214" },
    { config: "dev", stage: "dev_ci_user" },
  ])("selects taxkit/$config for $stage", ({ config, stage }) =>
    Effect.gen(function* () {
      expect(yield* nativeAppsDopplerSelection(stage)).toEqual({
        config,
        project: "taxkit",
      });
    })
  );
  it.effect.each(["prod-2", "pr-0", "dev", "private-stage-sentinel"])(
    "rejects an invalid stage without retaining its value: %s",
    (stage) =>
      Effect.gen(function* () {
        const exit = yield* nativeAppsDopplerSelection(stage).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.pretty(exit.cause)).toContain(
            "Native app stack stage is missing or invalid"
          );
          expect(Cause.pretty(exit.cause)).not.toContain(stage);
        }
      })
  );
  it.live("keeps the selected configuration ahead of ambient PATH", () =>
    Effect.gen(function* () {
      const compiled = yield* Stack.make({
        name: "TaxKitAppsSecretsProof",
        providers: Layer.empty,
        secrets: (context) => [
          ConfigProvider.layerAdd(
            ConfigProvider.fromUnknown({ PATH: "first-fixture-source" }),
            { asPrimary: true }
          ),
          ConfigProvider.layerAdd(
            ConfigProvider.fromUnknown({ PATH: "selected-doppler-fixture" }),
            { asPrimary: true }
          ),
          ...Array.drop(nativeAppsSecrets(context), 1),
        ],
        state: inMemoryState(),
      })(Config.schema(Schema.String, "PATH"));
      expect(compiled.output).toBe("selected-doppler-fixture");
    }).pipe(
      Effect.provideService(AlchemyContext, localContext),
      Effect.provideService(Stage, "dev_native_graph_proof"),
      graphEnvironment,
      Effect.scoped
    )
  );
  it.live("rejects env-file selection before any credential or HTTP call", () =>
    Effect.gen(function* () {
      const exit = yield* Stack.make({
        name: "TaxKitAppsSecretsProof",
        providers: Layer.empty,
        secrets: nativeAppsSecrets,
        state: inMemoryState(),
      })(Effect.void).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.pretty(exit.cause)).toContain(
          "--env-file cannot be combined"
        );
        expect(Cause.pretty(exit.cause)).not.toContain("Unexpected");
      }
    }).pipe(
      Effect.provideService(StackConfigOverrides, {
        envFile: "native-proof.env",
      }),
      Effect.provideService(AlchemyContext, localContext),
      Effect.provideService(Stage, "dev_native_graph_proof"),
      graphEnvironment,
      Effect.scoped
    )
  );
  it.live(
    "rejects the actual root stage before a credential or HTTP call",
    () =>
      Effect.gen(function* () {
        const exit = yield* Stack.make({
          name: "TaxKitAppsSecretsProof",
          providers: Layer.empty,
          secrets: nativeAppsSecrets,
          state: inMemoryState(),
        })(Effect.void).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.pretty(exit.cause)).toContain(
            "Native app stack stage is missing or invalid"
          );
          expect(Cause.pretty(exit.cause)).not.toContain(
            "private-stage-sentinel"
          );
          expect(Cause.pretty(exit.cause)).not.toContain("Unexpected");
        }
      }).pipe(
        Effect.provideService(AlchemyContext, localContext),
        Effect.provideService(Stage, "private-stage-sentinel"),
        graphEnvironment,
        Effect.scoped
      )
  );
});
