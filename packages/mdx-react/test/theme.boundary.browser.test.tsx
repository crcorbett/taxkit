import { describe, expect, it } from "@effect/vitest";
import { MdxCodeBlock } from "@taxkit/mdx-react/code-block";
import type { Appearance } from "@taxkit/mdx-react/schemas";

import "@taxkit/mdx-react/styles.css";
import { MdxTheme } from "@taxkit/mdx-react/theme";
import { ReadingCodeBlock } from "@taxkit/mdx/schemas";
import type { Theme } from "@taxkit/mdx/theme";
import {
  Array,
  Effect,
  Function as EffectFunction,
  Option,
  Schedule,
} from "effect";
import { TestClock } from "effect/testing";
import { createRoot } from "react-dom/client";

import { code } from "./article.fixture.js";
import { journalTheme } from "./theme.fixture.js";

const NestedThemes = ({
  block,
  theme,
  outer,
  inner,
}: Readonly<{
  block: ReadingCodeBlock;
  theme: Theme;
  outer: Exclude<Appearance, "system">;
  inner: Exclude<Appearance, "system">;
}>) => (
  <MdxTheme appearance={outer} theme={theme}>
    <MdxCodeBlock
      data-example={`outer-${outer}`}
      language={block.language}
      lines={block.lines}
    />
    <MdxTheme appearance={inner} theme={theme}>
      <fieldset data-mdx-appearance-controls="">
        <legend>Nested {inner} theme appearance</legend>
        <label>
          <input
            data-choice={`${inner}-light`}
            data-mdx-appearance-option="light"
            name={`appearance-${inner}`}
            type="radio"
            value="light"
          />
          Light
        </label>
        <label>
          <input
            data-choice={`${inner}-dark`}
            data-mdx-appearance-option="dark"
            name={`appearance-${inner}`}
            type="radio"
            value="dark"
          />
          Dark
        </label>
      </fieldset>
      <MdxCodeBlock
        data-example={`inner-${inner}`}
        language={block.language}
        lines={block.lines}
      />
    </MdxTheme>
  </MdxTheme>
);

const mountThemes = Effect.fnUntraced(function* () {
  const theme = yield* journalTheme;
  const checked = yield* code;
  const block = yield* ReadingCodeBlock.makeEffect({
    ...checked,
    lines: EffectFunction.pipe(
      checked.lines,
      Array.map((line) =>
        EffectFunction.pipe(
          line,
          Array.map((token) => ({
            ...token,
            light: { ...token.light, style: "bold" as const },
            dark: { ...token.dark, style: "italic" as const },
          }))
        )
      )
    ),
  });
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
      <>
        <NestedThemes block={block} inner="light" outer="dark" theme={theme} />
        <NestedThemes block={block} inner="dark" outer="light" theme={theme} />
      </>
    );
  });
  yield* Effect.sync(
    () => host.querySelectorAll(".mdx-code-token").length
  ).pipe(
    Effect.repeat({
      until: (count) => count === 8,
      schedule: Schedule.spaced("10 millis"),
    }),
    Effect.timeout("2 seconds"),
    TestClock.withLive
  );
  return host;
});

const readToken = Effect.fnUntraced(function* ({
  host,
  example,
}: Readonly<{ host: HTMLElement; example: string }>) {
  const token = yield* Effect.sync(() =>
    host.querySelector(`[data-example="${example}"] .mdx-code-token`)
  ).pipe(
    Effect.flatMap((value) => Effect.fromOption(Option.fromNullishOr(value)))
  );
  return yield* Effect.sync(() => {
    const style = getComputedStyle(token);
    return {
      color: style.color,
      fontStyle: style.fontStyle,
      fontWeight: style.fontWeight,
    };
  });
});

const readThemes = (host: HTMLElement) =>
  Effect.all({
    outerDark: readToken({ host, example: "outer-dark" }),
    innerLight: readToken({ host, example: "inner-light" }),
    outerLight: readToken({ host, example: "outer-light" }),
    innerDark: readToken({ host, example: "inner-dark" }),
  });

const chooseAppearance = Effect.fnUntraced(function* ({
  host,
  choice,
}: Readonly<{ host: HTMLElement; choice: string }>) {
  const input = yield* Effect.sync(() =>
    host.querySelector<HTMLInputElement>(`input[data-choice="${choice}"]`)
  ).pipe(
    Effect.flatMap((value) => Effect.fromOption(Option.fromNullishOr(value)))
  );
  yield* Effect.sync(() => {
    input.click();
  });
});

describe("independent nested MDX theme boundaries", () => {
  it.effect(
    "isolates token colour, style and weight in both directions and keeps native appearance choices local",
    () =>
      Effect.gen(function* () {
        const light = {
          color: "rgb(18, 52, 86)",
          fontStyle: "normal",
          fontWeight: "600",
        };
        const dark = {
          color: "rgb(254, 220, 186)",
          fontStyle: "italic",
          fontWeight: "400",
        };
        const host = yield* mountThemes();
        const initial = yield* readThemes(host);
        expect(initial).toStrictEqual({
          outerDark: dark,
          innerLight: light,
          outerLight: light,
          innerDark: dark,
        });
        yield* chooseAppearance({ host, choice: "light-dark" });
        const selectedDark = yield* readThemes(host);
        expect(selectedDark).toStrictEqual({
          outerDark: dark,
          innerLight: dark,
          outerLight: light,
          innerDark: dark,
        });
        yield* chooseAppearance({ host, choice: "dark-light" });
        const selectedLight = yield* readThemes(host);
        expect(selectedLight).toStrictEqual({
          outerDark: dark,
          innerLight: dark,
          outerLight: light,
          innerDark: light,
        });
      }).pipe(Effect.scoped)
  );
});
