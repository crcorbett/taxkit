import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const useSourceWorkspacePackages = command !== "build";

  return {
    optimizeDeps: {
      exclude: ["@whattax/http-api"],
    },
    resolve: {
      conditions: useSourceWorkspacePackages ? ["source"] : undefined,
      tsconfigPaths: true,
    },
    ssr: {
      resolve: useSourceWorkspacePackages
        ? {
            conditions: ["source", "node"],
          }
        : undefined,
    },
    plugins: [
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
  };
});
