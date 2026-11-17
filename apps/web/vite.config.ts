import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { workerCompatibility } from "@taxkit/infrastructure/worker-settings";
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
  // Alchemy sets "1" when its own Cloudflare plugin owns the build. Any other
  // value is a configuration error rather than a silent standalone build.
  const alchemyOwnsCloudflareVite = Effect.runSync(
    Config.schema(
      Schema.Literals(["0", "1"]),
      "ALCHEMY_CLOUDFLARE_VITE_INJECTED"
    ).pipe(
      Config.withDefault("0"),
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
        // A standalone build takes its compatibility from the same owner as
        // the deployed Workers; it has no bindings of its own.
        onFalse: () => [
          cloudflare({
            config: {
              compatibility_date: workerCompatibility.date,
              compatibility_flags: workerCompatibility.flags,
              main: "src/entry.server.ts",
            },
            viteEnvironment: { name: "ssr" },
          }),
        ],
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
