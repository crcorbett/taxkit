import { Credentials } from "@distilled.cloud/posthog/Credentials";
import {
  createOrganizationsProject,
  getOrganizationsProject,
  listOrganizationsProjects,
  updateOrganizationsProjectsPartial,
} from "@distilled.cloud/posthog/organizations";
import * as Retry from "@distilled.cloud/posthog/Retry";
import { CaptureToken } from "@taxkit/analytics/schemas";
import {
  Array,
  Config,
  Effect,
  HashSet,
  Layer,
  Match,
  Option,
  Redacted,
  Schema,
  Semaphore,
  Stream,
} from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientError,
  HttpClientResponse,
} from "effect/http";

import { PostHogManagementError } from "./errors.js";
import type { PostHogManagementOperation } from "./errors.js";
import {
  ManagedProject,
  PostHogManagementKey,
  PostHogOrganisationId,
  desiredProjectPrivacy,
  ProjectPrivacy,
} from "./schemas.js";
import type { ProjectDefinition, ProjectLookup } from "./schemas.js";
import { PostHogManagement } from "./service.js";

// The generated SDK's list omits product_description. Read each project after
// paging; unrelated nullable names and absent privacy fields are valid inventory.
const ProviderProject = Schema.Struct({
  api_token: Schema.OptionFromOptionalNullOr(
    Schema.Union([
      Schema.Redacted(Schema.String),
      Schema.RedactedFromValue(Schema.String),
    ])
  ),
  id: ManagedProject.fields.id,
  name: Schema.OptionFromOptionalNullOr(Schema.String),
  organization: PostHogOrganisationId,
  product_description: Schema.OptionFromOptionalNullOr(Schema.String),
  ...Schema.Struct({
    anonymize_ips: Schema.OptionFromOptionalNullOr(Schema.Boolean),
    autocapture_exceptions_opt_in: Schema.OptionFromOptionalNullOr(
      Schema.Boolean
    ),
    autocapture_opt_out: Schema.OptionFromOptionalNullOr(Schema.Boolean),
    autocapture_web_vitals_opt_in: Schema.OptionFromOptionalNullOr(
      Schema.Boolean
    ),
    capture_console_log_opt_in: Schema.OptionFromOptionalNullOr(Schema.Boolean),
    capture_performance_opt_in: Schema.OptionFromOptionalNullOr(Schema.Boolean),
    heatmaps_opt_in: Schema.OptionFromOptionalNullOr(Schema.Boolean),
    inject_web_apps: Schema.OptionFromOptionalNullOr(Schema.Boolean),
    session_recording_opt_in: Schema.OptionFromOptionalNullOr(Schema.Boolean),
    surveys_opt_in: Schema.OptionFromOptionalNullOr(Schema.Boolean),
  }).fields,
});
const ProviderProjectPage = Schema.Struct({
  count: Schema.Int.check(Schema.isBetween({ maximum: 1000, minimum: 0 })),
  next: Schema.OptionFromNullOr(Schema.String.check(Schema.isMaxLength(2048))),
  results: Schema.Array(Schema.Struct({ id: ManagedProject.fields.id })).check(
    Schema.isMaxLength(100)
  ),
});
const NextQuery = Schema.Struct({
  limit: Schema.NumberFromString.check(
    Schema.isInt(),
    Schema.makeFilter((value) => value === 100)
  ),
  offset: Schema.NumberFromString.check(
    Schema.isInt(),
    Schema.isGreaterThan(0)
  ),
});

export const PostHogManagementLive = Layer.effect(
  PostHogManagement,
  Effect.gen(function* () {
    const key = yield* Config.schema(
      Schema.RedactedFromValue(PostHogManagementKey),
      "POSTHOG_MANAGEMENT_KEY"
    ).pipe(
      Effect.mapError(
        () =>
          new PostHogManagementError({
            operation: "configure",
            reason: "invalid-configuration",
          })
      )
    );
    const http = yield* HttpClient.HttpClient;
    const credentials = Layer.succeed(
      Credentials,
      Effect.sync(() => ({
        apiBaseUrl: "https://us.posthog.com",
        apiKey: Redacted.value(key),
      }))
    );
    // The current SDK turns response-body failures into defects. Fully collect
    // a bounded native stream first so ordinary network/body failures remain
    // typed errors, and the SDK sees only an already checked in-memory body.
    const transport = Layer.succeed(
      HttpClient.HttpClient,
      http.pipe(
        HttpClient.filterStatus(
          (status) => status >= 200 && (status < 300 || status >= 400)
        ),
        HttpClient.transformResponse((responseEffect) =>
          responseEffect.pipe(
            Effect.flatMap((response) =>
              response.stream.pipe(
                Stream.limitBytes(1_048_576, () =>
                  Stream.fail(
                    new HttpClientError.HttpClientError({
                      reason: new HttpClientError.DecodeError({
                        description:
                          "Management response exceeds the fixed byte limit",
                        request: response.request,
                        response,
                      }),
                    })
                  )
                ),
                Stream.runCollect,
                Effect.map((chunks) =>
                  HttpClientResponse.fromWeb(
                    response.request,
                    new Response(
                      new Uint8Array(Array.flatMap(chunks, Array.fromIterable)),
                      {
                        headers: { "content-type": "application/json" },
                        status: response.status,
                      }
                    )
                  )
                )
              )
            )
          )
        )
      )
    );
    const writePermit = yield* Semaphore.make(1);

    const readProviderProject = Effect.fnUntraced(
      function* (
        lookup: ProjectLookup,
        operation: typeof PostHogManagementOperation.Type
      ) {
        const result = yield* getOrganizationsProject({
          id: lookup.id,
          organization_id: lookup.definition.organisation,
        }).pipe(
          Retry.none,
          Effect.map(Option.some),
          Effect.catchTag("NotFound", () => Effect.succeed(Option.none())),
          Effect.mapError((error) =>
            Match.value(error).pipe(
              Match.tag(
                "Forbidden",
                "Unauthorized",
                () =>
                  new PostHogManagementError({
                    operation,
                    reason: "permission-refused",
                  })
              ),
              Match.tag(
                "PosthogParseError",
                () =>
                  new PostHogManagementError({
                    operation,
                    reason: "invalid-response",
                  })
              ),
              Match.orElse(
                () =>
                  new PostHogManagementError({
                    operation,
                    reason: "provider-failure",
                  })
              )
            )
          )
        );
        return yield* Option.match(result, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (raw) =>
            Schema.decodeUnknownEffect(ProviderProject)(raw).pipe(
              Effect.mapError(
                () =>
                  new PostHogManagementError({
                    operation,
                    reason: "invalid-response",
                  })
              ),
              Effect.flatMap((project) =>
                project.id === lookup.id &&
                project.organization === lookup.definition.organisation
                  ? Effect.succeed(Option.some(project))
                  : Effect.fail(
                      new PostHogManagementError({
                        operation,
                        reason: "foreign-resource",
                      })
                    )
              )
            ),
        });
      },
      (effect) =>
        effect.pipe(
          Effect.timeoutOrElse({
            duration: "5 seconds",
            orElse: () =>
              Effect.fail(
                new PostHogManagementError({
                  operation: "read-project",
                  reason: "deadline",
                })
              ),
          }),
          Effect.scoped,
          Effect.provide(Layer.merge(credentials, transport)),
          Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
          Effect.provideService(FetchHttpClient.RequestInit, {
            cache: "no-store",
            credentials: "omit",
            redirect: "manual",
          })
        )
    );

    const restoreOwned = Effect.fnUntraced(function* (
      definition: ProjectDefinition,
      project: typeof ProviderProject.Type,
      operation: typeof PostHogManagementOperation.Type
    ) {
      if (
        project.organization !== definition.organisation ||
        !Option.contains(project.product_description, definition.marker)
      ) {
        return yield* new PostHogManagementError({
          operation,
          reason: "foreign-resource",
        });
      }
      return yield* Schema.decodeUnknownEffect(ManagedProject)({
        ...definition,
        id: project.id,
        name: Option.getOrUndefined(project.name),
        privacy: {
          anonymize_ips: Option.getOrUndefined(project.anonymize_ips),
          autocapture_exceptions_opt_in: Option.getOrUndefined(
            project.autocapture_exceptions_opt_in
          ),
          autocapture_opt_out: Option.getOrUndefined(
            project.autocapture_opt_out
          ),
          autocapture_web_vitals_opt_in: Option.getOrUndefined(
            project.autocapture_web_vitals_opt_in
          ),
          capture_console_log_opt_in: Option.getOrUndefined(
            project.capture_console_log_opt_in
          ),
          capture_performance_opt_in: Option.getOrUndefined(
            project.capture_performance_opt_in
          ),
          heatmaps_opt_in: Option.getOrUndefined(project.heatmaps_opt_in),
          inject_web_apps: Option.getOrUndefined(project.inject_web_apps),
          session_recording_opt_in: Option.getOrUndefined(
            project.session_recording_opt_in
          ),
          surveys_opt_in: Option.getOrUndefined(project.surveys_opt_in),
        },
        token: Option.getOrUndefined(project.api_token),
      }).pipe(
        Effect.mapError(
          () =>
            new PostHogManagementError({
              operation,
              reason: "invalid-response",
            })
        )
      );
    });

    const readProject = Effect.fn("PostHogManagement.readProject")(function* (
      lookup: ProjectLookup
    ) {
      const current = yield* readProviderProject(lookup, "read-project");
      return yield* Option.match(current, {
        onNone: () => Effect.succeed(Option.none()),
        onSome: (project) =>
          restoreOwned(lookup.definition, project, "read-project").pipe(
            Effect.map(Option.some)
          ),
      });
    });

    const findProject = Effect.fn("PostHogManagement.findProject")(
      function* (definition: ProjectDefinition) {
        const readPage = Effect.fnUntraced(function* (
          offset: number,
          seen: HashSet.HashSet<number>,
          expectedCount: Option.Option<number>,
          ids: readonly (typeof ManagedProject.fields.id.Type)[]
        ): Effect.fn.Return<
          readonly (typeof ManagedProject.fields.id.Type)[],
          PostHogManagementError,
          Credentials | HttpClient.HttpClient
        > {
          if (HashSet.size(seen) >= 20 || HashSet.has(seen, offset)) {
            return yield* new PostHogManagementError({
              operation: "find-project",
              reason: "incomplete-inventory",
            });
          }
          const raw = yield* listOrganizationsProjects({
            limit: 100,
            offset,
            organization_id: definition.organisation,
          }).pipe(
            Retry.none,
            Effect.mapError((error) =>
              Match.value(error).pipe(
                Match.tag(
                  "Forbidden",
                  "Unauthorized",
                  () =>
                    new PostHogManagementError({
                      operation: "find-project",
                      reason: "permission-refused",
                    })
                ),
                Match.orElse(
                  () =>
                    new PostHogManagementError({
                      operation: "find-project",
                      reason: "provider-failure",
                    })
                )
              )
            )
          );
          const page = yield* Schema.decodeUnknownEffect(ProviderProjectPage)(
            raw
          ).pipe(
            Effect.mapError(
              () =>
                new PostHogManagementError({
                  operation: "find-project",
                  reason: "incomplete-inventory",
                })
            )
          );
          const collected = Array.appendAll(
            ids,
            Array.map(page.results, (project) => project.id)
          );
          if (
            Option.exists(expectedCount, (count) => count !== page.count) ||
            collected.length > page.count ||
            HashSet.size(HashSet.fromIterable(collected)) !== collected.length
          ) {
            return yield* new PostHogManagementError({
              operation: "find-project",
              reason: "incomplete-inventory",
            });
          }
          return yield* Option.match(page.next, {
            onNone: () =>
              collected.length === page.count
                ? Effect.succeed(collected)
                : Effect.fail(
                    new PostHogManagementError({
                      operation: "find-project",
                      reason: "incomplete-inventory",
                    })
                  ),
            onSome: (next) =>
              Effect.gen(function* () {
                const url = yield* Effect.try(() => new URL(next)).pipe(
                  Effect.mapError(
                    () =>
                      new PostHogManagementError({
                        operation: "find-project",
                        reason: "incomplete-inventory",
                      })
                  )
                );
                if (
                  url.origin !== "https://us.posthog.com" ||
                  url.pathname !==
                    `/api/organizations/${definition.organisation}/projects/` ||
                  url.username !== "" ||
                  url.password !== "" ||
                  url.hash !== "" ||
                  Array.fromIterable(url.searchParams).length !== 2 ||
                  !Array.every(
                    Array.fromIterable(url.searchParams.keys()),
                    (name) => name === "limit" || name === "offset"
                  )
                ) {
                  return yield* new PostHogManagementError({
                    operation: "find-project",
                    reason: "incomplete-inventory",
                  });
                }
                const query = yield* Schema.decodeUnknownEffect(NextQuery)({
                  limit: url.searchParams.get("limit"),
                  offset: url.searchParams.get("offset"),
                }).pipe(
                  Effect.mapError(
                    () =>
                      new PostHogManagementError({
                        operation: "find-project",
                        reason: "incomplete-inventory",
                      })
                  )
                );
                if (
                  query.offset !== collected.length ||
                  query.offset <= offset ||
                  page.results.length === 0
                ) {
                  return yield* new PostHogManagementError({
                    operation: "find-project",
                    reason: "incomplete-inventory",
                  });
                }
                return yield* readPage(
                  query.offset,
                  HashSet.add(seen, offset),
                  Option.some(page.count),
                  collected
                );
              }),
          });
        });
        const ids = yield* readPage(0, HashSet.empty(), Option.none(), []);
        const projects = yield* Effect.forEach(ids, (id) =>
          readProviderProject({ definition, id }, "find-project").pipe(
            Effect.flatMap((current) =>
              Option.match(current, {
                onNone: () =>
                  Effect.fail(
                    new PostHogManagementError({
                      operation: "find-project",
                      reason: "incomplete-inventory",
                    })
                  ),
                onSome: Effect.succeed,
              })
            )
          )
        );
        const candidates = Array.filter(
          projects,
          (project) =>
            Option.contains(project.product_description, definition.marker) ||
            Option.exists(
              project.name,
              (name) => name.toLowerCase() === definition.name.toLowerCase()
            )
        );
        if (candidates.length > 1) {
          return yield* new PostHogManagementError({
            operation: "find-project",
            reason: "ambiguous-ownership",
          });
        }
        return yield* Option.match(Array.head(candidates), {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (project) =>
            restoreOwned(definition, project, "find-project").pipe(
              Effect.map(Option.some)
            ),
        });
      },
      (effect) =>
        effect.pipe(
          Effect.timeoutOrElse({
            duration: "30 seconds",
            orElse: () =>
              Effect.fail(
                new PostHogManagementError({
                  operation: "find-project",
                  reason: "deadline",
                })
              ),
          }),
          Effect.scoped,
          Effect.provide(Layer.merge(credentials, transport)),
          Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
          Effect.provideService(FetchHttpClient.RequestInit, {
            cache: "no-store",
            credentials: "omit",
            redirect: "manual",
          })
        )
    );

    const createProject = Effect.fn("PostHogManagement.createProject")(
      function* (definition: ProjectDefinition) {
        const existing = yield* findProject(definition);
        return yield* Option.match(existing, {
          onNone: () =>
            Effect.gen(function* () {
              const created = yield* createOrganizationsProject({
                name: definition.name,
                organization_id: definition.organisation,
                product_description: definition.marker,
                ...desiredProjectPrivacy,
              }).pipe(
                Retry.none,
                Effect.flatMap(Schema.decodeUnknownEffect(ProviderProject)),
                Effect.flatMap((project) =>
                  restoreOwned(definition, project, "create-project")
                ),
                Effect.timeoutOrElse({
                  duration: "5 seconds",
                  orElse: () =>
                    Effect.fail(
                      new PostHogManagementError({
                        operation: "create-project",
                        reason: "uncertain-create",
                      })
                    ),
                }),
                Effect.mapError((error) =>
                  Match.value(error).pipe(
                    Match.tag("PostHogManagementError", (owned) => owned),
                    Match.tag(
                      "Forbidden",
                      "Unauthorized",
                      () =>
                        new PostHogManagementError({
                          operation: "create-project",
                          reason: "permission-refused",
                        })
                    ),
                    Match.tag(
                      "BadRequest",
                      () =>
                        new PostHogManagementError({
                          operation: "create-project",
                          reason: "request-refused",
                        })
                    ),
                    Match.orElse(
                      () =>
                        new PostHogManagementError({
                          operation: "create-project",
                          reason: "uncertain-create",
                        })
                    )
                  )
                ),
                Effect.catchTag("PostHogManagementError", (owned) =>
                  owned.reason === "permission-refused" ||
                  owned.reason === "request-refused" ||
                  owned.reason === "foreign-resource"
                    ? Effect.fail(owned)
                    : findProject(definition).pipe(
                        Effect.flatMap((observed) =>
                          Option.match(observed, {
                            onNone: () =>
                              Effect.fail(
                                new PostHogManagementError({
                                  operation: "create-project",
                                  reason: "uncertain-create",
                                })
                              ),
                            onSome: Effect.succeed,
                          })
                        )
                      )
                )
              );
              const observed = yield* readProject({
                definition,
                id: created.id,
              });
              return yield* Option.match(observed, {
                onNone: () =>
                  Effect.fail(
                    new PostHogManagementError({
                      operation: "create-project",
                      reason: "write-not-converged",
                    })
                  ),
                onSome: (project) =>
                  project.name === definition.name &&
                  Schema.toEquivalence(ProjectPrivacy)(
                    project.privacy,
                    desiredProjectPrivacy
                  )
                    ? Effect.succeed(project)
                    : Effect.fail(
                        new PostHogManagementError({
                          operation: "create-project",
                          reason: "write-not-converged",
                        })
                      ),
              });
            }),
          onSome: Effect.succeed,
        });
      },
      (effect) =>
        effect.pipe(
          writePermit.withPermit,
          Effect.timeoutOrElse({
            duration: "75 seconds",
            orElse: () =>
              Effect.fail(
                new PostHogManagementError({
                  operation: "create-project",
                  reason: "uncertain-create",
                })
              ),
          }),
          Effect.scoped,
          Effect.provide(Layer.merge(credentials, transport)),
          Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
          Effect.provideService(FetchHttpClient.RequestInit, {
            cache: "no-store",
            credentials: "omit",
            redirect: "manual",
          })
        )
    );

    const updateProject = Effect.fn("PostHogManagement.updateProject")(
      function* (lookup: ProjectLookup) {
        const existing = yield* readProject(lookup);
        return yield* Option.match(existing, {
          onNone: () =>
            Effect.fail(
              new PostHogManagementError({
                operation: "update-project",
                reason: "retained-project-missing",
              })
            ),
          onSome: (current) =>
            Effect.gen(function* () {
              if (
                current.name === lookup.definition.name &&
                Schema.toEquivalence(ProjectPrivacy)(
                  current.privacy,
                  desiredProjectPrivacy
                )
              ) {
                return current;
              }
              yield* updateOrganizationsProjectsPartial({
                id: lookup.id,
                name: lookup.definition.name,
                organization_id: lookup.definition.organisation,
                ...desiredProjectPrivacy,
              }).pipe(
                Retry.none,
                Effect.flatMap(Schema.decodeUnknownEffect(ProviderProject)),
                Effect.flatMap((project) =>
                  restoreOwned(lookup.definition, project, "update-project")
                ),
                Effect.mapError((error) =>
                  Match.value(error).pipe(
                    Match.tag("PostHogManagementError", (owned) => owned),
                    Match.tag(
                      "Forbidden",
                      "Unauthorized",
                      () =>
                        new PostHogManagementError({
                          operation: "update-project",
                          reason: "permission-refused",
                        })
                    ),
                    Match.tag(
                      "SchemaError",
                      "PosthogParseError",
                      () =>
                        new PostHogManagementError({
                          operation: "update-project",
                          reason: "invalid-response",
                        })
                    ),
                    Match.orElse(
                      () =>
                        new PostHogManagementError({
                          operation: "update-project",
                          reason: "provider-failure",
                        })
                    )
                  )
                )
              );
              const observed = yield* readProject(lookup);
              return yield* Option.match(observed, {
                onNone: () =>
                  Effect.fail(
                    new PostHogManagementError({
                      operation: "update-project",
                      reason: "write-not-converged",
                    })
                  ),
                onSome: (project) =>
                  project.name === lookup.definition.name &&
                  Schema.toEquivalence(ProjectPrivacy)(
                    project.privacy,
                    desiredProjectPrivacy
                  ) &&
                  Redacted.makeEquivalence(Schema.toEquivalence(CaptureToken))(
                    project.token,
                    current.token
                  )
                    ? Effect.succeed(project)
                    : Effect.fail(
                        new PostHogManagementError({
                          operation: "update-project",
                          reason: "write-not-converged",
                        })
                      ),
              });
            }),
        });
      },
      (effect) =>
        effect.pipe(
          writePermit.withPermit,
          Effect.timeoutOrElse({
            duration: "15 seconds",
            orElse: () =>
              Effect.fail(
                new PostHogManagementError({
                  operation: "update-project",
                  reason: "deadline",
                })
              ),
          }),
          Effect.scoped,
          Effect.provide(Layer.merge(credentials, transport)),
          Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
          Effect.provideService(FetchHttpClient.RequestInit, {
            cache: "no-store",
            credentials: "omit",
            redirect: "manual",
          })
        )
    );
    return PostHogManagement.of({
      createProject,
      findProject,
      readProject,
      updateProject,
    });
  })
);
