import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { Config, Effect, Schema } from "effect";
import { defineConfig } from "vite";

import { WebsiteServerFunctionBase } from "./src/lib/config.ts";

export default defineConfig(() => {
  const alchemyOwnsCloudflareVite = Effect.runSync(
    Config.schema(Schema.String, "ALCHEMY_CLOUDFLARE_VITE_INJECTED").pipe(
      Config.withDefault(""),
      Config.map((value) => value === "1")
    )
  );
  return {
    envPrefix: [],
    plugins: [
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
