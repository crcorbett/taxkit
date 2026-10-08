import { Context, Effect, Layer, Scope } from "effect";
import { FetchHttpClient } from "effect/http";

import { PostHogManagementLive } from "./management.adapter.layer.js";
import { PostHogProjectProvider } from "./projects.provider.js";
import { PostHogManagement } from "./service.js";

// Alchemy beta.80 requires provider registration to have no error channel.
// Defer fallible management acquisition to a lifecycle operation, while keeping
// one cached Layer and its resources in the native stack's acquisition scope.
// Missing credentials stay a typed failure before any request or mutation.
export const PostHogProjectProviderLive = Layer.unwrap(
  Effect.gen(function* () {
    const scope = yield* Scope.Scope;
    const acquire = yield* Layer.build(
      PostHogManagementLive.pipe(Layer.provide(FetchHttpClient.layer))
    ).pipe(
      Effect.map((context) => Context.get(context, PostHogManagement)),
      Effect.provideService(Scope.Scope, scope),
      Effect.cached
    );
    return PostHogProjectProvider.pipe(
      Layer.provide(
        Layer.succeed(
          PostHogManagement,
          PostHogManagement.of({
            createProject: (definition) =>
              acquire.pipe(
                Effect.flatMap((service) => service.createProject(definition))
              ),
            findProject: (definition) =>
              acquire.pipe(
                Effect.flatMap((service) => service.findProject(definition))
              ),
            readProject: (lookup) =>
              acquire.pipe(
                Effect.flatMap((service) => service.readProject(lookup))
              ),
            updateProject: (lookup) =>
              acquire.pipe(
                Effect.flatMap((service) => service.updateProject(lookup))
              ),
          })
        )
      )
    );
  })
);
