import {
  Providers,
  Credentials,
  CloudflareEnvironment,
} from "@alchemy.run/cloudflare";
import { LiveWorkerProvider, Worker } from "@alchemy.run/cloudflare/Workers";
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
import { layerNonInteractive } from "alchemy/Interaction";
import * as Provider from "alchemy/Provider";
import { ResourceContext } from "alchemy/ResourceContext";
import * as Stack from "alchemy/Stack";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import {
  Function as EffectFunction,
  Array,
  Cause,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Option,
  Predicate,
  Redacted,
  Ref,
  Match,
  Schema,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

// Alchemy erases provider errors to any. Preserve their cause as checked failure data at this native boundary.
class NativeProviderError extends Schema.TaggedError<
  NativeProviderError,
  { readonly brand: unique symbol }
>()("NativeProviderError", { cause: Schema.Defect() }) {}

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
    readonly {
      method: string;
      path: string;
      body: string;
    }[]
  >([]);
  const client = HttpClient.make((request) =>
    Effect.gen(function* () {
      const path = new URL(request.url).pathname;
      const body = Match.value(request.body).pipe(
        Match.tag("Uint8Array", ({ body: bytes }) =>
          new TextDecoder().decode(bytes)
        ),
        Match.tag("Empty", () => "Empty"),
        Match.tag("Raw", () => "Raw"),
        Match.tag("FormData", () => "FormData"),
        Match.tag("Stream", () => "Stream"),
        Match.exhaustive
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
          (v) =>
            v.path.endsWith(`/workers/scripts/${name}/deployments`) &&
            v.method === "GET",
          () =>
            mockProviderSuccess({
              deployments: [
                {
                  created_on: "2026-10-07T00:00:00Z",
                  id: "fixture-deployment-id",
                  source: "api",
                  strategy: "percentage",
                  versions: [
                    { percentage: 100, version_id: "fixture-version-id" },
                  ],
                },
              ],
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
        onNone: () =>
          Effect.die(
            `Unexpected native provider fixture request: ${request.method} ${path}`
          ),
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
            scoped() {
              return this;
            },
            write: () => blocked,
          })
        ),
        HttpClient.layerMergedContext(Effect.succeed(client))
      )
    )
  );
  const resource = compiled.output;
  const result = yield* Effect.gen(function* () {
    const provider = yield* Worker.Provider;
    const checkedReconcile: Effect.Effect<
      Effect.Success<ReturnType<typeof provider.reconcile>>,
      NativeProviderError
    > = provider
      .reconcile({
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
      })
      .pipe(Effect.mapError((cause) => new NativeProviderError({ cause })));
    return yield* checkedReconcile;
  }).pipe(
    Effect.provide(
      Layer.mergeAll(LiveWorkerProvider(), scopedArtifacts(resource.FQN))
    ),
    Effect.provideContext(compiled.services),
    Effect.provideService(ResourceContext, {
      fqn: resource.FQN,
      instanceId: "fixture-instance",
      logicalId: resource.LogicalId,
      type: resource.Type,
    }),
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
  it.live("refuses redirect writes after a forbidden shared-rule read", () =>
    Effect.gen(function* () {
      const fixture = yield* providerFixture("forbidden");
      const reads = EffectFunction.pipe(
        fixture.calls,
        Array.filter((x) => x.method === "GET" && x.path.includes("/rulesets/"))
      );
      expect(reads).toHaveLength(1);
      EffectFunction.pipe(Exit.isFailure(fixture.result), (actual) => {
        expect(actual).toBeTruthy();
      });
      if (Exit.isFailure(fixture.result)) {
        EffectFunction.pipe(
          fixture.result.cause.reasons,
          Array.some(
            (reason) =>
              Cause.isFailReason(reason) &&
              Schema.is(NativeProviderError)(reason.error) &&
              Predicate.isTagged(reason.error.cause, "Forbidden")
          ),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
      }
      EffectFunction.pipe(
        fixture.calls,
        Array.filter(
          (x) => x.method === "PUT" && x.path.includes("/rulesets/")
        ),
        (actual) => {
          expect(actual).toHaveLength(0);
        }
      );
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
  it.live.each(["absent", "existing"] as const)(
    "converges after a checked %s reply",
    (mode) =>
      Effect.gen(function* () {
        const fixture = yield* providerFixture(mode);
        const succeeded = Exit.isSuccess(fixture.result);
        const message = Exit.match(fixture.result, {
          onFailure: Cause.pretty,
          onSuccess: () => "",
        });
        expect(succeeded, message).toBeTruthy();
        const calls = EffectFunction.pipe(
          fixture.calls,
          Array.filter(
            (x) => x.method === "PUT" && x.path.includes("/rulesets/")
          )
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
        expect(rules.rules).toHaveLength(
          Match.value(mode).pipe(
            Match.when("existing", (): 2 => 2),
            Match.orElse((): 1 => 1)
          )
        );
        if (mode === "existing") {
          EffectFunction.pipe(
            Array.head(rules.rules).pipe(
              Option.getOrElse(() =>
                expect.fail("Expected retained foreign rule")
              )
            ),
            (actual) => {
              expect(actual).toStrictEqual({
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
          );
        }
        const ours = Array.last(rules.rules).pipe(
          Option.getOrElse(() => expect.fail("Expected native redirect rule"))
        );
        expect(ours).toStrictEqual({
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
          expect(fixture.result.value.versionId).toBe("fixture-version-id");
          expect(fixture.result.value.deploymentId).toBe(
            "fixture-deployment-id"
          );
        }
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
});
