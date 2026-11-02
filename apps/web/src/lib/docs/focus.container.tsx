import { useAtomMount, useAtomSet } from "@effect/atom-react";
import { useRouter } from "@tanstack/react-router";
import { Effect, Function as EffectFunction, Option } from "effect";
import { useMemo } from "react";
import type { MouseEvent } from "react";

import { browserRuntime } from "../api-client.atoms";
import { isDocsNavigationClick } from "./components";
import { docsHeadingFocusAtom, docsHeadingId } from "./focus.atoms";

export const useDocsNavigationFocus = () => {
  const requestFocus = useAtomSet(docsHeadingFocusAtom);
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (isDocsNavigationClick(event)) {
      const target = event.currentTarget;
      EffectFunction.pipe(
        `${target.pathname}${target.search}${target.hash}`,
        Option.some,
        requestFocus
      );
    }
  };
};

export const DocsNavigationFocus = () => {
  const router = useRouter();
  const registration = useMemo(
    () =>
      browserRuntime.atom((get) =>
        Effect.acquireRelease(
          Effect.sync(() =>
            router.subscribe("onRendered", ({ toLocation }) => {
              const requested = get.once(docsHeadingFocusAtom);
              // A superseding destination also consumes intent, so Back cannot
              // accidentally reuse a request from an abandoned navigation.
              get.set(docsHeadingFocusAtom, Option.none());
              if (Option.contains(requested, toLocation.href)) {
                Option.match(
                  Option.fromNullishOr(
                    document.querySelector<HTMLElement>(`#${docsHeadingId}`)
                  ),
                  {
                    onNone: EffectFunction.constVoid,
                    onSome: (heading) => {
                      // Router remains the owner of scroll and hash restoration.
                      heading.focus({ preventScroll: true });
                    },
                  }
                );
              }
            })
          ),
          (unsubscribe) => Effect.sync(unsubscribe)
        ).pipe(Effect.andThen(Effect.never))
      ),
    [router]
  );
  useAtomMount(registration);
  return null;
};
