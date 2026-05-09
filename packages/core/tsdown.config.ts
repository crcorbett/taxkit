import { definePackageConfig } from "../../tsdown.base";

export default definePackageConfig({
  customExports: (exports) => ({
    ...exports,
    "./seo": {
      "@packages/source": "./src/seo.ts",
      default: "./dist/seo.js",
    },
  }),
  entry: ["src/**/*.ts"],
});
