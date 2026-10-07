import { PostHogProjectId, CaptureToken } from "@taxkit/analytics/schemas";
import { Effect, Layer, Option, Redacted, Ref, Array } from "effect";

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
          id: PostHogProjectId.make(
            definition.environment === "production" ? 79 : 80
          ),
          privacy: desiredProjectPrivacy,
          token: Redacted.make(
            CaptureToken.make(
              `phc_synthetic_taxkit_${definition.environment}_fixture_only`
            )
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
          return Array.findFirst(
            yield* Ref.get(projects),
            (current) =>
              current.organisation === definition.organisation &&
              current.marker === definition.marker
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
        const found = Array.findFirst(
          yield* Ref.get(projects),
          (current) => current.id === id
        );
        return yield* Option.match(found, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (current) =>
            current.organisation === definition.organisation &&
            current.marker === definition.marker
              ? Effect.succeed(Option.some(current))
              : Effect.fail(
                  new PostHogManagementError({
                    operation: "read-project",
                    reason: "foreign-resource",
                  })
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
        const found = Array.findFirst(
          yield* Ref.get(projects),
          (current) => current.id === id
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
                Array.map(values, (value) => (value.id === id ? saved : value))
              );
              return saved;
            }),
        });
      }),
    })
  );
  return { layer, operations, projects };
});
