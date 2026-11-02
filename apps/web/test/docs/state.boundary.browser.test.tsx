import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { DocsSearchTerm } from "@taxkit/content/schemas";
import { Effect, Option, Schedule } from "effect";
import { TestClock } from "effect/testing";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { DocsHeading } from "../../src/lib/docs/components";
import { docsHeadingId } from "../../src/lib/docs/focus.atoms";
import {
  DocsNavigationFocus,
  useDocsNavigationFocus,
} from "../../src/lib/docs/focus.container";
import { DocsSearchForm } from "../../src/lib/docs/search-form.container";
import { websiteSearchParameters } from "../../src/lib/docs/search-location.ingress";

const FocusLink = () => {
  const requestFocus = useDocsNavigationFocus();
  return (
    <a
      href="/search"
      onClick={(event) => {
        requestFocus(event);
        // The native commit event below represents a loader that is still
        // pending; the browser must remain in this test document meanwhile.
        event.preventDefault();
      }}
    >
      Open search
    </a>
  );
};

const mountDocsControls = Effect.fnUntraced(function* () {
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    parseSearch: websiteSearchParameters.parse,
    routeTree: createRootRoute(),
    stringifySearch: websiteSearchParameters.stringify,
  });
  const initialSubscriptions = router.subscribers.size;
  const host = yield* Effect.acquireRelease(
    Effect.sync(() => {
      const element = document.createElement("div");
      document.body.insertBefore(element, null);
      return element;
    }),
    (element) => Effect.sync(() => element.remove())
  );
  const root = yield* Effect.acquireRelease(
    Effect.sync(() => createRoot(host)),
    (value) =>
      Effect.sync(() => {
        value.unmount();
      })
  );
  const render = (children: ReactNode) => {
    root.render(
      <RegistryProvider>
        <RouterContextProvider router={router}>
          <DocsNavigationFocus />
          {children}
        </RouterContextProvider>
      </RegistryProvider>
    );
  };
  const commit = (path: string) => {
    router.emit({
      hashChanged: false,
      hrefChanged: true,
      pathChanged: true,
      toLocation: router.buildLocation({ to: path }),
      type: "onRendered",
    });
  };
  const commitCurrent = () => {
    router.updateLatestLocation();
    router.emit({
      hashChanged: false,
      hrefChanged: true,
      pathChanged: true,
      toLocation: router.latestLocation,
      type: "onRendered",
    });
  };
  return {
    commit,
    commitCurrent,
    host,
    initialSubscriptions,
    render,
    root,
    router,
  };
});

describe("documentation state and committed focus", () => {
  it.effect(
    "keeps pending focus through rerenders, consumes a matching commit once and releases the subscription",
    () =>
      Effect.gen(function* () {
        const { commit, host, initialSubscriptions, render, root, router } =
          yield* mountDocsControls();
        yield* Effect.sync(() => {
          render(
            <>
              <FocusLink />
              <DocsHeading>Current page</DocsHeading>
            </>
          );
        });
        yield* Effect.sync(() => router.subscribers.size).pipe(
          Effect.repeat({
            until: (count) => count === initialSubscriptions + 1,
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        const link = yield* Effect.sync(() => host.querySelector("a")).pipe(
          Effect.flatMap((value) =>
            Effect.fromOption(Option.fromNullishOr(value))
          )
        );
        yield* Effect.sync(() => {
          link.focus();
          // Hydration and unrelated commits never invent focus intent.
          commit("/search");
          expect(document.activeElement).toBe(link);
          link.click();
          render(
            <>
              <FocusLink />
              <DocsHeading>Still current while loading</DocsHeading>
            </>
          );
        });
        yield* Effect.sync(() => host.querySelector("h1")?.textContent).pipe(
          Effect.repeat({
            until: (text) => text === "Still current while loading",
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        expect(document.activeElement).toBe(link);
        expect(router.subscribers.size).toBe(initialSubscriptions + 1);
        yield* Effect.sync(() => {
          render(
            <>
              <FocusLink />
              <DocsHeading>Search destination</DocsHeading>
            </>
          );
        });
        yield* Effect.sync(() => host.querySelector("h1")?.textContent).pipe(
          Effect.repeat({
            until: (text) => text === "Search destination",
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        yield* Effect.sync(() => {
          commit("/search");
          expect(document.activeElement).toBe(
            host.querySelector(`#${docsHeadingId}`)
          );
          link.focus();
          commit("/search");
          expect(document.activeElement).toBe(link);
          root.unmount();
        });
        yield* Effect.sync(() => router.subscribers.size).pipe(
          Effect.repeat({
            until: (count) => count === initialSubscriptions,
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
      }).pipe(Effect.scoped)
  );

  it.effect("clears superseded intent and ignores modified clicks", () =>
    Effect.gen(function* () {
      const { commit, host, initialSubscriptions, render, router } =
        yield* mountDocsControls();
      yield* Effect.sync(() => {
        render(
          <>
            <FocusLink />
            <DocsHeading>Current page</DocsHeading>
          </>
        );
      });
      yield* Effect.sync(() => router.subscribers.size).pipe(
        Effect.repeat({
          until: (count) => count === initialSubscriptions + 1,
          schedule: Schedule.spaced("10 millis"),
        }),
        Effect.timeout("2 seconds"),
        TestClock.withLive
      );
      const link = yield* Effect.sync(() => host.querySelector("a")).pipe(
        Effect.flatMap((value) =>
          Effect.fromOption(Option.fromNullishOr(value))
        )
      );
      yield* Effect.sync(() => {
        link.focus();
        link.click();
        commit("/agents");
        commit("/search");
        expect(document.activeElement).toBe(link);
        link.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            button: 0,
            cancelable: true,
            ctrlKey: true,
          })
        );
        commit("/search");
        expect(document.activeElement).toBe(link);
      });
    }).pipe(Effect.scoped)
  );

  it.effect(
    "submits its local draft and restores a newly checked search term",
    () =>
      Effect.gen(function* () {
        const { commitCurrent, host, render, router } =
          yield* mountDocsControls();
        const restored = DocsSearchTerm.make("Effect");
        yield* Effect.sync(() => {
          render(
            <>
              <DocsHeading>Search documentation</DocsHeading>
              <DocsSearchForm term="" />
            </>
          );
        });
        const input = yield* Effect.sync(() =>
          host.querySelector("input")
        ).pipe(
          Effect.repeat({
            until: (value) => Option.isSome(Option.fromNullishOr(value)),
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.flatMap((value) =>
            Effect.fromOption(Option.fromNullishOr(value))
          ),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        yield* Effect.sync(() => {
          input.focus();
          input.select();
          input.setRangeText("money tax");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        yield* Effect.sync(() => input.value).pipe(
          Effect.repeat({
            until: (value) => value === "money tax",
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        yield* Effect.sync(() => {
          host.querySelector("form")?.requestSubmit();
          expect(router.history.location.href).toBe("/search?term=money+tax");
          commitCurrent();
          expect(document.activeElement).toBe(host.querySelector("h1"));
          expect(host.querySelector("form")?.getAttribute("action")).toBe(
            "/search"
          );
          expect(host.querySelector("form")?.getAttribute("method")).toBe(
            "GET"
          );
          render(
            <>
              <DocsHeading>Search documentation</DocsHeading>
              <DocsSearchForm term={restored} />
            </>
          );
        });
        yield* Effect.sync(() => input.value).pipe(
          Effect.repeat({
            until: (value) => value === "Effect",
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
      }).pipe(Effect.scoped)
  );
});
