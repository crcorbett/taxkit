import { dirname } from "node:path";

import { Array as EffectArray, HashSet, Record as EffectRecord } from "effect";

interface PackageExportTarget {
  readonly default?: string;
  readonly source?: string;
  readonly types?: string;
}

interface PackageManifest {
  readonly exports: Readonly<Record<string, PackageExportTarget>>;
}

interface PackFile {
  readonly path: string;
}

interface PackResult {
  readonly files: readonly PackFile[];
}

const sdkRoot = new URL("..", import.meta.url);
const packageJsonUrl = new URL("package.json", sdkRoot);
const smokeRoot = new URL(".pack-smoke/", sdkRoot);
const smokePackageRoot = new URL("node_modules/@whattax/sdk/", smokeRoot);
const smokeEntrypoint = new URL("smoke.mjs", smokeRoot);

const packageManifest: PackageManifest = await Bun.file(packageJsonUrl).json();

const packOutput = await Bun.$`npm pack --dry-run --json .`
  .cwd(sdkRoot.pathname)
  .text();
const packResults: readonly [PackResult] = JSON.parse(packOutput);
const [packResult] = packResults;
const packedFiles = EffectArray.map(packResult.files, (file) => file.path);
const packedFileSet = HashSet.fromIterable(packedFiles);
const failures: string[] = [];

for (const [exportPath, exportTarget] of EffectRecord.toEntries(
  packageManifest.exports
)) {
  if (exportTarget.source !== undefined) {
    failures.push(
      `${exportPath} must not expose a source condition in the publish manifest.`
    );
  }

  for (const condition of ["types", "default"] as const) {
    const target = exportTarget[condition];

    if (target === undefined) {
      failures.push(`${exportPath} is missing a ${condition} export target.`);
      continue;
    }

    const packedPath = target.replace(/^\.\//u, "");

    if (!HashSet.has(packedFileSet, packedPath)) {
      failures.push(
        `${exportPath} ${condition} export points to ${target}, which is absent from the packed artifact.`
      );
    }
  }
}

for (const packedPath of packedFiles) {
  if (packedPath.startsWith("src/")) {
    failures.push(
      `Packed artifact must not include source file: ${packedPath}`
    );
  }

  if (
    packedPath.endsWith(".test.js") ||
    packedPath.endsWith(".test.d.ts") ||
    packedPath.includes("/test/") ||
    packedPath.includes("/type-tests/")
  ) {
    failures.push(`Packed artifact must not include test file: ${packedPath}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }

  process.exit(1);
}

await Bun.$`rm -rf ${smokeRoot.pathname}`;
await Bun.$`mkdir -p ${smokePackageRoot.pathname}`;

try {
  for (const packedPath of packedFiles) {
    const sourceUrl = new URL(packedPath, sdkRoot);
    const destinationUrl = new URL(packedPath, smokePackageRoot);

    await Bun.$`mkdir -p ${dirname(destinationUrl.pathname)}`;
    await Bun.write(destinationUrl, Bun.file(sourceUrl));
  }

  await Bun.write(
    smokeEntrypoint,
    `
import { WhatTax } from "@whattax/sdk";
import * as effect from "@whattax/sdk/effect";
import { au } from "@whattax/sdk/au";
import { auEffect } from "@whattax/sdk/au/effect";
import * as schemas from "@whattax/sdk/schemas";
import * as testing from "@whattax/sdk/testing";

const checks = [
  ["root", typeof WhatTax.calculate === "function"],
  [
    "effect",
    typeof effect.calculateRunRequest === "function" &&
      typeof effect.calculateReportRequest === "function" &&
      typeof effect.calculateReport === "function" &&
      typeof effect.createClient === "function",
  ],
  ["au", typeof au.pay.takeHomePay === "function"],
  ["au/effect", typeof auEffect.createClient === "function"],
  ["schemas", Boolean(schemas.CalculatorRunRequest && schemas.CalculatorServiceError && schemas.WhatTaxCalculationError)],
  ["testing", Boolean(testing.AuPayTakeHomeCalculation)],
];

for (const [entrypoint, passed] of checks) {
  if (!passed) {
    throw new Error(\`Packed SDK smoke import failed for \${entrypoint}.\`);
  }
}

console.log("Packed SDK import smoke passed.");
`
  );

  await Bun.$`bun ${smokeEntrypoint.pathname}`.cwd(sdkRoot.pathname);
} finally {
  await Bun.$`rm -rf ${smokeRoot.pathname}`;
}

console.log("Packed SDK artifact check passed.");
