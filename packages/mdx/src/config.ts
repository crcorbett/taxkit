import { Config, Schema } from "effect";

export const PresentationTheme = Schema.Literals(["light", "dark"]);
export const PresentationThemeConfig = Config.schema(
  PresentationTheme,
  "MDX_THEME"
).pipe(Config.withDefault("light"));
