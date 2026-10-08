import * as Diff from "alchemy/Diff";
import * as Provider from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Effect, Option, Schema } from "effect";

import { PostHogManagementError } from "./errors.js";
import {
  ManagedProject,
  ProjectDefinition,
  ProjectPrivacy,
  desiredProjectPrivacy,
} from "./schemas.js";
import { PostHogManagement } from "./service.js";

export type PostHogProject = Resource<
  "TaxKit.PostHog.Project",
  ProjectDefinition,
  ManagedProject
>;
export const PostHogProject = Resource<PostHogProject>(
  "TaxKit.PostHog.Project"
);

// This is an ownership rule, shared by saved-state read and update planning.
// Names can change in place; account, region and marker cannot.
const requireSameOwner = Effect.fnUntraced(function* (
  expected: ProjectDefinition,
  observed: ProjectDefinition
) {
  if (
    expected.organisation !== observed.organisation ||
    expected.marker !== observed.marker ||
    expected.region !== observed.region
  ) {
    return yield* new PostHogManagementError({
      operation: "project-lifecycle",
      reason: "replacement-refused",
    });
  }
});

export const PostHogProjectProvider = Provider.effect(
  PostHogProject,
  Effect.gen(function* () {
    const management = yield* PostHogManagement;
    return {
      delete: Effect.fn("PostHogProject.delete")(() =>
        Effect.fail(
          new PostHogManagementError({
            operation: "project-lifecycle",
            reason: "retained-project",
          })
        )
      ),
      diff: Effect.fn("PostHogProject.diff")(function* ({
        olds,
        news,
        output,
      }) {
        if (!Diff.isResolved(news)) {
          return;
        }
        const desired = yield* ProjectDefinition.makeEffect(news).pipe(
          Effect.mapError(
            () =>
              new PostHogManagementError({
                operation: "project-lifecycle",
                reason: "invalid-configuration",
              })
          )
        );
        const previous = yield* ProjectDefinition.makeEffect(olds).pipe(
          Effect.mapError(
            () =>
              new PostHogManagementError({
                operation: "project-lifecycle",
                reason: "invalid-response",
              })
          )
        );
        yield* requireSameOwner(previous, desired);
        return yield* Option.match(Option.fromNullishOr(output), {
          onNone: () =>
            Effect.fail(
              new PostHogManagementError({
                operation: "project-lifecycle",
                reason: "retained-project-missing",
              })
            ),
          onSome: (raw) =>
            Effect.gen(function* () {
              const current = yield* ManagedProject.makeEffect(raw).pipe(
                Effect.mapError(
                  () =>
                    new PostHogManagementError({
                      operation: "project-lifecycle",
                      reason: "invalid-response",
                    })
                )
              );
              yield* requireSameOwner(previous, current);
              return current.name === desired.name &&
                Schema.toEquivalence(ProjectPrivacy)(
                  current.privacy,
                  desiredProjectPrivacy
                )
                ? { action: "noop" as const }
                : {
                    action: "update" as const,
                    stables: [
                      "id",
                      "organisation",
                      "marker",
                      "region",
                      "token",
                    ],
                  };
            }),
        });
      }),
      list: () =>
        Effect.fail(
          new PostHogManagementError({
            operation: "project-lifecycle",
            reason: "retained-project",
          })
        ),
      nuke: { skip: true },
      read: Effect.fn("PostHogProject.read")(function* ({ olds, output }) {
        return yield* Option.match(Option.fromNullishOr(output), {
          onNone: () =>
            ProjectDefinition.makeEffect(olds).pipe(
              Effect.mapError(
                () =>
                  new PostHogManagementError({
                    operation: "project-lifecycle",
                    reason: "invalid-configuration",
                  })
              ),
              Effect.flatMap(management.findProject),
              Effect.map(Option.getOrUndefined)
            ),
          onSome: (raw) =>
            Effect.gen(function* () {
              const current = yield* ManagedProject.makeEffect(raw).pipe(
                Effect.mapError(
                  () =>
                    new PostHogManagementError({
                      operation: "project-lifecycle",
                      reason: "invalid-response",
                    })
                )
              );
              const previous = yield* ProjectDefinition.makeEffect(olds).pipe(
                Effect.mapError(
                  () =>
                    new PostHogManagementError({
                      operation: "project-lifecycle",
                      reason: "invalid-response",
                    })
                )
              );
              yield* requireSameOwner(previous, current);
              const observed = yield* management.readProject({
                definition: previous,
                id: current.id,
              });
              return yield* Option.match(observed, {
                onNone: () =>
                  Effect.fail(
                    new PostHogManagementError({
                      operation: "project-lifecycle",
                      reason: "retained-project-missing",
                    })
                  ),
                onSome: Effect.succeed,
              });
            }),
        });
      }),
      reconcile: Effect.fn("PostHogProject.reconcile")(function* ({
        news,
        olds,
        output,
      }) {
        const desired = yield* ProjectDefinition.makeEffect(news).pipe(
          Effect.mapError(
            () =>
              new PostHogManagementError({
                operation: "project-lifecycle",
                reason: "invalid-configuration",
              })
          )
        );
        const previous = Option.fromNullishOr(olds);
        yield* Option.match(previous, {
          onNone: () => Effect.void,
          onSome: (raw) =>
            ProjectDefinition.makeEffect(raw).pipe(
              Effect.mapError(
                () =>
                  new PostHogManagementError({
                    operation: "project-lifecycle",
                    reason: "invalid-response",
                  })
              ),
              Effect.flatMap((checked) => requireSameOwner(desired, checked))
            ),
        });
        return yield* Option.match(Option.fromNullishOr(output), {
          onNone: () =>
            Option.match(previous, {
              onNone: () => management.createProject(desired),
              onSome: () =>
                management.findProject(desired).pipe(
                  Effect.flatMap((found) =>
                    Option.match(found, {
                      onNone: () =>
                        Effect.fail(
                          new PostHogManagementError({
                            operation: "project-lifecycle",
                            reason: "retained-project-missing",
                          })
                        ),
                      onSome: (current) =>
                        management.updateProject({
                          definition: desired,
                          id: current.id,
                        }),
                    })
                  )
                ),
            }),
          onSome: (raw) =>
            Effect.gen(function* () {
              const current = yield* ManagedProject.makeEffect(raw).pipe(
                Effect.mapError(
                  () =>
                    new PostHogManagementError({
                      operation: "project-lifecycle",
                      reason: "invalid-response",
                    })
                )
              );
              yield* requireSameOwner(desired, current);
              return yield* management.updateProject({
                definition: desired,
                id: current.id,
              });
            }),
        });
      }),
      stables: ["id", "organisation", "marker", "region", "token"],
    };
  })
);
