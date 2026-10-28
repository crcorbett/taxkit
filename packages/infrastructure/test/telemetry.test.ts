import * as Axiom from "@alchemy.run/axiom";
import * as Cloudflare from "@alchemy.run/cloudflare";
import { ObservabilityDestination } from "@alchemy.run/cloudflare/Workers";
import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { ArtifactStore, createArtifactStore } from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { CredentialsStore } from "alchemy/Auth/Credentials";
import { ProfileStore } from "alchemy/Auth/Profile";
import { layerNonInteractive } from "alchemy/Interaction";
import * as Output from "alchemy/Output";
import * as Plan from "alchemy/Plan";
import * as Provider from "alchemy/Provider";
import * as Stack from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import type { ResourceState } from "alchemy/State";
import {
  Array,
  Cause,
  Effect,
  Exit,
  Layer,
  Option,
  Order,
  Record,
  Redacted,
  Ref,
  Schema,
} from "effect";
import { HttpClient } from "effect/http";

import { declareTaxKitObservability } from "../src/axiom/resources.js";
import { declareTaxKitTraceExport } from "../src/trace-export.js";

// A synthetic stand-in for the retained ingest token. It is not a credential.
const ingestSentinel = "synthetic-ingest-token-fixture";

const environment = Effect.provide(
  Layer.mergeAll(
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
  dotAlchemy: "tmp/telemetry-graph-proof",
};

// Persisted records of the foreign resources the telemetry stacks reference:
// Site's two signal datasets and TaxKit's retained ingest token.
const persisted = (
  resourceType: string,
  logicalId: string,
  attr: Record<string, unknown>
): ResourceState => ({
  attr,
  bindings: [],
  downstream: [],
  fqn: logicalId,
  instanceId: `proof-${logicalId}`,
  logicalId,
  namespace: undefined,
  props: {},
  providerVersion: 0,
  resourceType,
  status: "created",
});
const foreignState = () =>
  inMemoryState({
    CooperCorbettSiteCloudflare: {
      prod: {
        SiteProdLogsDataset: persisted("Axiom.Dataset", "SiteProdLogsDataset", {
          name: "site-prod-logs",
          otelLogsEndpoint: "https://axiom.example.test/v1/logs",
        }),
        SiteProdTracesDataset: persisted(
          "Axiom.Dataset",
          "SiteProdTracesDataset",
          {
            name: "site-prod-traces",
            otelTracesEndpoint: "https://axiom.example.test/v1/traces",
          }
        ),
      },
    },
    TaxKitObservability: {
      prod: {
        TaxKitTelemetryIngest: persisted(
          "Axiom.ApiToken",
          "TaxKitTelemetryIngest",
          { id: "proof-token", token: Redacted.make(ingestSentinel) }
        ),
      },
    },
  });

// Every provider refuses writes and enumeration; planning reads state only.
const forbiddenWrites = Effect.fnUntraced(function* () {
  const writes = yield* Ref.make(0);
  const forbidden = Ref.update(writes, (count) => count + 1).pipe(
    Effect.andThen(Effect.die("Provider writes are forbidden in graph proof"))
  );
  return { forbidden, writes };
});

const observabilityStack = Effect.fnUntraced(function* (stage: string) {
  const { forbidden, writes } = yield* forbiddenWrites();
  const compiled = yield* Stack.make({
    name: "TaxKitObservability",
    providers: Layer.effect(
      Axiom.Providers,
      Provider.collection([Axiom.ApiToken, Axiom.Dashboard]).pipe(
        Effect.provide(
          Layer.mergeAll(
            Provider.succeed(Axiom.ApiToken, {
              delete: () => forbidden,
              diff: () => Effect.void,
              read: ({ output }) => Effect.succeed(output),
              reconcile: () => forbidden,
            }),
            Provider.succeed(Axiom.Dashboard, {
              delete: () => forbidden,
              diff: () => Effect.void,
              read: ({ output }) => Effect.succeed(output),
              reconcile: () => forbidden,
            })
          )
        )
      )
    ),
    // A first deploy: the stack has no saved token or dashboards yet.
    state: inMemoryState(),
  })(declareTaxKitObservability).pipe(
    Effect.provideService(Stage, stage),
    Effect.exit
  );
  return { compiled, writes };
});

const traceExportStack = Effect.fnUntraced(function* (stage: string) {
  const { forbidden, writes } = yield* forbiddenWrites();
  const compiled = yield* Stack.make({
    name: "TaxKitTraceExport",
    providers: Layer.effect(
      Cloudflare.Providers,
      Provider.collection([ObservabilityDestination]).pipe(
        Effect.provide(
          Provider.succeed(ObservabilityDestination, {
            delete: () => forbidden,
            diff: () => Effect.void,
            read: ({ output }) => Effect.succeed(output),
            reconcile: () => forbidden,
          })
        )
      )
    ),
    state: foreignState(),
  })(declareTaxKitTraceExport).pipe(
    Effect.provideService(Stage, stage),
    Effect.exit
  );
  return { compiled, writes };
});

const plan = <A>(compiled: Stack.CompiledStack<A>) =>
  Plan.make(compiled).pipe(
    Effect.provideContext(compiled.services),
    Effect.timeout("1 second")
  );

// Evaluate a planned member's props and removal policy against state.
const member = (compiled: Stack.CompiledStack, id: string) =>
  Record.get(compiled.resources, id).pipe(
    Effect.fromOption,
    Effect.flatMap((resource) => {
      const props: unknown = resource.Props;
      return Output.evaluate({ props, removal: resource.RemovalPolicy }, {});
    }),
    Effect.provideContext(compiled.services)
  );

const Query = Schema.Struct({ query: Schema.Struct({ apl: Schema.String }) });
const Dashboard = Schema.Struct({
  props: Schema.Struct({
    dashboard: Schema.Struct({ charts: Schema.Array(Schema.Unknown) }),
    uid: Schema.String,
  }),
  removal: Schema.Literal("retain"),
});
const Destination = Schema.Struct({
  props: Schema.Struct({
    enabled: Schema.Literal(true),
    headers: Schema.Struct({
      Authorization: Schema.Redacted(Schema.String),
      "X-Axiom-Dataset": Schema.String,
    }),
    logpushDataset: Schema.String,
    name: Schema.String,
    url: Schema.String,
  }),
  removal: Schema.Literal("retain"),
});

const proof = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(AlchemyContext, localContext),
    environment,
    Effect.scoped
  );

describe("production-only telemetry stacks", () => {
  it.live.each(["pr-214", "dev_ci_user"])(
    "refuses stage %s before any resource",
    (stage) =>
      proof(
        Effect.gen(function* () {
          const observability = yield* observabilityStack(stage);
          const traceExport = yield* traceExportStack(stage);
          const refusal = "TaxKit telemetry stacks require the prod stage";
          expect([
            Exit.isFailure(observability.compiled) &&
              Cause.pretty(observability.compiled.cause).includes(refusal),
            Exit.isFailure(traceExport.compiled) &&
              Cause.pretty(traceExport.compiled.cause).includes(refusal),
          ]).toEqual([true, true]);
          expect([
            yield* Ref.get(observability.writes),
            yield* Ref.get(traceExport.writes),
          ]).toEqual([0, 0]);
        })
      )
  );

  it.live("plans a retained ingest-only token and four dashboards", () =>
    proof(
      Effect.gen(function* () {
        const stack = yield* observabilityStack("prod");
        const compiled = yield* stack.compiled;
        const planned = yield* plan(compiled);
        expect(yield* Ref.get(stack.writes)).toBe(0);
        expect(
          Array.sort(Record.keys(planned.resources), Order.String)
        ).toEqual([
          "TaxKitRequestFailures",
          "TaxKitRequestLatency",
          "TaxKitRequestOverview",
          "TaxKitTelemetryHealth",
          "TaxKitTelemetryIngest",
        ]);
        expect(
          Array.every(
            Record.values(planned.resources),
            ({ action }) => action === "create"
          )
        ).toBe(true);
        expect(compiled.output).toEqual({ dashboardCount: 4 });
        // Ingest only, on exactly Site's three shared datasets, and retained.
        expect(yield* member(compiled, "TaxKitTelemetryIngest")).toEqual({
          props: {
            datasetCapabilities: {
              "site-prod-logs": { ingest: ["create"] },
              "site-prod-metrics": { ingest: ["create"] },
              "site-prod-traces": { ingest: ["create"] },
            },
            description: "Ingest TaxKit Production Worker telemetry only",
            name: "taxkit-telemetry-ingest",
          },
          removal: "retain",
        });
        const dashboards = yield* Effect.forEach(
          [
            "TaxKitRequestOverview",
            "TaxKitRequestFailures",
            "TaxKitRequestLatency",
            "TaxKitTelemetryHealth",
          ],
          (id) =>
            member(compiled, id).pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(Dashboard))
            )
        );
        expect(Array.map(dashboards, ({ props }) => props.uid)).toEqual([
          "taxkit-request-overview",
          "taxkit-request-failures",
          "taxkit-request-latency",
          "taxkit-telemetry-health",
        ]);
        // Every chart reads only TaxKit's records in the shared logs dataset,
        // never another signal, a URL, a header or a calculation field.
        const queries = Array.flatMap(dashboards, ({ props }) =>
          Array.filterMap(props.dashboard.charts, (chart) =>
            Schema.decodeUnknownResult(Query)(chart)
          )
        );
        expect(queries.length).toBeGreaterThan(15);
        expect(
          Array.filter(
            queries,
            ({ query }) =>
              !query.apl.includes("['site-prod-logs']") ||
              !query.apl.includes("Service in ('taxkit-api', 'taxkit-web')") ||
              /site-prod-traces|site-prod-metrics|url|header|salary|income|gross/iu.test(
                query.apl
              )
          )
        ).toEqual([]);
      })
    )
  );

  it.live("plans retained log and trace destinations from the token", () =>
    proof(
      Effect.gen(function* () {
        const stack = yield* traceExportStack("prod");
        const compiled = yield* stack.compiled;
        const planned = yield* plan(compiled);
        expect(yield* Ref.get(stack.writes)).toBe(0);
        expect(
          Array.sort(Record.keys(planned.resources), Order.String)
        ).toEqual(["TaxKitAxiomLogs", "TaxKitAxiomTraces"]);
        const destinations = yield* Effect.forEach(
          ["TaxKitAxiomLogs", "TaxKitAxiomTraces"],
          (id) =>
            member(compiled, id).pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(Destination))
            )
        );
        expect(
          Array.map(destinations, ({ props }) => [
            props.name,
            props.logpushDataset,
            props.url,
            Record.get(props.headers, "X-Axiom-Dataset"),
          ])
        ).toEqual([
          [
            "taxkit-axiom-logs",
            "opentelemetry-logs",
            "https://axiom.example.test/v1/logs",
            Option.some("site-prod-logs"),
          ],
          [
            "taxkit-axiom-traces",
            "opentelemetry-traces",
            "https://axiom.example.test/v1/traces",
            Option.some("site-prod-traces"),
          ],
        ]);
        // The bearer header comes from the retained token. Compare without
        // printing it.
        expect(
          Array.every(
            destinations,
            ({ props }) =>
              Redacted.value(props.headers.Authorization) ===
              `Bearer ${ingestSentinel}`
          )
        ).toBe(true);
        // Workers read only the two names; headers never become outputs.
        expect(Array.sort(Record.keys(compiled.output), Order.String)).toEqual([
          "logsDestinationName",
          "tracesDestinationName",
        ]);
      })
    )
  );
});
