import type { Theme } from "@taxkit/mdx/theme";
import { Array, Function as EffectFunction, Match, Record } from "effect";
import type { ComponentProps } from "react";

import type { Appearance } from "./schemas.js";

const formatFontStack = (stack: Theme["typography"]["text"]) =>
  EffectFunction.pipe(
    stack.names,
    Array.map((name) => `"${name}"`),
    Array.append(stack.fallback),
    Array.join(",")
  );

export const MdxTheme = ({
  theme,
  appearance = "system",
  ...props
}: Readonly<
  Omit<ComponentProps<"section">, "style"> & {
    theme: Theme;
    appearance?: Appearance;
  }
>) => {
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
  const style = {
    ...variables,
    "--mdx-code-font": formatFontStack(theme.typography.code),
    fontFamily: formatFontStack(theme.typography.text),
  };
  return (
    <section
      {...props}
      data-mdx-theme=""
      data-mdx-appearance={appearance}
      style={style}
    />
  );
};
