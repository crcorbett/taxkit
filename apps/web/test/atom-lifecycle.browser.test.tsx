import {
  RegistryContext,
  RegistryProvider,
  useAtom,
  useAtomValue,
} from "@effect/atom-react";
import { scheduleTask } from "@effect/atom-react/RegistryContext";
import { describe, expect, it } from "@effect/vitest";
import {
  Schedule,
  Function as EffectFunction,
  Array as EffectArray,
  Effect,
  Option,
} from "effect";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { TestClock } from "effect/testing";
import { StrictMode, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";

const AtomHarness = ({ children }: { readonly children: ReactNode }) => (
  <StrictMode>
    <RegistryProvider>{children}</RegistryProvider>
  </StrictMode>
);
describe("qualified Atom / React / Scheduler lifecycle", () => {
  it.effect("runs scheduled work and cancels queued work", () =>
    Effect.gen(function* () {
      const executed = vi.fn<(...args: readonly unknown[]) => void>();
      const cancelled = vi.fn<(...args: readonly unknown[]) => void>();
      const cancel = scheduleTask(cancelled);
      cancel();
      scheduleTask(executed);
      yield* Effect.sync(() => executed.mock.calls.length).pipe(
        Effect.repeat({
          until: (observed) => observed === 1,
          schedule: Schedule.spaced("50 millis"),
        }),
        Effect.timeout(1000),
        TestClock.withLive,
        Effect.tap((observed) =>
          Effect.sync(() => {
            expect(observed).toBe(1);
          })
        )
      );
      expect(cancelled).not.toHaveBeenCalled();
    })
  );
  it.effect(
    "hydrates, survives StrictMode remount, applies rapid updates and disposes",
    () =>
      Effect.gen(function* () {
        const count = Atom.make(42);
        const disposed = vi.fn<(...args: readonly unknown[]) => void>();
        const captured = vi.fn<(registry: AtomRegistry.AtomRegistry) => void>();
        const hydrated = vi.fn<(...args: readonly unknown[]) => void>();
        const errors = vi.fn<(...args: readonly unknown[]) => void>();
        const resource = Atom.make((get) => {
          get.addFinalizer(disposed);
          return "mounted";
        });
        const Counter = () => {
          const [value, setValue] = useAtom(count);
          useEffect(() => {
            hydrated();
          }, []);
          return (
            <button
              onClick={() => {
                setValue((n) => n + 1);
              }}
              type="button"
            >
              {value}
            </button>
          );
        };
        const Resource = () => {
          const registry = useContext(RegistryContext);
          const value = useAtomValue(resource);
          useEffect(() => {
            captured(registry);
          }, [registry]);
          return <span>{value}</span>;
        };
        yield* Effect.scoped(
          Effect.gen(function* () {
            // Browser test host: React owns DOM writes and registry scheduling. The
            // Effect scope owns root/host teardown even when an assertion fails.
            const host = yield* Effect.acquireRelease(
              Effect.sync(() => {
                const element = document.createElement("div");
                element.insertAdjacentHTML(
                  "afterbegin",
                  renderToString(
                    <AtomHarness>
                      <Counter />
                    </AtomHarness>
                  )
                );
                document.body.insertBefore(element, null);
                return element;
              }),
              (element) => Effect.sync(() => element.remove())
            );
            expect(host.textContent).toBe("42");
            const root = yield* Effect.acquireRelease(
              Effect.sync(() =>
                hydrateRoot(
                  host,
                  <AtomHarness>
                    <Counter />
                  </AtomHarness>,
                  {
                    onRecoverableError: errors,
                    onUncaughtError: errors,
                  }
                )
              ),
              (reactRoot) =>
                Effect.sync(() => {
                  reactRoot.unmount();
                })
            );
            yield* Effect.sync(() => hydrated.mock.calls.length).pipe(
              Effect.repeat({
                until: (observed) => observed > 0,
                schedule: Schedule.spaced("50 millis"),
              }),
              Effect.timeout(1000),
              TestClock.withLive,
              Effect.tap((observed) =>
                Effect.sync(() => {
                  expect(observed).toBeGreaterThan(0);
                })
              )
            );
            root.render(
              <AtomHarness>
                <Counter />
                <Resource />
              </AtomHarness>
            );
            yield* Effect.sync(() => captured.mock.calls.length).pipe(
              Effect.repeat({
                until: (observed) => observed === 2,
                schedule: Schedule.spaced("50 millis"),
              }),
              Effect.timeout(1000),
              TestClock.withLive,
              Effect.tap((observed) =>
                Effect.sync(() => {
                  expect(observed).toBe(2);
                })
              )
            );
            EffectFunction.pipe(
              EffectArray.dedupe(
                EffectFunction.pipe(
                  captured.mock.calls,
                  EffectArray.map(([registry]) => registry)
                )
              ),
              (actual) => {
                expect(actual).toHaveLength(1);
              }
            );
            const button = yield* Option.fromNullishOr(
              host.querySelector("button")
            ).pipe(
              Option.match({
                onNone: () =>
                  Effect.die(
                    new Error("The hydrated counter button is missing")
                  ),
                onSome: Effect.succeed,
              })
            );
            yield* Effect.forEach(
              EffectArray.range(1, 50),
              () =>
                Effect.sync(() => {
                  button.click();
                }),
              { discard: true }
            );
            yield* Effect.sync(() => button.textContent).pipe(
              Effect.repeat({
                until: (observed) => observed === "92",
                schedule: Schedule.spaced("50 millis"),
              }),
              Effect.timeout(1000),
              TestClock.withLive,
              Effect.tap((observed) =>
                Effect.sync(() => {
                  expect(observed).toBe("92");
                })
              )
            );
            expect(errors).not.toHaveBeenCalled();
            expect(disposed).not.toHaveBeenCalled();
          })
        );
        yield* Effect.sync(() => disposed.mock.calls.length).pipe(
          Effect.repeat({
            until: (observed) => observed === 1,
            schedule: Schedule.spaced("50 millis"),
          }),
          Effect.timeout(2000),
          TestClock.withLive,
          Effect.tap((observed) =>
            Effect.sync(() => {
              expect(observed).toBe(1);
            })
          )
        );
      })
  );
});
