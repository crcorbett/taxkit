import { Schema } from "effect";

import { Theme } from "../theme.schemas.js";
import themeInput from "./theme.json" with { type: "json" };

export { default as exampleThemeInput } from "./theme.json" with { type: "json" };
export const exampleTheme = Schema.decodeUnknownEffect(Theme, {
  onExcessProperty: "error",
})(themeInput);
