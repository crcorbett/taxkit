import { useAtom } from "@effect/atom-react";
import type { DocsPublicPage } from "@taxkit/content/schemas";
import { Array, Function as EffectFunction, Match, Record } from "effect";
import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import type { ReactNode } from "react";

import { docsAppearanceAtom } from "./appearance.atoms";

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
      {children}
    </section>
  );
};

export const DocsAppearance = () => {
  const group = useId();
  const [appearance, chooseAppearance] = useAtom(docsAppearanceAtom);
  return (
    <fieldset className="docs-theme-options">
      <legend className="sr-only">Appearance</legend>
      {EffectFunction.pipe(
        [
          { mode: "system", label: "System", icon: Monitor },
          { mode: "light", label: "Light", icon: Sun },
          { mode: "dark", label: "Dark", icon: Moon },
        ] as const,
        Array.map(({ mode, label, icon: Icon }) => (
          <label key={mode} title={`${label} appearance`}>
            <input
              className="docs-theme-input"
              data-mode={mode}
              checked={appearance === mode}
              onChange={() => {
                chooseAppearance(mode);
              }}
              name={group}
              type="radio"
              value={mode}
            />
            <Icon aria-hidden="true" size={17} />
            <span className="sr-only">{label}</span>
          </label>
        ))
      )}
    </fieldset>
  );
};
