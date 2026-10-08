import { BunHttpServer } from "@effect/platform-bun";
import { expect, it } from "@effect/vitest";
import { PostHogProjectId } from "@taxkit/analytics/schemas";
import {
  Array,
  Cause,
  ConfigProvider,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Match,
  Option,
  Redacted,
  Ref,
  Schema,
  Stream,
} from "effect";
import {
  Headers,
  FetchHttpClient,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { TestClock } from "effect/testing";

import type { PostHogManagementError } from "./errors.js";
import { PostHogManagementLive } from "./management.adapter.layer.js";
import {
  PostHogManagedName,
  PostHogOrganisationId,
  ProjectDefinition,
  desiredProjectPrivacy,
} from "./schemas.js";
import { PostHogManagement } from "./service.js";

const organisation = "00000000-0000-4000-8000-000000000079";
const definition = ProjectDefinition.make({
  marker: "taxkit:posthog:shared:v1",
  name: PostHogManagedName.make("TaxKit"),
  organisation: PostHogOrganisationId.make(organisation),
  region: "us",
});
const id = PostHogProjectId.make(79);
it.effect.each([
  "taxkit:posthog:production:v1",
  "taxkit:posthog:preview:v1",
  "foreign:posthog:shared:v1",
])("refuses adopting the historical or foreign marker %s", (marker) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknownEffect(ProjectDefinition)({
      ...definition,
      marker,
    }).pipe(Effect.exit);
    expect(Exit.isFailure(decoded)).toBe(true);
  })
);

const project = {
  ...desiredProjectPrivacy,
  api_token: "phc_synthetic_taxkit_capture_fixture_only",
  id,
  name: definition.name,
  organization: organisation,
  product_description: definition.marker,
  secret_api_token: "PRIVATE9",
};
const base = `/api/organizations/${organisation}/projects/`;
const item = `${base}${id}/`;
const json = Schema.fromJsonString(Schema.Unknown);
const page = (
  results: readonly { readonly id: number }[],
  count = results.length,
  next: string | null = null
) => ({ count, next, results });
const getPage = (body: typeof Schema.Unknown.Type, offset = 0) => ({
  body,
  method: "GET",
  path: base,
  query: `limit=100&offset=${offset}`,
  status: 200,
});
const getProject = (
  body: typeof Schema.Unknown.Type = project,
  projectId = id,
  status = 200
) => ({ body, method: "GET", path: `${base}${projectId}/`, query: "", status });
const writeProject = (
  body: typeof Schema.Unknown.Type = project,
  status = 200,
  method = "POST"
) => ({
  body,
  method,
  path: method === "POST" ? base : item,
  query: "",
  status,
});
type Reply = ReturnType<typeof getPage>;

const fixture = Effect.fnUntraced(function* (
  replies: readonly Reply[],
  bodyMode: "ordinary" | "oversized" | "stalled" | "failed" = "ordinary"
) {
  const pending = yield* Ref.make(replies);
  const calls = yield* Ref.make<
    readonly {
      readonly body: Option.Option<typeof Schema.Unknown.Type>;
      readonly method: string;
      readonly path: string;
      readonly query: string;
      readonly authenticated: boolean;
      readonly manualRedirect: boolean;
      readonly credentialsOmitted: boolean;
      readonly tracingDisabled: boolean;
    }[]
  >([]);
  const closed = yield* Ref.make(0);
  const started = yield* Deferred.make<boolean>();
  const transport = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.gen(function* () {
        const url = yield* Option.match(HttpClientRequest.toUrl(request), {
          onNone: () => Effect.die("Fixture request has no URL"),
          onSome: Effect.succeed,
        });
        const body = yield* Match.value(request.body).pipe(
          Match.tag("Uint8Array", ({ body: bytes }) =>
            Schema.decodeUnknownEffect(json)(
              new TextDecoder().decode(bytes)
            ).pipe(Effect.map(Option.some))
          ),
          Match.orElse(() => Effect.succeed(Option.none()))
        );
        const init = yield* Effect.serviceOption(FetchHttpClient.RequestInit);
        const tracing = yield* HttpClient.TracerDisabledWhen;
        yield* Ref.update(calls, (current) =>
          Array.append(current, {
            authenticated: Option.contains(
              Headers.get(request.headers, "authorization"),
              "Bearer phx_synthetic_management_fixture_only"
            ),
            body,
            credentialsOmitted: Option.exists(
              init,
              (value) => value.credentials === "omit"
            ),
            manualRedirect: Option.exists(
              init,
              (value) => value.redirect === "manual"
            ),
            method: request.method,
            path: url.pathname,
            query: url.searchParams.toString(),
            tracingDisabled: tracing(request),
          })
        );
        const remaining = yield* Ref.getAndUpdate(pending, (current) =>
          Array.drop(current, 1)
        );
        const reply = yield* Option.match(Array.head(remaining), {
          onNone: () => Effect.die("Unexpected provider call"),
          onSome: Effect.succeed,
        });
        expect({
          method: request.method,
          path: url.pathname,
          query: url.searchParams.toString(),
        }).toEqual({
          method: reply.method,
          path: reply.path,
          query: reply.query,
        });
        const text = yield* Schema.encodeEffect(json)(reply.body);
        const response = HttpClientResponse.fromWeb(
          request,
          new Response(text, {
            headers: { "content-type": "application/json" },
            status: reply.status,
          })
        );
        return Match.value(bodyMode).pipe(
          Match.when("ordinary", () => response),
          Match.when("oversized", () => ({
            ...response,
            request,
            status: response.status,
            stream: Stream.make(
              new TextEncoder().encode("x".repeat(1_048_577))
            ),
          })),
          Match.when("stalled", () => ({
            ...response,
            request,
            status: response.status,
            stream: Stream.fromEffect(Deferred.succeed(started, true)).pipe(
              Stream.drain,
              Stream.concat(Stream.never),
              Stream.ensuring(Ref.update(closed, (count) => count + 1))
            ),
          })),
          Match.when("failed", () => ({
            ...response,
            request,
            status: response.status,
            stream: Stream.fail(
              new HttpClientError.HttpClientError({
                reason: new HttpClientError.DecodeError({
                  description: "PRIVATE9",
                  request,
                  response,
                }),
              })
            ),
          })),
          Match.exhaustive
        );
      }).pipe(
        Effect.mapError(
          () =>
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.TransportError({
                description: "Invalid synthetic management response",
                request,
              }),
            })
        )
      )
    )
  );
  const layer = PostHogManagementLive.pipe(
    Layer.provide(transport),
    Layer.provide(
      ConfigProvider.layerAdd(
        ConfigProvider.fromUnknown({
          POSTHOG_MANAGEMENT_KEY: "phx_synthetic_management_fixture_only",
        })
      )
    )
  );
  return { calls, closed, layer, pending, started };
});

it.effect(
  "closes the native management request when a redirect is refused",
  () =>
    Effect.gen(function* () {
      const seen = yield* Ref.make<readonly AbortSignal[]>([]);
      const http = HttpClient.make((request, _address, signal) =>
        Ref.update(seen, (items) => Array.append(items, signal)).pipe(
          Effect.as(
            HttpClientResponse.fromWeb(
              request,
              new Response("redirect", { status: 302 })
            )
          )
        )
      );
      const error = yield* PostHogManagement.use((service) =>
        service.readProject({ definition, id })
      ).pipe(
        Effect.provide(
          PostHogManagementLive.pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
            Layer.provide(
              ConfigProvider.layerAdd(
                ConfigProvider.fromUnknown({
                  POSTHOG_MANAGEMENT_KEY:
                    "phx_synthetic_management_fixture_only",
                })
              )
            )
          )
        ),
        Effect.flip
      );
      expect(error.reason).toBe("provider-failure");
      const signals = yield* Ref.get(seen);
      expect(signals).toHaveLength(1);
      expect(Array.every(signals, (signal) => signal.aborted)).toBe(true);
    })
);

const failure = <A>(outcome: Exit.Exit<A, PostHogManagementError>) =>
  Exit.match(outcome, {
    onFailure: (cause) =>
      Option.match(Cause.findErrorOption(cause), {
        onNone: () => "defect-or-interruption",
        onSome: (error) => error.reason,
      }),
    onSuccess: () => "success",
  });

it.effect(
  "reads every page and foreign project before selecting exact ownership",
  () =>
    Effect.gen(function* () {
      const foreignId = PostHogProjectId.make(75);
      const native = yield* fixture([
        getPage(
          page(
            [{ id: foreignId }],
            2,
            `https://us.posthog.com${base}?limit=100&offset=1`
          )
        ),
        getPage(page([{ id }], 2), 1),
        getProject(
          {
            id: foreignId,
            name: null,
            organization: organisation,
            product_description: null,
          },
          foreignId
        ),
        getProject(),
      ]);
      const found = yield* PostHogManagement.use((service) =>
        service.findProject(definition)
      ).pipe(Effect.provide(native.layer));
      expect(Option.isSome(found)).toBe(true);
      Option.match(found, {
        onNone: () => expect.fail("Owned project missing"),
        onSome: (value) => {
          expect(value.id).toBe(id);
          expect(Redacted.isRedacted(value.token)).toBe(true);
          expect(value).not.toHaveProperty("secret_api_token");
        },
      });
      const calls = yield* Ref.get(native.calls);
      expect(calls).toHaveLength(4);
      expect(
        Array.every(
          calls,
          (call) =>
            call.authenticated &&
            call.credentialsOmitted &&
            call.manualRedirect &&
            call.tracingDisabled
        )
      ).toBe(true);
      expect(yield* Ref.get(native.pending)).toEqual([]);
    })
);

it.effect.each([
  { body: { results: [] }, reason: "incomplete-inventory" },
  { body: page([], 1), reason: "incomplete-inventory" },
  { body: page([{ id }, { id }], 2), reason: "incomplete-inventory" },
  { body: page([], 1001), reason: "incomplete-inventory" },
  {
    body: page(
      [{ id }],
      2,
      `https://foreign.example${base}?limit=100&offset=1`
    ),
    reason: "incomplete-inventory",
  },
  {
    body: page([{ id }], 2, `https://us.posthog.com${base}?limit=100&offset=0`),
    reason: "incomplete-inventory",
  },
  {
    body: page(
      [{ id }],
      2,
      `https://us.posthog.com${base}?limit=100&offset=1&offset=1`
    ),
    reason: "incomplete-inventory",
  },
  {
    body: page(
      [{ id }],
      2,
      `https://us.posthog.com${base}?limit=100&offset=1&search=taxkit`
    ),
    reason: "incomplete-inventory",
  },
  {
    body: page(
      [{ id }],
      2,
      `https://us.posthog.com${base}?limit=100&offset=1#PRIVATE9`
    ),
    reason: "incomplete-inventory",
  },
])(
  "refuses an incomplete or unsafe project inventory ($reason)",
  ({ body, reason }) =>
    Effect.gen(function* () {
      const native = yield* fixture([getPage(body)]);
      const result = yield* PostHogManagement.use((service) =>
        service.createProject(definition)
      ).pipe(Effect.provide(native.layer), Effect.exit);
      expect(failure(result)).toBe(reason);
      expect(
        Array.map(yield* Ref.get(native.calls), (call) => call.method)
      ).toEqual(["GET"]);
    })
);

it.effect.each([
  { reason: "success", status: 404 },
  { reason: "permission-refused", status: 403 },
  { reason: "permission-refused", status: 401 },
  { reason: "provider-failure", status: 429 },
  { reason: "provider-failure", status: 500 },
])("only genuine 404 becomes absence ($status)", ({ status, reason }) =>
  Effect.gen(function* () {
    const native = yield* fixture([
      getProject({ detail: "PRIVATE9", type: "not_found" }, id, status),
    ]);
    const result = yield* PostHogManagement.use((service) =>
      service.readProject({ definition, id })
    ).pipe(Effect.provide(native.layer), Effect.exit);
    expect(failure(result)).toBe(reason);
    Exit.match(result, {
      onFailure: (cause) => {
        expect(Cause.pretty(cause)).not.toContain("PRIVATE9");
        expect(Cause.pretty(cause)).not.toContain("phx_");
      },
      onSuccess: (value) => expect(Option.isNone(value)).toBe(true),
    });
    expect(yield* Ref.get(native.calls)).toHaveLength(1);
  })
);

it.effect(
  "refuses matching names with foreign markers and duplicate ownership",
  () =>
    Effect.gen(function* () {
      const foreign = yield* fixture([
        getPage(page([{ id }])),
        getProject({ ...project, product_description: "foreign" }),
      ]);
      const refused = yield* PostHogManagement.use((service) =>
        service.createProject(definition)
      ).pipe(Effect.provide(foreign.layer), Effect.exit);
      expect(failure(refused)).toBe("foreign-resource");
      const duplicateId = PostHogProjectId.make(80);
      const ambiguous = yield* fixture([
        getPage(page([{ id }, { id: duplicateId }])),
        getProject(),
        getProject({ ...project, id: duplicateId }, duplicateId),
      ]);
      const result = yield* PostHogManagement.use((service) =>
        service.createProject(definition)
      ).pipe(Effect.provide(ambiguous.layer), Effect.exit);
      expect(failure(result)).toBe("ambiguous-ownership");
      expect(
        Array.every(
          yield* Ref.get(ambiguous.calls),
          (call) => call.method === "GET"
        )
      ).toBe(true);
    })
);

it.effect(
  "creates once after complete absence and verifies supported privacy fields",
  () =>
    Effect.gen(function* () {
      const native = yield* fixture([
        getPage(page([])),
        writeProject(),
        getProject(),
      ]);
      const result = yield* PostHogManagement.use((service) =>
        service.createProject(definition)
      ).pipe(Effect.provide(native.layer));
      expect(result.id).toBe(id);
      const calls = yield* Ref.get(native.calls);
      expect(Array.map(calls, (call) => call.method)).toEqual([
        "GET",
        "POST",
        "GET",
      ]);
      Option.match(Array.get(calls, 1), {
        onNone: () => expect.fail("Create call missing"),
        onSome: (call) =>
          Option.match(call.body, {
            onNone: () => expect.fail("Create body missing"),
            onSome: (body) =>
              expect(body).toEqual({
                ...desiredProjectPrivacy,
                name: definition.name,
                product_description: definition.marker,
              }),
          }),
      });
    })
);

it.effect(
  "finds a created project after an uncertain write without a second POST",
  () =>
    Effect.gen(function* () {
      const native = yield* fixture([
        getPage(page([])),
        writeProject({ message: "PRIVATE9" }, 500),
        getPage(page([{ id }])),
        getProject(),
        getProject(),
      ]);
      const result = yield* PostHogManagement.use((service) =>
        service.createProject(definition)
      ).pipe(Effect.provide(native.layer));
      expect(result.id).toBe(id);
      expect(
        Array.map(yield* Ref.get(native.calls), (call) => call.method)
      ).toEqual(["GET", "POST", "GET", "GET", "GET"]);
    })
);

it.effect.each([
  { reason: "permission-refused", status: 403 },
  { reason: "request-refused", status: 400 },
])("does not retry a refused create ($status)", ({ status, reason }) =>
  Effect.gen(function* () {
    const native = yield* fixture([
      getPage(page([])),
      writeProject({ detail: "PRIVATE9" }, status),
    ]);
    const result = yield* PostHogManagement.use((service) =>
      service.createProject(definition)
    ).pipe(Effect.provide(native.layer), Effect.exit);
    expect(failure(result)).toBe(reason);
    expect(
      Array.map(yield* Ref.get(native.calls), (call) => call.method)
    ).toEqual(["GET", "POST"]);
    Exit.match(result, {
      onFailure: (cause) =>
        expect(Cause.pretty(cause)).not.toContain("PRIVATE9"),
      onSuccess: () => expect.fail("A refused create cannot succeed"),
    });
  })
);

it.effect.each([
  { field: "privacy", observed: { ...project, autocapture_opt_out: false } },
  {
    field: "capture key",
    observed: {
      ...project,
      api_token: "phc_synthetic_changed_capture_fixture_only",
    },
  },
])("refuses an update whose $field changed at readback", ({ observed }) =>
  Effect.gen(function* () {
    const native = yield* fixture([
      getProject({ ...project, name: "TaxKit Test" }),
      writeProject(project, 200, "PATCH"),
      getProject(observed),
    ]);
    const result = yield* PostHogManagement.use((service) =>
      service.updateProject({ definition, id })
    ).pipe(Effect.provide(native.layer), Effect.exit);
    expect(failure(result)).toBe("write-not-converged");
    expect(
      Array.map(yield* Ref.get(native.calls), (call) => call.method)
    ).toEqual(["GET", "PATCH", "GET"]);
  })
);

it.effect("stops an uncertain create when readback remains absent", () =>
  Effect.gen(function* () {
    const native = yield* fixture([
      getPage(page([])),
      writeProject({ message: "PRIVATE9" }, 500),
      getPage(page([])),
    ]);
    const result = yield* PostHogManagement.use((service) =>
      service.createProject(definition)
    ).pipe(Effect.provide(native.layer), Effect.exit);
    expect(failure(result)).toBe("uncertain-create");
    expect(
      Array.filter(
        yield* Ref.get(native.calls),
        (call) => call.method === "POST"
      )
    ).toHaveLength(1);
  })
);

it.effect(
  "keeps an unchanged project and updates only managed name and privacy",
  () =>
    Effect.gen(function* () {
      const noop = yield* fixture([getProject()]);
      yield* PostHogManagement.use((service) =>
        service.updateProject({ definition, id })
      ).pipe(Effect.provide(noop.layer));
      expect(yield* Ref.get(noop.calls)).toHaveLength(1);
      const update = yield* fixture([
        getProject({
          ...project,
          autocapture_opt_out: false,
          name: "TaxKit Test",
        }),
        writeProject(project, 200, "PATCH"),
        getProject(),
      ]);
      const result = yield* PostHogManagement.use((service) =>
        service.updateProject({ definition, id })
      ).pipe(Effect.provide(update.layer));
      expect(result.name).toBe(definition.name);
      const calls = yield* Ref.get(update.calls);
      expect(Array.map(calls, (call) => call.method)).toEqual([
        "GET",
        "PATCH",
        "GET",
      ]);
      Option.match(Array.get(calls, 1), {
        onNone: () => expect.fail("Update call missing"),
        onSome: (call) =>
          Option.match(call.body, {
            onNone: () => expect.fail("Update body missing"),
            onSome: (body) =>
              expect(body).toEqual({
                ...desiredProjectPrivacy,
                name: definition.name,
              }),
          }),
      });
    })
);

it.effect.each(["oversized", "failed"] as const)(
  "keeps $0 response-body failures typed and private",
  (mode) =>
    Effect.gen(function* () {
      const native = yield* fixture([getProject()], mode);
      const result = yield* PostHogManagement.use((service) =>
        service.readProject({ definition, id })
      ).pipe(Effect.provide(native.layer), Effect.exit);
      expect(failure(result)).toBe("provider-failure");
      Exit.match(result, {
        onFailure: (cause) =>
          expect(Cause.pretty(cause)).not.toContain("PRIVATE9"),
        onSuccess: () => expect.fail("Invalid body accepted"),
      });
    })
);

it.effect(
  "bounds the complete response body and releases interrupted work",
  () =>
    Effect.gen(function* () {
      const native = yield* fixture([getProject()], "stalled");
      const pending = yield* PostHogManagement.use((service) =>
        service.readProject({ definition, id })
      ).pipe(Effect.provide(native.layer), Effect.forkChild);
      yield* Deferred.await(native.started);
      yield* TestClock.adjust("5 seconds");
      const result = yield* Fiber.await(pending);
      expect(failure(result)).toBe("deadline");
      expect(yield* Ref.get(native.closed)).toBe(1);
      const interrupted = yield* fixture([getProject()], "stalled");
      const work = yield* PostHogManagement.use((service) =>
        service.readProject({ definition, id })
      ).pipe(Effect.provide(interrupted.layer), Effect.forkChild);
      yield* Deferred.await(interrupted.started);
      yield* Fiber.interrupt(work);
      expect(yield* Ref.get(interrupted.closed)).toBe(1);
    })
);

it.effect("fails configuration before any management request", () =>
  Effect.gen(function* () {
    const native = yield* fixture([]);
    const result = yield* PostHogManagement.use((service) =>
      service.findProject(definition)
    ).pipe(
      Effect.provide(
        PostHogManagementLive.pipe(
          Layer.provide(
            ConfigProvider.layerAdd(
              ConfigProvider.fromUnknown({ POSTHOG_MANAGEMENT_KEY: "PRIVATE9" })
            )
          ),
          Layer.provide(
            Layer.succeed(
              HttpClient.HttpClient,
              HttpClient.make(() => Effect.die("Unexpected management call"))
            )
          )
        )
      ),
      Effect.exit
    );
    expect(failure(result)).toBe("invalid-configuration");
    expect(yield* Ref.get(native.calls)).toEqual([]);
  })
);

it.live(
  "the actual native fetch transport never follows a management redirect",
  () =>
    Effect.gen(function* () {
      const requests = yield* Ref.make<readonly string[]>([]);
      const origin = yield* HttpServer.addressFormattedWith(Effect.succeed);
      yield* HttpServer.serveEffect(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          yield* Ref.update(requests, (current) =>
            Array.append(current, request.url)
          );
          expect(
            Option.isNone(Headers.get(request.headers, "traceparent"))
          ).toBe(true);
          return HttpServerResponse.text("PRIVATE9", {
            headers: { location: `${origin}/redirected` },
            status: 302,
          });
        })
      );
      const client = yield* HttpClient.HttpClient;
      const localTransport = Layer.succeed(
        HttpClient.HttpClient,
        client.pipe(
          HttpClient.mapRequest(HttpClientRequest.setUrl(`${origin}${item}`))
        )
      );
      const result = yield* PostHogManagement.use((service) =>
        service.readProject({ definition, id })
      ).pipe(
        Effect.provide(
          PostHogManagementLive.pipe(Layer.provide(localTransport))
        ),
        Effect.provide(
          ConfigProvider.layerAdd(
            ConfigProvider.fromUnknown({
              POSTHOG_MANAGEMENT_KEY: "phx_synthetic_management_fixture_only",
            })
          )
        ),
        Effect.withSpan("posthog-management-fixture"),
        Effect.exit
      );
      expect(failure(result)).toBe("provider-failure");
      expect(yield* Ref.get(requests)).toEqual([item]);
    }).pipe(
      Effect.provide(
        Layer.merge(
          FetchHttpClient.layer,
          BunHttpServer.layer({ hostname: "127.0.0.1", port: 0 })
        )
      )
    )
);
