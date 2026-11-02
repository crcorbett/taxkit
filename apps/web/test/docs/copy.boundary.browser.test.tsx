import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Schedule } from "effect";
import { TestClock } from "effect/testing";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import { DocsCopyButton } from "../../src/lib/docs/copy-button.container";

const source = "\tconst amount = 42;\n";
const mountControls = Effect.fnUntraced(function* () {
  const host = yield* Effect.acquireRelease(
    Effect.sync(() => {
      const element = document.createElement("div");
      document.body.insertBefore(element, null);
      return element;
    }),
    (element) =>
      Effect.sync(() => {
        element.remove();
      })
  );
  const root = yield* Effect.acquireRelease(
    Effect.sync(() => createRoot(host)),
    (value) =>
      Effect.sync(() => {
        value.unmount();
      })
  );
  yield* Effect.sync(() => {
    root.render(
      <RegistryProvider>
        <DocsCopyButton label="Copy first example" text={source} />
        <DocsCopyButton label="Copy second example" text={source} />
      </RegistryProvider>
    );
  });
  const first = yield* Effect.sync(() =>
    host.querySelector<HTMLButtonElement>(
      'button[aria-label="Copy first example"]'
    )
  ).pipe(
    Effect.repeat({
      until: (value) => Option.isSome(Option.fromNullishOr(value)),
      schedule: Schedule.spaced("10 millis"),
    }),
    Effect.flatMap((value) => Effect.fromOption(Option.fromNullishOr(value))),
    Effect.timeout("2 seconds"),
    TestClock.withLive
  );
  return { first, host };
});

describe("documentation clipboard controls", () => {
  it.effect(
    "copies exact whitespace and keeps identical examples independent",
    () =>
      Effect.gen(function* () {
        const write = yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
          ),
          (spy) =>
            Effect.sync(() => {
              spy.mockRestore();
            })
        );
        const { first, host } = yield* mountControls();
        yield* Effect.sync(() => {
          first.click();
        });
        yield* Effect.sync(() => first.textContent).pipe(
          Effect.repeat({
            until: (value) =>
              Option.fromNullishOr(value).pipe(
                Option.exists((text) => text.includes("Copied"))
              ),
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        expect(write).toHaveBeenCalledExactlyOnceWith(source);
        expect({
          first: first.textContent,
          second: host.querySelector('button[aria-label="Copy second example"]')
            ?.textContent,
        }).toStrictEqual({ first: "Copied", second: "Copy" });
      }).pipe(Effect.scoped)
  );

  it.effect(
    "shows safe denial feedback without reporting the private browser cause",
    () =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi
              .spyOn(navigator.clipboard, "writeText")
              .mockRejectedValue(
                new DOMException("PRIVATE_CLIPBOARD9", "NotAllowedError")
              )
          ),
          (spy) =>
            Effect.sync(() => {
              spy.mockRestore();
            })
        );
        const errors = yield* Effect.acquireRelease(
          Effect.sync(() => vi.spyOn(console, "error")),
          (spy) =>
            Effect.sync(() => {
              spy.mockRestore();
            })
        );
        const { first, host } = yield* mountControls();
        yield* Effect.sync(() => {
          first.click();
        });
        yield* Effect.sync(() => first.textContent).pipe(
          Effect.repeat({
            until: (value) =>
              Option.fromNullishOr(value).pipe(
                Option.exists((text) => text.includes("Copy failed"))
              ),
            schedule: Schedule.spaced("10 millis"),
          }),
          Effect.timeout("2 seconds"),
          TestClock.withLive
        );
        expect({
          label: first.textContent,
          disabled: first.disabled,
          manualCopy: host.textContent?.includes(
            "Select the text and copy it manually."
          ),
          privateCause: host.textContent?.includes("PRIVATE_CLIPBOARD9"),
        }).toStrictEqual({
          label: "Copy failed",
          disabled: false,
          manualCopy: true,
          privateCause: false,
        });
        expect(errors).not.toHaveBeenCalled();
      }).pipe(Effect.scoped)
  );
});
