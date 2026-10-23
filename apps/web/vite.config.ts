import { cloudflare } from "@cloudflare/vite-plugin";
import { NodeServices } from "@effect/platform-node";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { Config, ConfigProvider, Effect, Schema } from "effect";
import { defineConfig } from "vite";

import { generateDocsImages } from "./scripts/docs-images.build.ts";

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
      {
        configResolved: () =>
          Effect.runPromise(
            generateDocsImages.pipe(
              Effect.asVoid,
              Effect.provide(NodeServices.layer)
            )
          ),
        name: "taxkit-accepted-doc-images",
      },
      ...(alchemyOwnsCloudflareVite
        ? []
        : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
      tanstackStart({
        server: { entry: "server" },
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
