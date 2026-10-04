import {
  RegistryContext,
  RegistryProvider,
  useAtom,
  useAtomValue,
} from "@effect/atom-react";
import { scheduleTask } from "@effect/atom-react/RegistryContext";
import { describe, expect, it } from "@effect/vitest";
import { Array as EffectArray, Effect, Option } from "effect";
import * as Atom from "effect/reactivity/Atom";
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
      const executed = vi.fn();
      const cancelled = vi.fn();
      const cancel = scheduleTask(cancelled);
      cancel();
      scheduleTask(executed);
      yield* Effect.promise(() =>
        expect.poll(() => executed.mock.calls.length).toBe(1)
      );
      expect(cancelled).not.toHaveBeenCalled();
    })
  );

  it.effect(
    "hydrates, survives StrictMode remount, applies rapid updates and disposes",
    () =>
      Effect.gen(function* () {
        const count = Atom.make(42);
        const disposed = vi.fn();
        const captured = vi.fn();
        const hydrated = vi.fn();
        const errors = vi.fn();
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
            <button onClick={() => setValue((n) => n + 1)} type="button">
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
                document.body.append(element);
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
              (reactRoot) => Effect.sync(() => reactRoot.unmount())
            );
            yield* Effect.promise(() =>
              expect.poll(() => hydrated.mock.calls.length).toBeGreaterThan(0)
            );
            root.render(
              <AtomHarness>
                <Counter />
                <Resource />
              </AtomHarness>
            );
            yield* Effect.promise(() =>
              expect.poll(() => captured.mock.calls.length).toBe(2)
            );
            expect(
              EffectArray.dedupe(
                EffectArray.map(captured.mock.calls, ([registry]) => registry)
              )
            ).toHaveLength(1);
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
              () => Effect.sync(() => button.click()),
              { discard: true }
            );
            yield* Effect.promise(() =>
              expect.poll(() => button.textContent).toBe("92")
            );
            expect(errors).not.toHaveBeenCalled();
            expect(disposed).not.toHaveBeenCalled();
          })
        );
        yield* Effect.promise(() =>
          expect
            .poll(() => disposed.mock.calls.length, { timeout: 2000 })
            .toBe(1)
        );
      })
  );
});
