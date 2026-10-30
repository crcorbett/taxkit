import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import {
  Config,
  ConfigProvider,
  Effect,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { defineConfig } from "vite";

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
      ...EffectBoolean.match(alchemyOwnsCloudflareVite, {
        onFalse: () => [cloudflare({ viteEnvironment: { name: "ssr" } })],
        onTrue: () => [],
      }),
      tanstackStart({
        server: { entry: "entry.server" },
      }),
      viteReact(),
    ],
    resolve: { tsconfigPaths: true },
    ssr: { noExternal: [/^@taxkit\//u] },
  };
});
