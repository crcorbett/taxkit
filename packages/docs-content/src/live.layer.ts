import { Effect, Layer, Option } from "effect";

import { DocsPageNotFoundError } from "./errors.js";
import { DocsContentService } from "./service.js";
import {
  getNavigation,
  getPageByPath,
  listNavigationPages,
  validateContent,
} from "./validation/policy.js";

export const DocsContentServiceLive = Layer.succeed(
  DocsContentService,
  DocsContentService.of({
    getNavigation: () => getNavigation,
    getPage: (path) =>
      getPageByPath(path).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.fail(
                new DocsPageNotFoundError({
                  path,
                })
              ),
            onSome: Effect.succeed,
          })
        )
      ),
    listPages: () => listNavigationPages,
    validateContent: () => validateContent,
  })
);
