import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import * as docsConfig from "@taxkit/docs-content/source.config";
import viteReact from "@vitejs/plugin-react";
import { Config, ConfigProvider, Effect, Schema } from "effect";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

import { WebsiteServerFunctionBase } from "./src/lib/config.ts";

export default defineConfig(() => {
  const alchemyOwnsCloudflareVite = Effect.runSync(
    Config.schema(Schema.String, "ALCHEMY_CLOUDFLARE_VITE_INJECTED").pipe(
      Config.withDefault(""),
      Config.map((value) => value === "1"),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv()
      )
    )
  );
  return {
    envPrefix: [],
    plugins: [
      // One shared generation phase keeps client and SSR presentation equal.
      mdx(docsConfig, {
        configPath: fileURLToPath(
          new URL(
            "../../packages/docs-content/source.config.ts",
            import.meta.url
          )
        ),
        outDir: fileURLToPath(
          new URL("../../packages/docs-content/.source", import.meta.url)
        ),
      }),
      ...(alchemyOwnsCloudflareVite
        ? []
        : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
      tanstackStart({
        server: { entry: "server" },
        serverFns: { base: WebsiteServerFunctionBase },
      }),
      viteReact(),
    ],
    resolve: { conditions: ["source"], tsconfigPaths: true },
    ssr: {
      noExternal: [/^@taxkit\//u],
      resolve: { conditions: ["source", "node"] },
    },
  };
});
