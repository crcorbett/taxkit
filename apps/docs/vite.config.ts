import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import * as docsConfig from "@taxkit/docs-content/source.config";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

const docsContentConfigPath = fileURLToPath(
  new URL("../../packages/docs-content/source.config.ts", import.meta.url)
);
const docsContentSourceDirectory = fileURLToPath(
  new URL("../../packages/docs-content/.source", import.meta.url)
);

export default defineConfig(() => {
  const alchemyOwnsCloudflareVite =
    // oxlint-disable-next-line effect/no-process-outside-boundaries -- Vite configuration is the exact host boundary for Alchemy's documented process-local injection signal.
    process.env.ALCHEMY_CLOUDFLARE_VITE_INJECTED === "1";

  const docsMdxForBuild = mdx(docsConfig, {
    configPath: docsContentConfigPath,
    outDir: docsContentSourceDirectory,
  });

  return {
    plugins: [
      // Fumadocs writes the generated collection modules during buildStart.
      // TanStack Start uses Vite's client and server environments, so leave
      // this generator in the shared build phase and do not run it once per
      // environment. Otherwise the two MDX transforms can observe different
      // generated content and React can reject hydration in the deployed app.
      docsMdxForBuild,
      ...(alchemyOwnsCloudflareVite
        ? []
        : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
      tanstackStart({
        server: {
          entry: "server",
        },
      }),
      viteReact(),
    ],
    resolve: {
      conditions: ["source"],
      tsconfigPaths: true,
    },
    ssr: {
      noExternal: [/^@taxkit\/docs-content/u, /^@taxkit\/docs-fumadocs/u],
      resolve: {
        conditions: ["source", "node"],
      },
    },
  };
});
