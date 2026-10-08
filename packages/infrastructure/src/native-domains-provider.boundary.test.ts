import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import { AlchemyContext } from "alchemy/AlchemyContext";
import {
  ArtifactStore,
  createArtifactStore,
  scopedArtifacts,
} from "alchemy/Artifacts";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { CredentialsStore } from "alchemy/Auth/Credentials";
import { ProfileStore } from "alchemy/Auth/Profile";
import {
  Providers,
  Credentials,
  CloudflareEnvironment,
} from "alchemy/Cloudflare";
import { LiveWorkerProvider, Worker } from "alchemy/Cloudflare/Workers";
import { InstanceId } from "alchemy/InstanceId";
import { layerNonInteractive } from "alchemy/Interaction";
import * as Provider from "alchemy/Provider";
import * as Stack from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import {
  Array,
  Cause,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Option,
  Record,
  Redacted,
  Ref,
  Match,
  Predicate,
  Schema,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

const account = "00000000000000000000000000000078";
const zone = "00000000000000000000000000007800";
const name = "native-domain-provider-fixture";
const foreign = {
  action: "redirect",
  action_parameters: {
    from_value: {
      preserve_query_string: true,
      status_code: 301,
      target_url: { value: "https://other-target.example.com" },
    },
  },
  description: "foreign-preserved-rule",
  enabled: true,
  expression: 'http.host eq "other.example.com"',
  id: "foreign-rule-id",
  last_updated: "2026-10-07T00:00:00Z",
  version: "1",
};
const ProviderScenario = Schema.Literals(["forbidden", "absent", "existing"]);
const ProviderReply = Schema.fromJsonString(
  Schema.Struct({
    errors: Schema.Array(
      Schema.Struct({ code: Schema.Int, message: Schema.String })
    ),
    messages: Schema.Array(Schema.String),
    result: Schema.Unknown,
    success: Schema.Boolean,
  })
);
const mockProviderSuccess = (result: typeof Schema.Unknown.Type) => ({
  errors: [],
  result,
  status: 200,
});
const providerFixture = Effect.fnUntraced(function* (
  mode: typeof ProviderScenario.Type
) {
  const fs = yield* FileSystem.FileSystem;
  const temp = yield* fs.makeTempDirectoryScoped({
    prefix: "taxkit-domain-provider-probe-",
  });
  const main = `${temp}/fixture.mjs`;
  yield* fs.writeFileString(
    main,
    'export default { fetch() { return new Response("fixture") } };\n'
  );
  const calls = yield* Ref.make<
    readonly { method: string; path: string; body: string }[]
  >([]);
  const client = HttpClient.make((request) =>
    Effect.gen(function* () {
      const path = new URL(request.url).pathname;
      const body = Match.value(request.body).pipe(
        Match.tag("Uint8Array", ({ body: bytes }) =>
          new TextDecoder().decode(bytes)
        ),
        Match.orElse(({ _tag }) => _tag)
      );
      yield* Ref.update(calls, (x) =>
        Array.append(x, { body, method: request.method, path })
      );
      const reply = Match.value({ method: request.method, path }).pipe(
        Match.when(
          (v) =>
            v.path.endsWith(
              "/rulesets/phases/http_request_dynamic_redirect/entrypoint"
            ) && v.method === "GET",
          () =>
            Match.value(mode).pipe(
              Match.when("forbidden", () => ({
                errors: [
                  { code: 10_000, message: "fixture authentication refused" },
                ],
                result: null,
                status: 403,
              })),
              Match.when("absent", () => ({
                errors: [
                  {
                    code: 10_003,
                    message:
                      "could not find entrypoint ruleset in the http_request_dynamic_redirect phase",
                  },
                ],
                result: null,
                status: 404,
              })),
              Match.when("existing", () =>
                mockProviderSuccess({
                  id: "fixture-ruleset",
                  kind: "zone",
                  name: "zone entrypoint",
                  phase: "http_request_dynamic_redirect",
                  rules: [foreign],
                  version: "1",
                })
              ),
              Match.exhaustive
            )
        ),
        Match.when(
          (v) =>
            v.path.endsWith(
              "/rulesets/phases/http_request_dynamic_redirect/entrypoint"
            ) && v.method === "PUT",
          () =>
            mockProviderSuccess({
              id: "fixture-ruleset",
              kind: "zone",
              name: "zone entrypoint",
              phase: "http_request_dynamic_redirect",
              rules: [],
              version: "2",
            })
        ),
        Match.when(
          (v) => v.path.endsWith("/workers/domains") && v.method === "GET",
          () =>
            mockProviderSuccess([
              {
                environment: "production",
                hostname: "example.com",
                id: "domain-one",
                service: name,
                zone_id: zone,
                zone_name: "example.com",
              },
              {
                environment: "production",
                hostname: "www.example.com",
                id: "domain-two",
                service: name,
                zone_id: zone,
                zone_name: "example.com",
              },
            ])
        ),
        Match.when(
          (v) => v.path.endsWith(`/zones/${zone}`) && v.method === "GET",
          () =>
            mockProviderSuccess({
              account: { id: account },
              id: zone,
              name: "example.com",
              name_servers: ["ns1.example.com", "ns2.example.com"],
              paused: false,
              status: "active",
              type: "full",
            })
        ),
        Match.when(
          (v) => v.path.endsWith("/settings") && v.method === "GET",
          () => mockProviderSuccess({ bindings: [], tags: [] })
        ),
        Match.when(
          (v) => v.path.endsWith("/subdomain") && v.path.includes("/scripts/"),
          () => mockProviderSuccess({ enabled: true, previews_enabled: true })
        ),
        Match.when(
          (v) => v.path.endsWith("/workers/subdomain"),
          () => mockProviderSuccess({ subdomain: "fixture" })
        ),
        Match.when(
          (v) =>
            v.path.endsWith(`/workers/scripts/${name}`) && v.method === "PUT",
          () =>
            mockProviderSuccess({
              etag: "fixture-etag",
              id: "fixture-worker-id",
              modified_on: "2026-10-07T00:00:00Z",
            })
        ),
        Match.when(
          (v) => v.path.endsWith("/schedules"),
          () => mockProviderSuccess({ schedules: [] })
        ),
        Match.when(
          (v) => v.path.endsWith("/workers/scripts") && v.method === "GET",
          () =>
            mockProviderSuccess([
              { etag: "fixture-etag", id: name, tag: "fixture-worker-id" },
            ])
        ),
        Match.option
      );
      const selected = yield* Option.match(reply, {
        onNone: () => Effect.die("Unexpected native provider fixture request"),
        onSome: Effect.succeed,
      });
      const encoded = yield* Schema.encodeEffect(ProviderReply)({
        errors: selected.errors,
        messages: [],
        result: selected.result,
        success: selected.status === 200,
      }).pipe(Effect.orDie);
      return HttpClientResponse.fromWeb(
        request,
        new Response(encoded, {
          headers: { "content-type": "application/json" },
          status: selected.status,
        })
      );
    })
  );
  const blocked = Effect.die(
    "Credential/profile/provider operations are forbidden"
  );
  const fixtureProvider = Provider.effect(
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
  const compiled = yield* Stack.make({
    name: "TaxKitNativeDomainProviderProof",
    providers: Layer.effect(
      Providers,
      Provider.collection([Worker]).pipe(Effect.provide(fixtureProvider))
    ),
    state: inMemoryState(),
  })(
    Worker("DomainFixture", {
      bundle: false,
      domain: {
        name: "example.com",
        redirects: ["www.example.com"],
        zoneId: zone,
      },
      main,
      name,
      workersDev: true,
    })
  ).pipe(
    Effect.provideService(Stage, "dev_native_domain_provider_proof"),
    Effect.provideService(AlchemyContext, {
      adopt: false,
      dev: false,
      dotAlchemy: temp,
    }),
    Effect.provide(
      Layer.mergeAll(
        Layer.succeed(ArtifactStore, createArtifactStore()),
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
        HttpClient.layerMergedContext(Effect.succeed(client))
      )
    )
  );
  const resource = Record.get(compiled.resources, "DomainFixture").pipe(
    Option.getOrElse(() => expect.fail("Expected native fixture Worker"))
  );
  const result = yield* Effect.gen(function* () {
    const provider = yield* Worker.Provider;
    return yield* provider.reconcile({
      bindings: [],
      fqn: resource.FQN,
      id: resource.LogicalId,
      instanceId: "fixture-instance",
      news: resource.Props,
      olds: undefined,
      output: undefined,
      session: {
        done: () => Effect.void,
        emit: () => Effect.void,
        note: () => Effect.void,
      },
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(LiveWorkerProvider(), scopedArtifacts(resource.FQN))
    ),
    Effect.provideContext(compiled.services),
    Effect.provideService(InstanceId, "fixture-instance"),
    Effect.provideService(
      Credentials,
      Effect.succeed({
        apiBaseUrl: "https://provider.invalid/client/v4",
        apiToken: Redacted.make("fixture-only"),
        type: "apiToken",
      })
    ),
    Effect.provideService(
      CloudflareEnvironment,
      Effect.succeed({
        accountId: account,
        apiToken: Redacted.make("fixture-only"),
        source: { type: "env" },
        type: "apiToken",
      })
    ),
    Effect.exit,
    Effect.timeout("3 seconds")
  );
  const captured = yield* Ref.get(calls);
  return { calls: captured, result };
});

describe("actual installed native redirect provider", () => {
  it.live("refuses a failed shared-rule read before any rule replacement", () =>
    Effect.gen(function* () {
      const fixture = yield* providerFixture("forbidden");
      expect(Exit.isFailure(fixture.result)).toBe(true);
      if (Exit.isFailure(fixture.result)) {
        expect(
          Predicate.isTagged(Cause.squash(fixture.result.cause), "Forbidden")
        ).toBe(true);
      }
      expect(
        Array.filter(
          fixture.calls,
          (x) => x.method === "GET" && x.path.includes("/rulesets/")
        )
      ).toHaveLength(1);
      expect(
        Array.filter(
          fixture.calls,
          (x) => x.method === "PUT" && x.path.includes("/rulesets/")
        )
      ).toHaveLength(0);
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
  it.live.each(["absent", "existing"] as const)(
    "converges after a checked %s reply",
    (mode) =>
      Effect.gen(function* () {
        const fixture = yield* providerFixture(mode);
        expect(Exit.isSuccess(fixture.result)).toBe(true);
        const calls = Array.filter(
          fixture.calls,
          (x) => x.method === "PUT" && x.path.includes("/rulesets/")
        );
        expect(calls).toHaveLength(1);
        const call = Array.head(calls).pipe(
          Option.getOrElse(() => expect.fail("Expected one rule request"))
        );
        const rules = yield* Schema.decodeEffect(
          Schema.fromJsonString(
            Schema.Struct({
              rules: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
            })
          )
        )(call.body);
        expect(rules.rules).toHaveLength(mode === "existing" ? 2 : 1);
        if (mode === "existing") {
          expect(
            Array.head(rules.rules).pipe(
              Option.getOrElse(() =>
                expect.fail("Expected retained foreign rule")
              )
            )
          ).toEqual({
            action: "redirect",
            action_parameters: {
              from_value: {
                preserve_query_string: true,
                status_code: 301,
                target_url: { value: "https://other-target.example.com" },
              },
            },
            description: "foreign-preserved-rule",
            enabled: true,
            expression: 'http.host eq "other.example.com"',
            id: "foreign-rule-id",
          });
        }
        const ours = Array.last(rules.rules).pipe(
          Option.getOrElse(() => expect.fail("Expected native redirect rule"))
        );
        expect(ours).toEqual({
          action: "redirect",
          action_parameters: {
            from_value: {
              preserve_query_string: true,
              status_code: 301,
              target_url: {
                expression:
                  'concat("https://example.com", http.request.uri.path)',
              },
            },
          },
          description:
            "alchemy:worker:native-domain-provider-fixture:redirect:www.example.com",
          enabled: true,
          expression: 'http.host eq "www.example.com"',
        });
        if (Exit.isSuccess(fixture.result)) {
          expect(fixture.result.value.url).toBe("https://example.com");
        }
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
});
