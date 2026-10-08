import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { PostHogManagementError } from "./errors.js";
import type {
  ManagedProject,
  ProjectDefinition,
  ProjectLookup,
} from "./schemas.js";

export class PostHogManagement extends Context.Service<
  PostHogManagement,
  {
    readonly findProject: (
      definition: ProjectDefinition
    ) => Effect.Effect<Option.Option<ManagedProject>, PostHogManagementError>;
    readonly readProject: (
      lookup: ProjectLookup
    ) => Effect.Effect<Option.Option<ManagedProject>, PostHogManagementError>;
    readonly createProject: (
      definition: ProjectDefinition
    ) => Effect.Effect<ManagedProject, PostHogManagementError>;
    readonly updateProject: (
      lookup: ProjectLookup
    ) => Effect.Effect<ManagedProject, PostHogManagementError>;
  }
>()("@taxkit/infrastructure/PostHogManagement") {}
