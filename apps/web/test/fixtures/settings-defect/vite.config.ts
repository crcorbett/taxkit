import { fileURLToPath } from "node:url";

import { Option } from "effect";
import { defineConfig, mergeConfig } from "vite";
import type { ConfigEnv, Plugin } from "vite";

import website from "../../../vite.config";

// The Website's own Vite configuration, rooted at the Website. Only the server
// runtime's settings Layer module resolves to this fixture's Layer.
const websiteRoot = fileURLToPath(new URL("../../../", import.meta.url));
const serverRuntime = fileURLToPath(
  new URL("../../../src/lib/runtime.server.ts", import.meta.url)
);
const fixtureLayer = fileURLToPath(
  new URL("settings.layer.ts", import.meta.url)
);
const settingsDefect: Plugin = {
  config: () => ({ root: websiteRoot }),
  enforce: "pre",
  name: "taxkit-website-settings-defect",
  resolveId: (source, importer) =>
    Option.some(fixtureLayer).pipe(
      Option.filter(
        () => source === "./host/settings.layer" && importer === serverRuntime
      ),
      Option.getOrNull
    ),
};
export default defineConfig((env: ConfigEnv) => {
  const base = website(env);
  // The fixture plugin comes first so every other plugin sees the Website root.
  return mergeConfig({ plugins: [settingsDefect] }, base);
});
