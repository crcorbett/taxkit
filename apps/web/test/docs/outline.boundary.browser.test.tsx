import {
  RegistryContext,
  RegistryProvider,
  useAtomSet,
} from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { DocsHeadingId, DocsText } from "@taxkit/content/schemas";
import type { DocsReadingBody } from "@taxkit/content/schemas";
import { Effect, Option, Schedule } from "effect";
import { TestClock } from "effect/testing";
import { Profiler, useContext, useEffect } from "react";
import type { ProfilerOnRenderCallback } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import {
  DocsOutline,
  useDocsOutline,
} from "../../src/lib/docs/outline.container";

const first = DocsHeadingId.make("first-section");
const second = DocsHeadingId.make("second-section");
const body: DocsReadingBody = [
  {
    content: [
      { kind: "text", text: DocsText.fields.text.make("First section") },
    ],
    depth: 2,
    id: first,
    kind: "heading",
  },
  {
    content: [
      { kind: "text", text: DocsText.fields.text.make("Second section") },
    ],
    depth: 2,
    id: second,
    kind: "heading",
  },
];

const ReadingPage = ({
  onArticleCommit,
  onOutlineCommit,
  onActiveChange,
}: Readonly<{
  onArticleCommit: ProfilerOnRenderCallback;
  onOutlineCommit: ProfilerOnRenderCallback;
  onActiveChange: () => void;
}>) => {
  const active = useDocsOutline(body);
  const choose = useAtomSet(active);
  const registry = useContext(RegistryContext);
  useEffect(
    () => registry.subscribe(active, onActiveChange),
    [active, onActiveChange, registry]
  );
  return (
    <>
      <Profiler id="article" onRender={onArticleCommit}>
        <article>
          <h2 id={first}>First section</h2>
          <p style={{ minHeight: "200vh" }}>
            The article stays mounted while its outlines update.
          </p>
          <h2 id={second}>Second section</h2>
        </article>
      </Profiler>
      <Profiler id="desktop-outline" onRender={onOutlineCommit}>
        <DocsOutline active={active} body={body} />
      </Profiler>
      <Profiler id="mobile-outline" onRender={onOutlineCommit}>
        <DocsOutline active={active} body={body} />
      </Profiler>
      <button
        onClick={() => {
          Option.some(second).pipe(choose);
        }}
        type="button"
      >
        Select second section
      </button>
    </>
  );
};

describe("documentation outline subscription boundary", () => {
  it.effect(
    "updates both outlines without committing the article, skips equivalent headings and releases its observer",
    () =>
      Effect.gen(function* () {
        const observer = yield* Effect.acquireRelease(
          Effect.sync(() => {
            const observe = vi.fn<(element: Element) => void>();
            const disconnect = vi.fn<() => void>();
            const takeRecords = vi
              .fn<() => IntersectionObserverEntry[]>()
              .mockReturnValue([]);
            const unobserve = vi.fn<(element: Element) => void>();
            const constructor = vi
              .spyOn(globalThis, "IntersectionObserver")
              .mockImplementation(
                class implements IntersectionObserver {
                  readonly root = null;
                  readonly rootMargin = "0px";
                  readonly scrollMargin = "0px";
                  readonly thresholds = [0, 1];
                  readonly observe = observe;
                  readonly disconnect = disconnect;
                  readonly takeRecords = takeRecords;
                  readonly unobserve = unobserve;
                }
              );
            return { constructor, disconnect, observe };
          }),
          ({ constructor }) =>
            Effect.sync(() => {
              constructor.mockRestore();
            })
        );
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
        const articleCommits = vi.fn<ProfilerOnRenderCallback>();
        const outlineCommits = vi.fn<ProfilerOnRenderCallback>();
        const activeChanges = vi.fn<() => void>();
        yield* Effect.sync(() => {
          root.render(
            <RegistryProvider>
              <ReadingPage
                onActiveChange={activeChanges}
                onArticleCommit={articleCommits}
                onOutlineCommit={outlineCommits}
              />
            </RegistryProvider>
          );
        });
        yield* Effect.sync(
          () =>
            host.querySelectorAll(
              `a[aria-current="location"][href="#${first}"]`
            ).length
        ).pipe(
          Effect.repeat({
            until: (count) => count === 2,
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        const choose = yield* Effect.sync(() =>
          host.querySelector("button")
        ).pipe(
          Effect.flatMap((value) =>
            Effect.fromOption(Option.fromNullishOr(value))
          )
        );
        yield* Effect.sync(() => {
          articleCommits.mockClear();
          outlineCommits.mockClear();
          activeChanges.mockClear();
          flushSync(() => {
            choose.click();
          });
        });
        yield* Effect.sync(
          () =>
            host.querySelectorAll(
              `a[aria-current="location"][href="#${second}"]`
            ).length
        ).pipe(
          Effect.repeat({
            until: (count) => count === 2,
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        expect({
          article: articleCommits.mock.calls.length,
          outlines: outlineCommits.mock.calls.length,
          notifications: activeChanges.mock.calls.length,
        }).toStrictEqual({ article: 0, outlines: 2, notifications: 1 });
        yield* Effect.sync(() => {
          flushSync(() => {
            choose.click();
          });
        });
        // Registry notifications are synchronous outside render in the qualified
        // Atom source. An equal write therefore cannot queue a later React update.
        expect({
          article: articleCommits.mock.calls.length,
          outlines: outlineCommits.mock.calls.length,
          notifications: activeChanges.mock.calls.length,
        }).toStrictEqual({ article: 0, outlines: 2, notifications: 1 });
        yield* Effect.sync(() => {
          root.unmount();
        });
        yield* Effect.sync(() => observer.disconnect.mock.calls.length).pipe(
          Effect.repeat({
            until: (count) => count === 1,
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        expect({
          observers: observer.constructor.mock.calls.length,
          disconnected: observer.disconnect.mock.calls.length,
        }).toStrictEqual({ observers: 1, disconnected: 1 });
      }).pipe(Effect.scoped)
  );
});
