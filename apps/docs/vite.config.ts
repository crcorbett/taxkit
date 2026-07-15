import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import * as docsConfig from "@taxkit/docs-content/source.config";
import viteReact from "@vitejs/plugin-react";
import fumadocsMdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(async ({ command }) => {
  const useSourceWorkspacePackages = command !== "build";

  return {
    plugins: [
      await fumadocsMdx(docsConfig, {
        configPath: "../../packages/docs-content/source.config.ts",
        outDir: "../../packages/docs-content/.source",
      }),
      tanstackStart(),
      viteReact(),
      nitro({
        preset: "vercel",
        vercel: {
          functions: {
            runtime: "nodejs22.x",
          },
        },
      }),
    ],
    resolve: {
      conditions: useSourceWorkspacePackages ? ["source"] : undefined,
      tsconfigPaths: true,
    },
    ssr: {
      noExternal: [/^@taxkit\/docs-content/u, /^@taxkit\/docs-fumadocs/u],
      resolve: useSourceWorkspacePackages
        ? {
            conditions: ["source", "node"],
          }
        : undefined,
    },
  };
});
