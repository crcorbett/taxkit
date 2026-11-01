import type { DocsPublicPage } from "@taxkit/content/schemas";
import { Array, Function as EffectFunction, Match, Record } from "effect";
import { useId } from "react";
import type { ReactNode } from "react";

const formatFontStack = (
  stack: DocsPublicPage["theme"]["typography"]["text"]
) =>
  EffectFunction.pipe(
    stack.names,
    Array.map((name) => `"${name}"`),
    Array.append(stack.fallback),
    Array.join(",")
  );

export const DocsReader = ({
  theme,
  children,
}: Readonly<{
  theme: DocsPublicPage["theme"];
  children: ReactNode;
}>) => {
  const group = useId();
  const variables = EffectFunction.pipe(
    [
      { mode: "light", scheme: theme.light },
      { mode: "dark", scheme: theme.dark },
    ],
    Array.flatMap(({ mode, scheme }) =>
      EffectFunction.pipe(
        scheme.palette,
        Record.toEntries,
        Array.map(([role, color]) => {
          const name = Match.value(role).pipe(
            Match.when("surfaceAlt", () => "surface-alt"),
            Match.orElse((value) => value)
          );
          return [`--mdx-${name}-${mode}`, color] as const;
        })
      )
    ),
    Record.fromEntries
  );
  const readingStyle = {
    ...variables,
    "--mdx-code-font": formatFontStack(theme.typography.code),
    fontFamily: formatFontStack(theme.typography.text),
  };
  return (
    <section className="docs-reader" style={readingStyle}>
      <fieldset className="docs-theme-options">
        <legend>Appearance</legend>
        {EffectFunction.pipe(
          ["system", "light", "dark"] as const,
          Array.map((mode) => (
            <label key={mode}>
              <input
                data-mode={mode}
                defaultChecked={mode === "system"}
                name={group}
                type="radio"
                value={mode}
              />
              <span>{mode}</span>
            </label>
          ))
        )}
      </fieldset>
      {children}
    </section>
  );
};
