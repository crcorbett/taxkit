import type { DocsHeadingId, DocsReadingBody } from "@taxkit/content/schemas";
import {
  Array,
  Boolean as EffectBoolean,
  Effect,
  Function as EffectFunction,
  Option,
} from "effect";
import * as Atom from "effect/reactivity/Atom";

import { browserRuntime } from "../api-client.atoms";

export const createDocsOutline = (body: DocsReadingBody) => {
  const active = Atom.make(Option.none<DocsHeadingId>());
  const observe = browserRuntime.fn<"observe">()((_, get) =>
    Effect.gen(function* () {
      const targets = yield* Effect.sync(() =>
        EffectFunction.pipe(
          body,
          Array.filter((block) => block.kind === "heading"),
          Array.flatMap(({ id }) =>
            Option.fromNullishOr(document.querySelector(`[id="${id}"]`)).pipe(
              Option.map((element) => ({ element, id })),
              Array.fromOption
            )
          )
        )
      );
      const offset = yield* Effect.sync(() =>
        Option.fromNullishOr(document.querySelector(".docs-header")).pipe(
          Option.map((element) => element.getBoundingClientRect().height * 1.5),
          Option.getOrElse(() => 0)
        )
      );
      // The observer's host callback measures only our checked targets;
      // no DOM string becomes an identity or crosses a domain boundary.
      const updateActive = () => {
        const atEnd =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2;
        const current = EffectBoolean.match(atEnd, {
          onTrue: () => Array.last(targets),
          onFalse: () =>
            EffectFunction.pipe(
              targets,
              Array.findLast(
                ({ element }) =>
                  element.getBoundingClientRect().top <= offset + 1
              ),
              Option.orElse(() => Array.head(targets))
            ),
        }).pipe(Option.map(({ id }) => id));
        get.set(active, current);
      };
      const observer = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new IntersectionObserver(updateActive, {
              rootMargin: `-${offset}px 0px 0px 0px`,
              threshold: [0, 1],
            })
        ),
        (resource) =>
          Effect.sync(() => {
            resource.takeRecords();
            resource.disconnect();
          })
      );
      yield* EffectFunction.pipe(
        targets,
        Effect.forEach(({ element }) =>
          Effect.sync(() => {
            observer.observe(element);
          })
        )
      );
      yield* EffectFunction.pipe(
        Array.fromOption(
          Option.fromNullishOr(document.querySelector(".docs-end-marker"))
        ),
        Effect.forEach((element) =>
          Effect.sync(() => {
            observer.observe(element);
          })
        )
      );
      yield* Effect.sync(updateActive);
      return yield* Effect.never;
    })
  );
  return { active, observe };
};
