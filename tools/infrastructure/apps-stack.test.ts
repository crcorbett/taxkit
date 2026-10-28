import {
  makeSourceContext,
  Providers,
  resolveSource,
} from "@alchemy.run/cloudflare";
import { BotManagement } from "@alchemy.run/cloudflare/BotManagement";
import { Dnssec, ZoneDnsSettings } from "@alchemy.run/cloudflare/DNS";
import { Worker, isSelfUrl } from "@alchemy.run/cloudflare/Workers";
import type { WorkerBindingProps } from "@alchemy.run/cloudflare/Workers";
import { Setting, Zone } from "@alchemy.run/cloudflare/Zone";
import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import {
  productionBotPolicy,
  productionZoneSettings,
  websiteBuildMemo,
} from "@taxkit/infrastructure/apps-stack";
import { publicationOrigin } from "@taxkit/infrastructure/hostnames";
import {
  checkedStage,
  deploymentSecrets,
  dopplerConfig,
} from "@taxkit/infrastructure/secrets";
import {
  disabledWorkerObservability,
  workerCompatibility,
} from "@taxkit/infrastructure/worker-settings";
import { Unowned } from "alchemy/AdoptPolicy";
import { AlchemyContext } from "alchemy/AlchemyContext";
import {
  Artifacts,
  ArtifactStore,
  createArtifactStore,
  makeScopedArtifacts,
} from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { CredentialsStore } from "alchemy/Auth/Credentials";
import { ProfileStore } from "alchemy/Auth/Profile";
import { layerNonInteractive } from "alchemy/Interaction";
import * as Output from "alchemy/Output";
import * as Plan from "alchemy/Plan";
import * as Provider from "alchemy/Provider";
import { isResourceOfType } from "alchemy/Resource";
import type { ResourceLike } from "alchemy/Resource";
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
  Path,
  Record,
  Redacted,
  Ref,
  Schema,
} from "effect";
import { HttpClient } from "effect/http";

import { declareNativeAppsStack } from "../../alchemy.apps.js";

// These are Alchemy-created declarations, discriminated by the SDK resource type.
const isWorker = (
  resource: ResourceLike
): resource is Worker<WorkerBindingProps> => resource.Type === Worker.Type;
const isSetting = (resource: ResourceLike): resource is Setting =>
  resource.Type === Setting.Type;
const isDnsSettings = (resource: ResourceLike): resource is ZoneDnsSettings =>
  resource.Type === ZoneDnsSettings.Type;
const isWorkerPlan = (
  node: Plan.Plan["resources"][string]
): node is Plan.Apply<Worker<WorkerBindingProps>> =>
  isResourceOfType(node.resource, Worker.Type);

const graphFixture = Effect.fnUntraced(function* (
  mode: "create" | "noop" | "update" | "without-precreate" | "adopted",
  stage = "dev_native_graph_proof",
  traceExport: boolean = stage === "prod"
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
                // oxlint-disable-next-line typescript/no-deprecated -- The native provider fixture includes all upstream output fields.
                cdnOnly: undefined,
                customCertificateQuota: undefined,
                // oxlint-disable-next-line typescript/no-deprecated -- The native provider fixture includes all upstream output fields.
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
  const zoneSettingProvider = Provider.succeed(Setting, {
    delete: () => forbiddenWrite,
    diff: () => Effect.void,
    read: ({ output }) => Effect.succeed(output),
    reconcile: () => forbiddenWrite,
  });
  const dnssecProvider = Provider.succeed(Dnssec, {
    delete: () => forbiddenWrite,
    diff: () => Effect.void,
    read: ({ output }) => Effect.succeed(output),
    reconcile: () => forbiddenWrite,
  });
  const botProvider = Provider.succeed(BotManagement, {
    delete: () => forbiddenWrite,
    diff: () => Effect.void,
    read: ({ output }) => Effect.succeed(output),
    reconcile: () => forbiddenWrite,
  });
  const providers = Layer.merge(
    Layer.effect(
      Providers,
      Provider.collection([
        Worker,
        Zone,
        ZoneDnsSettings,
        Setting,
        Dnssec,
        BotManagement,
      ]).pipe(
        Effect.provide(
          Layer.mergeAll(
            workerProvider,
            zoneProvider,
            settingsProvider,
            zoneSettingProvider,
            dnssecProvider,
            botProvider
          )
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
  if (traceExport) {
    // The persisted outputs of the separately deployed trace-export stack.
    const state = yield* State.pipe(Effect.provideContext(compiled.services));
    const store = yield* state;
    yield* store.setOutput({
      stack: "TaxKitTraceExport",
      stage: "prod",
      value: {
        logsDestinationName: "taxkit-axiom-logs",
        tracesDestinationName: "taxkit-axiom-traces",
      },
    });
  }
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
          // Previous deployment bindings, before same-stage MCP admission.
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
                    data: {
                      bindings: [
                        {
                          name: "TAXKIT_PUBLICATION_ORIGIN",
                          text: publicationOrigin,
                          type: "plain_text",
                        },
                      ],
                    },
                    sid: "TAXKIT_PUBLICATION_ORIGIN",
                  },
                ]
              : [
                  {
                    data: { bindings: [undefined] },
                    sid: "API_PUBLIC_ORIGIN",
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
                        {
                          name: "TAXKIT_PUBLICATION_ORIGIN",
                          text: publicationOrigin,
                          type: "plain_text",
                        },
                      ],
                    },
                    sid: "TAXKIT_PUBLICATION_ORIGIN",
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
        expect(
          Array.map(Record.values(plan.resources), ({ action }) => action)
        ).toEqual(["create", "create"]);
        const members = Array.filter(
          Record.values(result.compiled.resources),
          isWorker
        );
        expect(
          Array.every(
            members,
            (resource) => !Object.hasOwn(resource.Props, "domain")
          )
        ).toBe(true);
        // Other stages keep their stable workers.dev address without previews.
        expect(
          Record.get(result.compiled.resources, "TaxKitWebsite").pipe(
            Option.filter(isWorker),
            Option.map((website) => website.Props.workersDev)
          )
        ).toEqual(Option.some({ enabled: true, previewsEnabled: false }));
        // Only Production exports; other stages need no trace-export stack
        // and keep every platform channel off.
        expect(
          Array.map(members, (resource) => resource.Props.observability)
        ).toEqual([disabledWorkerObservability, disabledWorkerObservability]);
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
        "TaxKitProductionAlwaysUseHttps",
        "TaxKitProductionBotManagement",
        "TaxKitProductionBrowserIntegrityCheck",
        "TaxKitProductionDnsSettings",
        "TaxKitProductionDnssec",
        "TaxKitProductionMinimumTlsVersion",
        "TaxKitProductionSecurityLevel",
        "TaxKitProductionTls13",
        "TaxKitProductionZone",
        "TaxKitWebsite",
      ]);
      // Every zone setting is retained and pinned to the Production zone.
      const zoneSettings = yield* Effect.forEach(
        productionZoneSettings,
        (setting) =>
          Record.get(result.compiled.resources, setting.resource).pipe(
            Option.filter(isSetting),
            Option.getOrElse(() => expect.fail("Expected zone setting")),
            (resource) =>
              Output.evaluate(
                {
                  removal: resource.RemovalPolicy,
                  settingId: resource.Props.settingId,
                  value: resource.Props.value,
                  zoneId: resource.Props.zoneId,
                },
                {
                  TaxKitProductionZone: {
                    zoneId: "15103853342ab9f18f7894b7fae39c39",
                  },
                }
              ).pipe(Effect.provideContext(result.compiled.services))
          )
      );
      expect(zoneSettings).toEqual(
        Array.map(productionZoneSettings, (setting) => ({
          removal: "retain",
          settingId: setting.settingId,
          value: setting.value,
          zoneId: "15103853342ab9f18f7894b7fae39c39",
        }))
      );
      expect(result.providerWrites).toBe(0);
      expect(
        Array.every(
          Record.values(plan.resources),
          ({ action }) => action !== "replace"
        )
      ).toBe(true);
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
        Option.filter(isDnsSettings),
        Option.getOrElse(() => expect.fail("Expected native graph member"))
      );
      const api = Record.get(result.compiled.resources, "TaxKitApi").pipe(
        Option.filter(isWorker),
        Option.getOrElse(() => expect.fail("Expected native graph member"))
      );
      const website = Record.get(
        result.compiled.resources,
        "TaxKitWebsite"
      ).pipe(
        Option.filter(isWorker),
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
      expect(
        isSelfUrl(
          Option.getOrUndefined(
            Record.get(api.Props.env ?? {}, "API_PUBLIC_ORIGIN")
          )
        )
      ).toBe(true);
      expect(
        isSelfUrl(
          Option.getOrUndefined(
            Record.get(website.Props.env ?? {}, "WEBSITE_PUBLIC_ORIGIN")
          )
        )
      ).toBe(true);
      // Production exports the hosts' checked console records only, through
      // the persisted trace-export destination. Invocation logs and automatic
      // traces (which carry URLs and caller details) stay off.
      const observability = yield* Output.evaluate(
        {
          api: api.Props.observability,
          website: website.Props.observability,
        },
        {}
      ).pipe(Effect.provideContext(result.compiled.services));
      const logsOnly = {
        enabled: true,
        logs: {
          destinations: ["taxkit-axiom-logs"],
          enabled: true,
          headSamplingRate: 1,
          invocationLogs: false,
          persist: false,
        },
        traces: { enabled: false, persist: false },
      };
      expect(observability).toEqual({ api: logsOnly, website: logsOnly });
      // DNSSEC signs the zone and the bot policy bans no user agent; both are
      // retained like the zone.
      const dnssec = Record.get(
        result.compiled.resources,
        "TaxKitProductionDnssec"
      ).pipe(
        Option.filter(
          (resource): resource is Dnssec => resource.Type === Dnssec.Type
        ),
        Option.getOrElse(() => expect.fail("Expected DNSSEC"))
      );
      const bots = Record.get(
        result.compiled.resources,
        "TaxKitProductionBotManagement"
      ).pipe(Option.getOrElse(() => expect.fail("Expected bot policy")));
      expect(dnssec.RemovalPolicy).toBe("retain");
      expect(bots.RemovalPolicy).toBe("retain");
      expect(dnssec.Props.status).toBe("active");
      expect(bots.Props).toMatchObject(productionBotPolicy);
      // Production serves only its custom domain: no workers.dev or previews.
      expect(website.Props.workersDev).toBe(false);
      expect(api.Props.workersDev).toBe(false);
      expect(Object.hasOwn(settings.Props, "soa")).toBe(false);
      expect(Object.hasOwn(settings.Props, "internalDns")).toBe(false);
    }).pipe(
      Effect.provideService(AlchemyContext, localContext),
      graphEnvironment,
      Effect.scoped
    )
  );
  it.live("refuses a Production plan before the trace-export stack", () =>
    Effect.gen(function* () {
      const result = yield* graphFixture("adopted", "prod", false);
      expect(Exit.isFailure(result.planned)).toBe(true);
      if (Exit.isFailure(result.planned)) {
        expect(Cause.pretty(result.planned.cause)).toContain(
          "Reference to stack 'TaxKitTraceExport' at stage 'prod' not found"
        );
      }
      expect(result.providerWrites).toBe(0);
    }).pipe(
      Effect.provideService(AlchemyContext, localContext),
      graphEnvironment,
      Effect.scoped
    )
  );
  it.live.each(["create", "noop", "update"] as const)(
    "plans the native same-stage address cycle for %s",
    (mode) =>
      Effect.gen(function* () {
        const result = yield* graphFixture(mode);
        expect(result.providerWrites).toBe(0);
        const plan = yield* result.planned;
        expect(Array.sort(Record.keys(plan.resources), Order.String)).toEqual([
          "TaxKitApi",
          "TaxKitWebsite",
        ]);
        // Native Worker precreation resolves the two same-stage addresses.
        expect(
          Array.sort(Array.fromIterable(plan.cycleMembers), Order.String)
        ).toEqual(["TaxKitApi", "TaxKitWebsite"]);
        expect(
          Array.sort(
            Array.map(
              Record.values(plan.resources),
              ({ resource, action }: Plan.CRUD) => ({
                action,
                id: resource.LogicalId,
              })
            ),
            Order.mapInput(Order.String, (node: { id: string }) => node.id)
          )
        ).toEqual([
          { action: mode, id: "TaxKitApi" },
          { action: mode, id: "TaxKitWebsite" },
        ]);
        const api = Record.get(result.compiled.resources, "TaxKitApi").pipe(
          Option.filter(isWorker),
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        const website = Record.get(
          result.compiled.resources,
          "TaxKitWebsite"
        ).pipe(
          Option.filter(isWorker),
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        expect(api.Props.dev).toEqual({
          host: "127.0.0.1",
          port: 3221,
          strictPort: true,
        });
        expect(website.Props.dev).toEqual({
          host: "127.0.0.1",
          port: 3220,
          strictPort: true,
        });
        const websiteOriginBinding = Record.get(
          result.compiled.bindings,
          "TaxKitApi"
        ).pipe(
          Option.flatMap(
            Array.findFirst((binding) => binding.sid === "WebsiteOrigin")
          ),
          Option.getOrElse(() =>
            expect.fail("Expected same-stage Website binding")
          )
        );
        const websiteBindingValues: unknown = yield* Output.evaluate(
          websiteOriginBinding.data,
          {
            TaxKitWebsite: { url: "https://fresh-website.example.com" },
          }
        ).pipe(Effect.provideContext(result.compiled.services));
        expect(websiteBindingValues).toEqual({
          env: { WEBSITE_PUBLIC_ORIGIN: "https://fresh-website.example.com" },
        });
        expect(Record.keys(api.Props.exports ?? {})).toEqual(["default"]);
        expect(
          Record.get(website.Props.exports ?? {}, "TaxKitMcpSessions").pipe(
            Option.isNone
          )
        ).toBe(true);
        expect(
          isSelfUrl(
            Option.getOrUndefined(
              Record.get(api.Props.env ?? {}, "API_PUBLIC_ORIGIN")
            )
          )
        ).toBe(true);
        expect(
          isSelfUrl(
            Option.getOrUndefined(
              Record.get(website.Props.env ?? {}, "WEBSITE_PUBLIC_ORIGIN")
            )
          )
        ).toBe(true);
        expect(
          Array.sort(Record.keys(website.Props.env ?? {}), Order.String)
        ).toEqual([
          "API_PUBLIC_ORIGIN",
          "TAXKIT_API",
          "TAXKIT_PUBLICATION_ORIGIN",
          "WEBSITE_PUBLIC_ORIGIN",
        ]);
        // WebsiteOrigin is a native post-declaration binding, not a guessed env value.
        expect(
          Array.sort(Record.keys(api.Props.env ?? {}), Order.String)
        ).toEqual([
          "API_PUBLIC_ORIGIN",
          "CALCULATOR_HOST_MODE",
          "CALCULATOR_RATE_NAMESPACE",
          "TAXKIT_PUBLICATION_ORIGIN",
        ]);
        expect(website.Props.cache).toEqual({
          crossVersionCache: false,
          enabled: true,
        });
        const apiNode = Record.get(plan.resources, "TaxKitApi").pipe(
          Option.filter(isWorkerPlan),
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        const websiteNode = Record.get(plan.resources, "TaxKitWebsite").pipe(
          Option.filter(isWorkerPlan),
          Option.getOrElse(() => expect.fail("Expected native graph member"))
        );
        if (apiNode.action === "replace" || websiteNode.action === "replace") {
          return yield* Effect.die(
            "Native app fixture must not replace either Worker"
          );
        }
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
            api: Option.getOrUndefined(
              Record.get(websiteProps.env ?? {}, "API_PUBLIC_ORIGIN")
            ),
          },
          { TaxKitApi: { url: undefined } }
        ).pipe(Effect.provideContext(result.compiled.services));
        expect(absent).toEqual({ api: null });
        const resolved = yield* Output.evaluate(
          {
            api: Option.getOrUndefined(
              Record.get(websiteProps.env ?? {}, "API_PUBLIC_ORIGIN")
            ),
          },
          { TaxKitApi: { url: "https://fresh-api.example.com" } }
        ).pipe(Effect.provideContext(result.compiled.services));
        expect(resolved).toEqual({ api: "https://fresh-api.example.com" });
        return yield* Effect.void;
      }).pipe(
        Effect.provideService(AlchemyContext, localContext),
        Effect.provideService(Stage, "dev_native_graph_proof"),
        graphEnvironment,
        Effect.scoped
      )
  );
  it.live("refuses the address cycle without native provider precreation", () =>
    Effect.gen(function* () {
      const result = yield* graphFixture("without-precreate");
      expect(result.providerWrites).toBe(0);
      expect(Exit.isFailure(result.planned)).toBe(true);
      if (Exit.isFailure(result.planned)) {
        expect(Cause.pretty(result.planned.cause)).toContain(
          "UnsatisfiedResourceCycle"
        );
        expect(Cause.pretty(result.planned.cause)).toContain(
          "TaxKitApi, TaxKitWebsite"
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
          ...Array.drop(deploymentSecrets(context), 1),
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
      expect(dopplerConfig(yield* checkedStage(stage))).toBe(config);
    })
  );
  it.effect.each(["prod-2", "pr-0", "dev", "private-stage-sentinel"])(
    "rejects an invalid stage without retaining its value: %s",
    (stage) =>
      Effect.gen(function* () {
        const exit = yield* checkedStage(stage).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.pretty(exit.cause)).toContain(
            "The TaxKit stage name is not supported"
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
          ...Array.drop(deploymentSecrets(context), 1),
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
        secrets: deploymentSecrets,
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
          secrets: deploymentSecrets,
          state: inMemoryState(),
        })(Effect.void).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.pretty(exit.cause)).toContain(
            "The TaxKit stage name is not supported"
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

describe("Website build-input hash", () => {
  it.live(
    "changes for package sources, manifests and docs content, not tests, READMEs, CHANGELOGs or installed files",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fs.makeTempDirectoryScoped({
          prefix: "taxkit-website-memo-",
        });
        const write = (relative: string, text: string) =>
          fs
            .makeDirectory(path.dirname(path.join(directory, relative)), {
              recursive: true,
            })
            .pipe(
              Effect.andThen(
                fs.writeFileString(path.join(directory, relative), text)
              )
            );
        // Alchemy reads .gitignore up to the folder holding .git, so use the
        // repository's own.
        yield* fs.makeDirectory(path.join(directory, ".git"));
        yield* fs.copyFile(
          yield* path.fromFileUrl(new URL("../../.gitignore", import.meta.url)),
          path.join(directory, ".gitignore")
        );
        // Flat, transport-nested and rule-nested packages, manifests,
        // tsconfigs, authored documentation and the lockfile are inputs.
        const inputs = [
          "apps/web/src/server.ts",
          "packages/content/src/service.ts",
          "packages/content/package.json",
          "packages/api/http/src/routes.ts",
          "packages/api/http/tsconfig.json",
          "packages/rules/au/pay/src/index.ts",
          "packages/rules/au/pay/package.json",
          "content/docs/start/quickstart.mdx",
          "content/docs/navigation.json",
          "tsconfig.base.json",
          "bun.lock",
        ];
        yield* Effect.forEach(inputs, (input) => write(input, "original"), {
          discard: true,
        });
        const props = {
          vite: {
            memo: websiteBuildMemo,
            rootDir: path.join(directory, "apps/web"),
          },
        };
        const artifacts = makeScopedArtifacts(createArtifactStore(), "Website");
        const source = yield* resolveSource(props).pipe(
          Effect.provideService(Artifacts, artifacts)
        );
        const context = makeSourceContext({
          compatibility: workerCompatibility,
          fqn: "TaxKitWebsite",
          id: "TaxKitWebsite",
          props,
          stack: { name: "TaxKitApps", stage: "dev_website_memo" },
          workerName: "taxkit-website-memo",
        });
        // A previous build may have recorded auto-detected workspaces; the
        // explicit empty workspace list keeps whole package folders out.
        const hashAfter = (additionalWorkspaces: string[]) =>
          source
            .hash(context, {
              additionalWorkspaces,
              assets: undefined,
              bundle: undefined,
              input: undefined,
            })
            .pipe(
              Effect.map(({ input }) => input),
              Effect.provideService(Artifacts, artifacts)
            );
        const hash = hashAfter([]);
        const original = yield* hash;
        expect(original).toBeDefined();
        expect(yield* hash).toBe(original);
        yield* Effect.forEach(
          inputs,
          (input) =>
            Effect.gen(function* () {
              yield* write(input, "changed");
              expect(yield* hash, input).not.toBe(original);
              yield* write(input, "original");
              expect(yield* hash, input).toBe(original);
            }),
          { discard: true }
        );
        // Version-packages edits, tests, installed links, build output,
        // generated sources and API-only code never reach the hash.
        yield* Effect.forEach(
          [
            "packages/content/CHANGELOG.md",
            "packages/content/README.md",
            "packages/rules/au/pay/CHANGELOG.md",
            "packages/content/test/service.test.ts",
            "packages/api/http/test/routes.test.ts",
            "packages/infrastructure/test/hostnames.test.ts",
            "packages/content/node_modules/effect/src/index.ts",
            "packages/api/http/node_modules/effect/src/index.ts",
            "packages/rules/au/pay/node_modules/effect/src/index.ts",
            "packages/content/node_modules/effect/package.json",
            "packages/content/dist/schemas.js",
            "apps/web/node_modules/dep/index.js",
            "apps/web/dist/server/index.js",
            "apps/api/src/worker.ts",
          ],
          (ignored) =>
            write(ignored, "ignored").pipe(
              Effect.andThen(hash),
              Effect.tap((value) =>
                Effect.sync(() => {
                  expect(value, ignored).toBe(original);
                })
              )
            ),
          { discard: true }
        );
        expect(yield* hashAfter(["../../packages/content"])).toBe(original);
      }).pipe(Effect.provide(BunServices.layer), Effect.scoped)
  );
});
