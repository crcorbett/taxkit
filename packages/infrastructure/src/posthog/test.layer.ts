import { PostHogProjectId, CaptureToken } from "@taxkit/analytics/schemas";
import {
  Function as EffectFunction,
  Effect,
  Layer,
  Option,
  Redacted,
  Ref,
  Array,
  Boolean as EffectBoolean,
} from "effect";

import { PostHogManagementError } from "./errors.js";
import type { PostHogManagementOperation } from "./errors.js";
import { ManagedProject, desiredProjectPrivacy } from "./schemas.js";
import type { ProjectDefinition } from "./schemas.js";
import { PostHogManagement } from "./service.js";

export const makePostHogManagementTest = Effect.fnUntraced(function* (
  initial: readonly ManagedProject[] = []
) {
  const projects = yield* Ref.make(initial);
  const operations = yield* Ref.make<
    readonly (typeof PostHogManagementOperation.Type)[]
  >([]);
  const layer = Layer.succeed(
    PostHogManagement,
    PostHogManagement.of({
      createProject: Effect.fn("PostHogManagement.createProject")(function* (
        definition: ProjectDefinition
      ) {
        yield* Ref.update(operations, (current) =>
          Array.append(current, "create-project")
        );
        const saved = ManagedProject.make({
          ...definition,
          id: PostHogProjectId.make(79),
          privacy: desiredProjectPrivacy,
          token: Redacted.make(
            CaptureToken.make("phc_synthetic_taxkit_shared_fixture_only")
          ),
        });
        yield* Ref.update(projects, (current) => Array.append(current, saved));
        return saved;
      }),
      findProject: Effect.fn("PostHogManagement.findProject")(
        function* (definition) {
          yield* Ref.update(operations, (current) =>
            Array.append(current, "find-project")
          );
          return EffectFunction.pipe(
            yield* Ref.get(projects),
            Array.findFirst(
              (current) =>
                current.organisation === definition.organisation &&
                current.marker === definition.marker
            )
          );
        }
      ),
      readProject: Effect.fn("PostHogManagement.readProject")(function* ({
        definition,
        id,
      }) {
        yield* Ref.update(operations, (current) =>
          Array.append(current, "read-project")
        );
        const found = EffectFunction.pipe(
          yield* Ref.get(projects),
          Array.findFirst((current) => current.id === id)
        );
        return yield* Option.match(found, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (current) =>
            EffectBoolean.match(
              current.organisation === definition.organisation &&
                current.marker === definition.marker,
              {
                onFalse: () =>
                  Effect.fail(
                    new PostHogManagementError({
                      operation: "read-project",
                      reason: "foreign-resource",
                    })
                  ),
                onTrue: () => Effect.succeed(Option.some(current)),
              }
            ),
        });
      }),
      updateProject: Effect.fn("PostHogManagement.updateProject")(function* ({
        definition,
        id,
      }) {
        yield* Ref.update(operations, (current) =>
          Array.append(current, "update-project")
        );
        const found = EffectFunction.pipe(
          yield* Ref.get(projects),
          Array.findFirst((current) => current.id === id)
        );
        return yield* Option.match(found, {
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
                current.organisation !== definition.organisation ||
                current.marker !== definition.marker
              ) {
                return yield* new PostHogManagementError({
                  operation: "update-project",
                  reason: "foreign-resource",
                });
              }
              const saved = ManagedProject.make({
                ...current,
                name: definition.name,
                privacy: desiredProjectPrivacy,
              });
              yield* Ref.update(projects, (values) =>
                EffectFunction.pipe(
                  values,
                  Array.map((value) =>
                    EffectBoolean.match(value.id === id, {
                      onFalse: () => value,
                      onTrue: () => saved,
                    })
                  )
                )
              );
              return saved;
            }),
        });
      }),
    })
  );
  return { layer, operations, projects };
});
