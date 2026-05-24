interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

const sdkRoot = new URL("..", import.meta.url);
const sourceRoot = new URL("src", sdkRoot);
const packageJsonUrl = new URL("package.json", sdkRoot);
const httpApiPackageJsonUrl = new URL("../../http-api/package.json", sdkRoot);
const rootEntrypoint = new URL("src/index.ts", sdkRoot);
const browserEntrypoints = [
  rootEntrypoint,
  new URL("src/au.ts", sdkRoot),
  new URL("src/schemas/index.ts", sdkRoot),
] satisfies URL[];

const packageManifest: PackageManifest = await Bun.file(packageJsonUrl).json();
const httpApiPackageManifest: PackageManifest = await Bun.file(
  httpApiPackageJsonUrl
).json();
const dependencySections = [
  packageManifest.dependencies,
  packageManifest.devDependencies,
  packageManifest.optionalDependencies,
  packageManifest.peerDependencies,
] satisfies readonly (Readonly<Record<string, string>> | undefined)[];
const httpApiDependencySections = [
  httpApiPackageManifest.dependencies,
  httpApiPackageManifest.devDependencies,
  httpApiPackageManifest.optionalDependencies,
  httpApiPackageManifest.peerDependencies,
] satisfies readonly (Readonly<Record<string, string>> | undefined)[];

const failures: string[] = [];

if (
  dependencySections.some(
    (dependencies) => dependencies?.["@whattax/http-api"] !== undefined
  )
) {
  failures.push("SDK package metadata must not depend on @whattax/http-api.");
}

if (
  !httpApiDependencySections.some(
    (dependencies) => dependencies?.["@whattax/sdk"] !== undefined
  )
) {
  failures.push(
    "HTTP API package metadata must depend on @whattax/sdk for the transport integration direction."
  );
}

const httpApiImports =
  await Bun.$`rg -n --fixed-strings "@whattax/http-api" ${sourceRoot}`
    .quiet()
    .nothrow();

if (httpApiImports.exitCode === 0) {
  failures.push(
    `SDK source must not import @whattax/http-api:\n${httpApiImports.stdout.toString()}`
  );
}

const rootSource = await Bun.file(rootEntrypoint).text();

if (rootSource.includes("@whattax/rules-au-") || rootSource.includes("./au")) {
  failures.push("Root SDK entrypoint must not import AU packages or subpaths.");
}

for (const entrypoint of browserEntrypoints) {
  const source = await Bun.file(entrypoint).text();

  if (
    source.includes("node:") ||
    source.includes("bun:") ||
    source.includes('from "bun"') ||
    source.includes("from 'bun'")
  ) {
    failures.push(
      `Browser-safe SDK entrypoint imports a server-only module: ${entrypoint.pathname}`
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }

  process.exit(1);
}

console.log("SDK import boundaries passed.");
