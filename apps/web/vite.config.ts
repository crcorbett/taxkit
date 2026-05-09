import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // `bun --bun vite` runs Vite under Bun's runtime, but it hides `vite` from
  // portless's argv[0] framework detection — so portless can't auto-inject
  // --port/--host. Per the portless skill, the fallback for that case is to
  // read process.env.PORT (and HOST) in config.
  server: {
    port: Number(process.env["PORT"]) || 3000,
    host: process.env["HOST"] || "localhost",
  },
  // In dev: resolve workspace packages from source so HMR fires across
  // the monorepo and there's no need to rebuild after every edit.
  // In build: drop the source condition so every workspace package
  // resolves through its `default` export to compiled `dist/`. tsdown
  // emits per-file ESM and rewrites tsconfig path aliases (`@/lib/foo`
  // → `../lib/foo`) in the emitted JS — that rewrite is what makes
  // dist consumption safe. Without it, dist files would resolve `@/*`
  // back to source via the package's tsconfig and produce a dist+src
  // module duplication for the same logical file (two `createContext`
  // calls → broken context).
  //
  resolve: {
    conditions: command === "build" ? [] : ["@packages/source"],
    dedupe: ["react", "react-dom"],
    tsconfigPaths: true,
  },
  ssr: {
    resolve: {
      conditions: command === "build" ? [] : ["@packages/source"],
      dedupe: ["react", "react-dom"],
    },
    // Bundle workspace packages AND base-ui / tabler-icons into the SSR
    // output. They use ESM imports that respect Vite's dedupe, so all
    // their `import "react"` calls collapse to a single React module
    // instance.
    noExternal: [/^@packages\//, /^@base-ui\//, /^@tabler\/icons-react/],
  },
  build: {
    rollupOptions: {
      // React must stay external across ALL chunks (including ones the
      // tanstackStart plugin emits, like `_libs/@tanstack/react-router…`).
      // `use-sync-external-store/shim` — a transitive dep of base-ui —
      // calls `require("react")` at runtime via the bundle's `__require`
      // helper. If Vite inlines React into any chunk, that copy is a
      // SECOND React module instance separate from the runtime-required
      // one used by the shim. Two `ReactSharedInternals` objects,
      // dispatcher only set on one, hooks crash with "null is not an
      // object (evaluating ReactSharedInternals.H.useSyncExternalStore)".
      //
      // External + workspace dedupe + Bun's hoisted node_modules
      // guarantees a single instance loaded once via the Node runtime.
      external: [
        "react",
        "react-dom",
        "react-dom/server",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
    }),
    // Nitro disabled in dev due to HTTP/2 + Transfer-Encoding bug with Bun
    // https://github.com/TanStack/router/issues/6050
    //
    // Prerender disabled because @tanstack/start-plugin-core's
    // preview-server-plugin hardcodes `dist/server/server.js` while
    // Nitro's Vercel preset writes to `.vercel/output/...`. Tracked
    // upstream at https://github.com/TanStack/router/issues/6562.
    command === "build"
      ? nitro({
          preset: "vercel",
          vercel: {
            functions: {
              runtime: "bun1.x",
            },
          },
        } as Parameters<typeof nitro>[0])
      : null,
    viteReact(),
  ],
}));
