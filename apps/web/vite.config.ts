import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { ConfigProvider, Effect, Schema } from "effect";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

import {
  TaxKitWebClientInput,
  TaxKitWebClientInputConfig,
} from "./src/lib/config.client-input.ts";

export default defineConfig(({ command, mode }) => {
  const useSourceWorkspacePackages = command !== "build";
  const clientInput = Effect.runSync(
    TaxKitWebClientInputConfig.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({
          env: loadEnv(mode, import.meta.dirname, "VITE_"),
        })
      ),
      Effect.flatMap(
        Schema.encodeEffect(Schema.fromJsonString(TaxKitWebClientInput))
      )
    )
  );

  return {
    define: { __TAXKIT_WEB_CLIENT_INPUT__: clientInput },
    // Only the explicit typed public input is exposed; Vite still owns its standard metadata.
    envPrefix: [],
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
    resolve: useSourceWorkspacePackages
      ? { conditions: ["source"], tsconfigPaths: true }
      : { tsconfigPaths: true },
    ssr: useSourceWorkspacePackages
      ? { resolve: { conditions: ["source", "node"] } }
      : {},
  };
});
