import { defineConfig, type UserConfig } from "tsdown";

/**
 * Canonical tsdown defaults for `@packages/*` library packages in this monorepo.
 *
 * What you get:
 * - **Per-file ESM** (`unbundle: true`) — output mirrors `src/` so apps tree-shake
 *   cleanly. Required because Vite consumers import individual subpaths.
 * - **`.d.ts` per file** via oxc isolatedDeclarations (with tsc fallback for files
 *   that need full inference).
 * - **`@packages/source` custom condition** in the auto-generated `exports` map.
 *   Apps' Vite/Vitest configs add this condition for dev so resolution lands on
 *   `./src/*` for live-source HMR; production builds drop the condition and land
 *   on the compiled `./dist/*`.
 * - **`publishConfig.exports`** auto-generated — the package is npm-publish-ready
 *   without the `@packages/source` condition leaking to external consumers.
 * - **`platform: "neutral"`** — output runs in browser, Node, or Bun without
 *   environment-specific assumptions.
 * - **Source maps** for stack traces in dev and prod.
 *
 * Pair this with `tsc --noEmit` for type-checking — tsdown handles emit, tsc
 * handles strictness. There's no `tsconfig.build.json` because tsdown reads the
 * package's regular `tsconfig.json`.
 *
 * @example
 * ```ts
 * // packages/ui/tsdown.config.ts
 * import { definePackageConfig } from "../../tsdown.base";
 *
 * export default definePackageConfig({
 *   entry: ["src/**\/*.{ts,tsx}"],
 *   // Optional: extra non-generated subpath exports (e.g. CSS, JSON, workers)
 *   customExports: (exports) => ({
 *     ...exports,
 *     "./styles/*.css": "./src/styles/*.css",
 *   }),
 * });
 * ```
 */
type CustomExportsFn = (
  exports: Record<string, unknown>
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export type PackageConfigOverrides = UserConfig & {
  /** Extra subpaths to merge into the generated `exports` map (e.g. CSS, JSON). */
  customExports?: Record<string, unknown> | CustomExportsFn;
};

export const definePackageConfig = ({
  customExports,
  exports,
  ...rest
}: PackageConfigOverrides) =>
  defineConfig({
    dts: true,
    exports: {
      devExports: "@packages/source",
      all: true,
      // Merge per-package customExports without forcing each package to
      // restate `devExports` and `all`.
      ...(customExports ? { customExports } : {}),
      ...(typeof exports === "object" ? exports : {}),
    },
    format: "esm",
    platform: "neutral",
    sourcemap: true,
    unbundle: true,
    ...rest,
  });
