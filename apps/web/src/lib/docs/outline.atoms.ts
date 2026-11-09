import type { DocsHeadingId } from "@taxkit/content/schemas";
import {
  Array,
  Boolean as EffectBoolean,
  Equal,
  Effect,
  Function as EffectFunction,
  Option,
} from "effect";
import * as Atom from "effect/reactivity/Atom";

import { browserRuntime } from "../api-client.atoms";

// One outline per page, keyed by the page's checked heading identities. Arrays
// compare structurally, so the same headings select the same definitions.
export const docsOutlineAtoms = Atom.family(
  (headings: readonly DocsHeadingId[]) => {
    const active = Atom.make(Option.none<DocsHeadingId>()).pipe(
      Atom.withEquality(Equal.equals)
    );
    const observe = browserRuntime.atom((get) =>
      Effect.gen(function* () {
        const targets = yield* Effect.sync(() =>
          EffectFunction.pipe(
            headings,
            Array.flatMap((id) =>
              Option.fromNullishOr(document.querySelector(`[id="${id}"]`)).pipe(
                Option.map((element) => ({ element, id })),
                Array.fromOption
              )
            )
          )
        );
        const offset = yield* Effect.sync(() =>
          Option.fromNullishOr(document.querySelector(".docs-header")).pipe(
            Option.map(
              (element) => element.getBoundingClientRect().height * 1.5
            ),
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
  }
);
