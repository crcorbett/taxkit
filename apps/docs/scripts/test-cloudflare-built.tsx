import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Effect, Record as EffectRecord, Schema } from "effect";
import { chromium } from "playwright";
import type { Browser, Page, Request } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";

import { DocsRecoverableError } from "../src/components/docs-route-states";

const { join } = nodePath;

interface BrowserRouterHarness {
  readonly navigate: (options: { readonly to: string }) => Promise<void>;
}

declare global {
  var __TSR_ROUTER__: BrowserRouterHarness | undefined;
}

const appRoot = new URL("../", import.meta.url);
const repositoryRoot = new URL("../../", appRoot);
const builtRoot = new URL("dist/", appRoot);
const serverRoot = new URL("server/", builtRoot);
const receiptRoot = new URL("../../tmp/docs-cloudflare/", appRoot);
const screenshotRoot = new URL("screenshots/", receiptRoot);
const captureScreenshots = Bun.argv.includes("--screenshots");
const docsWorkerAssetOutputDirectory = "client";
const docsWorkerGeneratedMain = "index.js";
const workerSizeLimitBytes = 3 * 1024 * 1024;
const knownPath = "/guides/calculate-australian-take-home-pay";
const missingPath = "/__docs-evidence__/missing";
const delayedPageLoad = {
  delayMs: 800,
  path: knownPath,
  visiblePostcondition: "Loading documentation",
} as const;
const recoverableSourceError = {
  message: "The documentation source could not be loaded.",
  visiblePostcondition: "Docs page is unavailable",
} as const;
const runtimeProofHeaders = {
  "x-taxkit-docs-runtime-proof": "construction-count",
};
const UnknownRecord = Schema.Record(Schema.String, Schema.Unknown);
const GeneratedWranglerConfig = Schema.Struct({
  assets: Schema.Struct({
    binding: Schema.optional(Schema.Unknown),
    directory: Schema.String,
    run_worker_first: Schema.optional(Schema.Unknown),
  }),
  compatibility_date: Schema.String,
  compatibility_flags: Schema.Array(Schema.String),
  d1_databases: Schema.Array(Schema.Unknown),
  kv_namespaces: Schema.Array(Schema.Unknown),
  main: Schema.String,
  no_bundle: Schema.Boolean,
  queues: Schema.Struct({
    consumers: Schema.Array(Schema.Unknown),
    producers: Schema.Array(Schema.Unknown),
  }),
  r2_buckets: Schema.Array(Schema.Unknown),
  services: Schema.Array(Schema.Unknown),
  vars: UnknownRecord,
});
const decodeJsonRecord = (source: string) =>
  Schema.decodeUnknownEffect(Schema.fromJsonString(UnknownRecord))(source);

const sha256File = async (path: URL) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");

const sha256Directory = async (
  directory: URL,
  include: (path: string) => boolean = () => true
) => {
  const files = await globalThis.Array.fromAsync(
    new Bun.Glob("**/*").scan({
      cwd: fileURLToPath(directory),
      onlyFiles: true,
    })
  );
  const hash = createHash("sha256");
  const entries = await Promise.all(
    files
      .filter(include)
      .toSorted()
      .map(async (path) => ({
        bytes: new Uint8Array(
          await Bun.file(new URL(path, directory)).arrayBuffer()
        ),
        path,
      }))
  );

  for (const { bytes, path } of entries) {
    hash.update(path);
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }

  return hash.digest("hex");
};

const parseRgb = (value: string): readonly [number, number, number] => {
  const channels = value.match(/\d+(?:\.\d+)?/gu)?.map(Number);

  assert.ok(channels !== undefined && channels.length >= 3);

  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
};

const relativeLuminance = (color: readonly [number, number, number]) =>
  color
    .map((channel) => channel / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )
    .reduce(
      (luminance, channel, index) =>
        luminance + channel * ([0.2126, 0.7152, 0.0722][index] ?? 0),
      0
    );

const assertComputedContrast = async (
  page: Page,
  foregroundSelector: string,
  backgroundSelector: string
) => {
  const colors = await page.evaluate(
    ({ background, foreground }) => {
      const foregroundElement = document.querySelector(foreground);
      const backgroundElement = document.querySelector(background);

      if (
        !(foregroundElement instanceof HTMLElement) ||
        !(backgroundElement instanceof HTMLElement)
      ) {
        throw new Error("The contrast target was unavailable.");
      }

      return {
        background: getComputedStyle(backgroundElement).backgroundColor,
        foreground: getComputedStyle(foregroundElement).color,
      };
    },
    { background: backgroundSelector, foreground: foregroundSelector }
  );
  const foregroundLuminance = relativeLuminance(parseRgb(colors.foreground));
  const backgroundLuminance = relativeLuminance(parseRgb(colors.background));
  const ratio =
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

  assert.ok(
    ratio >= 4.5,
    `${foregroundSelector} contrast ratio ${ratio.toFixed(2)} must be at least 4.5.`
  );
};

const waitForInteractiveDocs = async (page: Page) => {
  await page.waitForFunction(
    () =>
      globalThis.__TSR_ROUTER__ !== undefined &&
      document.querySelector('[data-tk-hydrated="true"]') !== null &&
      document.querySelector('[data-tk-navigation-interactive="true"]') !== null
  );
};

const isExpectedServerFunctionAbort = (request: Request, origin: string) => {
  const url = new URL(request.url());

  return (
    (request.resourceType() === "fetch" || request.resourceType() === "xhr") &&
    url.origin === origin &&
    url.pathname.startsWith("/_serverFn/") &&
    request.failure()?.errorText === "net::ERR_ABORTED"
  );
};

const processEnvironment = EffectRecord.filter(Bun.env, (_, name) =>
  /^(?:CI|COLORTERM|LANG|LC_ALL|NO_COLOR|PATH|TERM|TMPDIR|TZ)$/u.test(name)
);
processEnvironment.NO_COLOR = "1";
processEnvironment.WRANGLER_SEND_METRICS = "false";

const runProcess = async (
  executable: string,
  cwd: string,
  arguments_: readonly string[]
) => {
  const process = Bun.spawn([executable, ...arguments_], {
    cwd,
    env: processEnvironment,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [exitCode, stderr, stdout] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
    new Response(process.stdout).text(),
  ]);
  const output = `${stdout}\n${stderr}`;

  assert.equal(exitCode, 0, output);

  return output;
};

interface ProcessEntry {
  readonly command: string;
  readonly parentPid: number;
  readonly pid: number;
}

const readProcessTable = async (): Promise<readonly ProcessEntry[]> => {
  const output = await runProcess("/bin/ps", fileURLToPath(repositoryRoot), [
    "-ax",
    "-o",
    "pid=,ppid=,command=",
  ]);

  return output.split("\n").flatMap((line) => {
    const match = /^\s*(?<pid>\d+)\s+(?<parentPid>\d+)\s+(?<command>.+)$/u.exec(
      line
    );

    return match === null
      ? []
      : [
          {
            command: match.groups?.["command"] ?? "",
            parentPid: Number(match.groups?.["parentPid"]),
            pid: Number(match.groups?.["pid"]),
          },
        ];
  });
};

const descendantEntries = (
  entries: readonly ProcessEntry[],
  rootPid: number
): readonly ProcessEntry[] => {
  const descendants: ProcessEntry[] = [];
  const pendingParents = [rootPid];

  while (pendingParents.length > 0) {
    const parentPid = pendingParents.shift();

    for (const entry of entries) {
      if (entry.parentPid === parentPid) {
        descendants.push(entry);
        pendingParents.push(entry.pid);
      }
    }
  }

  return descendants;
};

const reservePort = () => {
  const reservation = Bun.serve({
    fetch: () => new Response("reserved"),
    hostname: "127.0.0.1",
    port: 0,
  });
  const { port } = reservation;
  reservation.stop(true);

  return port;
};

const bunExecutable = Bun.which("bun");

assert.ok(bunExecutable !== null, "The Cloudflare proof requires Bun.");
await rm(builtRoot, { force: true, recursive: true });
await runProcess(bunExecutable, fileURLToPath(appRoot), [
  "run",
  "build:cloudflare",
]);

const generatedConfigSource = await Bun.file(
  new URL("wrangler.json", serverRoot)
).text();
const generatedConfigRecord = Effect.runSync(
  decodeJsonRecord(generatedConfigSource)
);
const generatedConfig = Effect.runSync(
  Schema.decodeUnknownEffect(GeneratedWranglerConfig)(generatedConfigRecord)
);

assert.deepEqual(generatedConfig.vars, {});
// Keep the built-output oracle independent of the infrastructure declaration.
assert.equal(generatedConfig.compatibility_date, "2026-06-24");
assert.deepEqual(generatedConfig.compatibility_flags, ["nodejs_compat"]);
assert.deepEqual(generatedConfig.assets, {
  directory: `../${docsWorkerAssetOutputDirectory}`,
});
assert.deepEqual(generatedConfig.kv_namespaces, []);
assert.deepEqual(generatedConfig.r2_buckets, []);
assert.deepEqual(generatedConfig.d1_databases, []);
assert.deepEqual(generatedConfig.services, []);
assert.deepEqual(generatedConfig.queues, {
  consumers: [],
  producers: [],
});
assert.equal(generatedConfig.no_bundle, true);
assert.equal(generatedConfig.main, docsWorkerGeneratedMain);

const serverModules = await globalThis.Array.fromAsync(
  new Bun.Glob("**/*.{js,mjs,wasm,txt,html,sql,bin}").scan({
    cwd: fileURLToPath(serverRoot),
    onlyFiles: true,
  })
);
const serverModuleBytes = serverModules
  .map((path) => Bun.file(new URL(path, serverRoot)).size)
  .reduce((total, size) => total + size, 0);

const serverJavaScriptSources = await Promise.all(
  serverModules
    .filter((path) => path.endsWith(".js") || path.endsWith(".mjs"))
    .map(async (path) => ({
      path,
      source: await Bun.file(new URL(path, serverRoot)).text(),
    }))
);
const modulesWithNodeFileSystem = serverJavaScriptSources.filter(({ source }) =>
  /(?:node:fs|node:fs\/promises)/u.test(source)
);

assert.ok(
  modulesWithNodeFileSystem.every(({ path }) =>
    /^assets\/(?:loaders\.server|runtime\.server|policy)-[A-Za-z0-9_-]+\.js$/u.test(
      path
    )
  ),
  "Node filesystem imports must remain isolated to generated raw-text support and the lazy validation policy."
);
assert.equal(modulesWithNodeFileSystem.length, 2);
assert.ok(
  modulesWithNodeFileSystem.every(
    ({ source }) => !source.includes(fileURLToPath(repositoryRoot))
  ),
  "Filesystem-bearing Worker modules must not retain an absolute checkout path."
);

const contentRuntimeModule =
  modulesWithNodeFileSystem.find(({ path }) =>
    /^assets\/(?:loaders|runtime)\.server-[A-Za-z0-9_-]+\.js$/u.test(path)
  )?.source ?? "";

assert.match(
  contentRuntimeModule,
  /validateContent:\s*\(\)\s*=>[\s\S]*?import\("\.\/policy-[A-Za-z0-9_-]+\.js"\)/u
);
assert.match(
  contentRuntimeModule,
  /if\s*\(type\s*===\s*"raw"\)[\s\S]*?import\("node:fs\/promises"\)/u
);
assert.match(contentRuntimeModule, /getText\("processed"\)/u);
const emittedServerSource = serverJavaScriptSources
  .map(({ source }) => source)
  .join("\n");

assert.doesNotMatch(
  emittedServerSource,
  /runtimeConstructionCount|randomUUID/u
);
assert.equal(
  emittedServerSource.match(/var DocsRuntimeProbe =/gu)?.length,
  1,
  "The emitted Worker must contain one managed runtime-probe service."
);
assert.equal(
  emittedServerSource.match(/var docsRuntimeProbeLive =/gu)?.length,
  1,
  "The emitted Worker must contain one app-owned live probe Layer."
);
assert.equal(
  emittedServerSource.match(/var docsRuntime = createDocsRuntime\(/gu)?.length,
  1,
  "The emitted Worker must construct its docs runtime exactly once at module scope."
);

const builtFiles = await Array.fromAsync(
  new Bun.Glob("**/*").scan({
    cwd: fileURLToPath(builtRoot),
    onlyFiles: true,
  })
);

const builtSources = await Promise.all(
  builtFiles.map(async (path) => ({
    path,
    source: await Bun.file(new URL(path, builtRoot)).text(),
  }))
);

for (const forbiddenName of [
  "ALCHEMY_PASSWORD",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "GITHUB_TOKEN",
]) {
  const containsForbiddenName = builtSources.some(({ source }) =>
    source.includes(forbiddenName)
  );

  assert.equal(
    containsForbiddenName,
    false,
    `The built candidate contains forbidden config name ${forbiddenName}.`
  );
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "taxkit-docs-workerd-"));
const isolatedDist = join(temporaryRoot, "dist");
const isolatedConfigPath = join(isolatedDist, "server", "wrangler.json");
const wrangler = fileURLToPath(new URL("node_modules/.bin/wrangler", appRoot));

await cp(fileURLToPath(builtRoot), isolatedDist, { recursive: true });
const isolatedConfigSource = await readFile(isolatedConfigPath, "utf-8");
const isolatedConfig = Effect.runSync(decodeJsonRecord(isolatedConfigSource));
delete isolatedConfig.configPath;
delete isolatedConfig.userConfigPath;
await writeFile(
  isolatedConfigPath,
  `${JSON.stringify(isolatedConfig, null, 2)}\n`
);

const dryRunOutput = await runProcess(wrangler, temporaryRoot, [
  "deploy",
  "--dry-run",
  "--config",
  "dist/server/wrangler.json",
  "--outdir",
  "dry-run",
]);
const workerModulesSha256 = await sha256Directory(
  pathToFileURL(`${join(temporaryRoot, "dry-run")}/`),
  (path) => path !== "README.md"
);
const assetsSha256 = await sha256Directory(
  pathToFileURL(`${join(isolatedDist, "client")}/`)
);
const deploymentInputSha256 = createHash("sha256")
  .update(`worker-modules\0${workerModulesSha256}\0`)
  .update(`assets\0${assetsSha256}\0`)
  .digest("hex");
const uploadMatch =
  /Total Upload:\s*(?<upload>[\d.]+)\s*KiB\s*\/\s*gzip:\s*(?<gzip>[\d.]+)\s*KiB/u.exec(
    dryRunOutput
  );

assert.ok(uploadMatch !== null, "Wrangler did not report upload sizes.");
assert.match(dryRunOutput, /No bindings found\./u);
const uploadBytes = Number(uploadMatch.groups?.["upload"]) * 1024;
const gzipUploadBytes = Number(uploadMatch.groups?.["gzip"]) * 1024;

assert.ok(gzipUploadBytes < workerSizeLimitBytes);

const port = reservePort();
const origin = `http://127.0.0.1:${port}`;
const processStartedAt = performance.now();
const workerProcess = Bun.spawn(
  [
    wrangler,
    "dev",
    "--config",
    "dist/server/wrangler.json",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--local",
    "--show-interactive-dev-session",
    "false",
  ],
  {
    cwd: temporaryRoot,
    env: processEnvironment,
    stderr: "pipe",
    stdout: "pipe",
  }
);
const workerStdout = new Response(workerProcess.stdout).text();
const workerStderr = new Response(workerProcess.stderr).text();
let browser: Browser | undefined;
let observedDescendants: readonly ProcessEntry[] = [];

try {
  const waitForInitialResponse = async (
    attempt: number
  ): Promise<{
    readonly initialRequestMs: number;
    readonly initialResponse: Response | undefined;
  }> => {
    if (attempt >= 300 || workerProcess.exitCode !== null) {
      return { initialRequestMs: 0, initialResponse: undefined };
    }
    const requestStartedAt = performance.now();

    try {
      const response = await fetch(`${origin}${knownPath}`, {
        headers: runtimeProofHeaders,
      });
      return {
        initialRequestMs: performance.now() - requestStartedAt,
        initialResponse: response,
      };
    } catch {
      // workerd has not bound the reserved port yet
    }

    await Bun.sleep(50);
    return waitForInitialResponse(attempt + 1);
  };
  const { initialRequestMs, initialResponse } = await waitForInitialResponse(0);

  const earlyExitOutput =
    workerProcess.exitCode === null
      ? ""
      : `\n${await workerStdout}\n${await workerStderr}`;

  assert.ok(
    initialResponse !== undefined,
    `Local workerd did not become ready (exit=${String(workerProcess.exitCode)}).${earlyExitOutput}`
  );
  const processStartToFirstResponseMs = performance.now() - processStartedAt;
  const initialHtml = await initialResponse.text();

  assert.equal(initialResponse.status, 200, initialHtml);
  assert.match(initialHtml, /Calculate Australian take-home pay/u);
  assert.equal(
    initialResponse.headers.get("x-taxkit-docs-runtime-constructions"),
    "1"
  );
  const runtimeIsolateId = initialResponse.headers.get(
    "x-taxkit-docs-runtime-isolate"
  );
  assert.ok(runtimeIsolateId !== null && runtimeIsolateId.length > 0);
  observedDescendants = descendantEntries(
    await readProcessTable(),
    workerProcess.pid
  );
  assert.ok(
    observedDescendants.length > 0,
    "The proof process did not observe Wrangler's local workerd descendant."
  );
  const observedWorkerdDescendants = observedDescendants.filter(({ command }) =>
    /(?:^|\/)workerd(?:@1\.20260722\.1)?(?:\/|\s|$)/u.test(command)
  );
  assert.ok(
    observedWorkerdDescendants.length > 0,
    "The observed Wrangler descendants did not include the pinned workerd executable."
  );

  const assetPath =
    /(?:src|href)="(?<asset>\/assets\/[^"]+\.(?:css|js))"/u.exec(initialHtml)
      ?.groups?.["asset"];
  assert.ok(assetPath !== undefined);
  const assetResponse = await fetch(`${origin}${assetPath}`);
  const assetBody = await assetResponse.text();

  assert.equal(assetResponse.status, 200);
  assert.match(
    assetResponse.headers.get("content-type") ?? "",
    /(?:css|javascript)/u
  );
  assert.match(
    assetResponse.headers.get("cache-control") ?? "",
    /max-age=31536000/u
  );
  assert.match(assetResponse.headers.get("cache-control") ?? "", /immutable/u);
  assert.ok((assetResponse.headers.get("etag") ?? "").length > 0);
  assert.doesNotMatch(assetBody.slice(0, 100), /<!doctype html>/iu);

  const missingResponse = await fetch(`${origin}${missingPath}`, {
    headers: runtimeProofHeaders,
  });
  const missingHtml = await missingResponse.text();

  assert.equal(missingResponse.status, 404);
  assert.match(missingHtml, /Documentation page not found/u);
  assert.equal(
    missingResponse.headers.get("x-taxkit-docs-runtime-constructions"),
    "1"
  );
  assert.equal(
    missingResponse.headers.get("x-taxkit-docs-runtime-isolate"),
    runtimeIsolateId
  );

  const concurrentJourneys = [
    [knownPath, "Calculate Australian take-home pay"],
    ["/start/install-the-sdk", "Install the SDK"],
    ["/reference", "Reference"],
  ] as const;
  const concurrentResponses = await Promise.all(
    concurrentJourneys.flatMap(([path, expected]) =>
      Array.from({ length: 3 }, async () => {
        const response = await fetch(`${origin}${path}`, {
          headers: runtimeProofHeaders,
        });

        return {
          constructions: response.headers.get(
            "x-taxkit-docs-runtime-constructions"
          ),
          expected,
          isolateId: response.headers.get("x-taxkit-docs-runtime-isolate"),
          response,
          text: await response.text(),
        };
      })
    )
  );

  for (const {
    constructions,
    expected,
    isolateId,
    response,
    text,
  } of concurrentResponses) {
    assert.equal(constructions, "1");
    assert.equal(isolateId, runtimeIsolateId);
    assert.equal(response.status, 200);
    assert.match(text, new RegExp(expected, "u"));
  }

  browser = await chromium.launch({
    env: processEnvironment,
    headless: true,
  });
  const browserVersion = browser.version();
  const page = await browser.newPage({
    viewport: { height: 1000, width: 1440 },
  });
  const diagnostics: string[] = [];
  let documentRequests = 0;
  let serverFunctionRequests = 0;
  const serverFunctionResponses: {
    readonly status: number;
    readonly url: string;
  }[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    if (isExpectedServerFunctionAbort(request, origin)) {
      return;
    }

    diagnostics.push(
      `requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`
    );
  });
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests += 1;
    }
    if (
      request.resourceType() === "fetch" ||
      request.resourceType() === "xhr"
    ) {
      serverFunctionRequests += 1;
    }
  });
  page.on("response", (response) => {
    const request = response.request();

    if (
      (request.resourceType() === "fetch" ||
        request.resourceType() === "xhr") &&
      new URL(response.url()).pathname.startsWith("/_serverFn/")
    ) {
      serverFunctionResponses.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });

  await page.goto(`${origin}${knownPath}`, { waitUntil: "networkidle" });
  await waitForInteractiveDocs(page);
  const representativeHeading = page.getByRole("heading", {
    name: "Calculate Australian take-home pay",
  });
  await representativeHeading.waitFor();

  assert.equal(await page.getByRole("main").count(), 1);
  assert.equal(await page.getByRole("article").count(), 1);
  assert.equal(
    await page.getByRole("navigation", { name: "Documentation" }).count(),
    1
  );
  assert.equal(
    await page.evaluate(() => document.activeElement === document.body),
    true
  );
  await assertComputedContrast(page, ".docs-article p", ":root");

  const navigationDocumentBaseline = documentRequests;
  const navigationServerFunctionBaseline = serverFunctionResponses.length;
  const navigationServerFunctionResponse = page.waitForResponse((response) => {
    const request = response.request();
    const url = new URL(response.url());

    return (
      url.origin === origin &&
      url.pathname.startsWith("/_serverFn/") &&
      (request.resourceType() === "fetch" || request.resourceType() === "xhr")
    );
  });
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { exact: true, name: "Reference" })
    .first()
    .click();
  const observedNavigationServerFunction =
    await navigationServerFunctionResponse;
  await page.getByRole("heading", { exact: true, name: "Reference" }).waitFor();
  assert.equal(documentRequests, navigationDocumentBaseline);
  assert.equal(observedNavigationServerFunction.status(), 200);
  assert.ok(
    serverFunctionResponses.length > navigationServerFunctionBaseline,
    "The exact client navigation did not add a server-function response."
  );
  assert.ok(
    serverFunctionResponses
      .slice(navigationServerFunctionBaseline)
      .every(
        ({ status, url }) =>
          status === 200 &&
          new URL(url).origin === origin &&
          new URL(url).pathname.startsWith("/_serverFn/")
      ),
    "The client navigation server-function responses were not successful same-origin transport calls."
  );
  const observedServerFunction =
    serverFunctionResponses[navigationServerFunctionBaseline];
  assert.ok(observedServerFunction !== undefined);
  const malformedServerFunctionResponse = await page.request.fetch(
    observedServerFunction.url,
    {
      data: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }
  );
  assert.ok(malformedServerFunctionResponse.status() >= 400);
  assert.ok(malformedServerFunctionResponse.status() < 500);

  await page.evaluate(async (path) => {
    const router = globalThis.__TSR_ROUTER__;
    if (router === undefined) {
      throw new TypeError("The hydrated TanStack router was unavailable.");
    }

    await router.navigate({ to: path });
  }, missingPath);
  await page.getByTestId("route-not-found").waitFor();
  assert.equal(documentRequests, navigationDocumentBaseline);
  assert.ok(
    serverFunctionRequests > 0,
    "Hydrated navigation did not exercise server-function transport."
  );

  await page.goto(`${origin}/start`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to documentation" });
  assert.equal(
    await skipLink.evaluate((element) => element === document.activeElement),
    true
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id === "docs-main"),
    true
  );

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${origin}${knownPath}`, { waitUntil: "networkidle" });
  await waitForInteractiveDocs(page);
  const navigationToggle = page.getByRole("button", {
    name: "Open navigation",
  });
  await navigationToggle.click();
  assert.equal(
    await page
      .getByRole("button", { name: "Close navigation" })
      .getAttribute("aria-expanded"),
    "true"
  );
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Calculate Australian take-home pay" })
    .waitFor();
  await assertComputedContrast(page, ".docs-nav-toggle", ".docs-nav-toggle");

  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${origin}${knownPath}`, { waitUntil: "networkidle" });
  await waitForInteractiveDocs(page);
  const motionStyles = await page
    .locator(
      ".docs-page-layout, .docs-nav, .docs-nav-toggle, .docs-article, .docs-route-state"
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);

        return {
          animationName: style.animationName,
          transitionDuration: style.transitionDuration,
        };
      })
    );
  assert.ok(
    motionStyles.length > 0 &&
      motionStyles.every(
        (style) =>
          style.animationName === "none" && style.transitionDuration === "0s"
      ),
    "The docs UI must not depend on visually relevant motion."
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto(`${origin}/start`, { waitUntil: "networkidle" });
  const pendingDocumentBaseline = documentRequests;
  await page.route("**/*", async (route) => {
    const resourceType = route.request().resourceType();

    if (resourceType === "fetch" || resourceType === "xhr") {
      await Bun.sleep(delayedPageLoad.delayMs);
    }

    await route.continue();
  });
  const pendingNavigation = page.evaluate(async (path) => {
    const router = globalThis.__TSR_ROUTER__;
    if (router === undefined) {
      throw new Error("The hydrated TanStack router was unavailable.");
    }

    await router.navigate({ to: path });
  }, delayedPageLoad.path);
  await page.getByTestId("route-pending").waitFor();
  await page
    .getByRole("heading", { name: delayedPageLoad.visiblePostcondition })
    .waitFor();
  await assertComputedContrast(page, ".docs-route-state p", ":root");
  await pendingNavigation;
  await page.unroute("**/*");
  await page
    .getByRole("heading", {
      name: "Calculate Australian take-home pay",
    })
    .waitFor();
  assert.equal(documentRequests, pendingDocumentBaseline);

  const recoverableMarkup = renderToStaticMarkup(
    <DocsRecoverableError
      message={recoverableSourceError.message}
      onRetry={() => false}
    />
  );
  assert.match(
    recoverableMarkup,
    new RegExp(recoverableSourceError.visiblePostcondition, "u")
  );

  const screenshots: {
    readonly kind: "desktop" | "mobile";
    readonly path: string;
    readonly sha256: string;
    readonly viewport: {
      readonly deviceScaleFactor: 1;
      readonly height: number;
      readonly width: number;
    };
  }[] = [];
  if (captureScreenshots) {
    await mkdir(screenshotRoot, { recursive: true });
    await page.setViewportSize({ height: 1000, width: 1440 });
    await page
      .getByRole("heading", { name: "Calculate Australian take-home pay" })
      .waitFor();
    const desktopScreenshot = new URL("desktop.png", screenshotRoot);
    await page.screenshot({
      fullPage: true,
      path: fileURLToPath(desktopScreenshot),
    });
    screenshots.push({
      kind: "desktop",
      path: "screenshots/desktop.png",
      sha256: await sha256File(desktopScreenshot),
      viewport: { deviceScaleFactor: 1, height: 1000, width: 1440 },
    });

    const mobilePage = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: 844, width: 390 },
    });
    mobilePage.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        diagnostics.push(`mobile ${message.type()}: ${message.text()}`);
      }
    });
    mobilePage.on("pageerror", (error) => {
      diagnostics.push(`mobile pageerror: ${error.message}`);
    });
    mobilePage.on("requestfailed", (request) => {
      if (isExpectedServerFunctionAbort(request, origin)) {
        return;
      }

      diagnostics.push(
        `mobile requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`
      );
    });
    await mobilePage.goto(`${origin}${knownPath}`, {
      waitUntil: "networkidle",
    });
    await waitForInteractiveDocs(mobilePage);
    await mobilePage.getByRole("button", { name: "Open navigation" }).click();
    await mobilePage
      .getByRole("button", { name: "Close navigation" })
      .waitFor();
    const mobileScreenshot = new URL("mobile.png", screenshotRoot);
    await mobilePage.screenshot({
      fullPage: true,
      path: fileURLToPath(mobileScreenshot),
    });
    screenshots.push({
      kind: "mobile",
      path: "screenshots/mobile.png",
      sha256: await sha256File(mobileScreenshot),
      viewport: { deviceScaleFactor: 1, height: 844, width: 390 },
    });
    await mobilePage.close();
  }

  assert.deepEqual(diagnostics, []);

  const sourceCommitOutput = await runProcess(
    "/usr/bin/git",
    fileURLToPath(repositoryRoot),
    ["rev-parse", "HEAD"]
  );
  const sourceCommit = sourceCommitOutput.trim();
  const receipt = {
    browser: {
      name: "Chromium",
      version: browserVersion,
    },
    candidate: {
      assetsSha256,
      deploymentInputSha256,
      sourceCommit,
      workerModulesSha256,
      worktreeQualifiedBeforeCommit: true,
    },
    dependencies: {
      cloudflareVitePlugin: "1.47.0",
      workerd: "1.20260722.1",
      wrangler: "4.114.0",
    },
    evidenceClass: "local-workerd",
    filesystem: {
      isolatedOutputOnlyExecution: true,
      nodeFileSystemModules: modulesWithNodeFileSystem.map(({ path }) => path),
      providerCredentialEnvironmentAllowed: false,
      requestTimePolicyImportObserved: false,
    },
    limits: {
      firstResponseRequestMs: Number(initialRequestMs.toFixed(2)),
      gzipUploadBytes,
      localProcessStartToFirstResponseMs: Number(
        processStartToFirstResponseMs.toFixed(2)
      ),
      rawServerModuleBytes: serverModuleBytes,
      rawUploadBytes: uploadBytes,
      workerSizeLimitBytes,
    },
    nonClaims: [
      "Local workerd does not prove a Cloudflare account, provider deployment, workers.dev URL, remote state, Preview, Production or rollback.",
      "The startup observation is local workerd evidence; provider startup validation remains required.",
    ],
    oracles: {
      accessibility: "passed",
      assetCacheHeaders: "passed",
      assets: "passed",
      clientNavigationWithoutDocumentReload: "passed",
      clientNotFound: "passed",
      concurrentRequestIsolation: "passed",
      consoleAndPageErrors: "passed",
      directNotFound: "passed",
      hydration: "passed",
      malformedServerFunction: "passed",
      mobileNavigationDisclosure: "passed",
      pendingNavigation: "passed",
      recoverableError: "passed",
      reducedMotion: "passed",
      serverFunctionTransport: "passed",
      ssr: "passed",
    },
    owner: "DCD-001 local Cloudflare built-app harness",
    runtime: {
      concurrentRequestsPassed: concurrentResponses.length,
      observedConstructionCount: 1,
      observedDescendantCount: observedDescendants.length,
      observedIsolateId: runtimeIsolateId,
      observedWorkerdDescendantCount: observedWorkerdDescendants.length,
      perRequestConstructionPatternAbsent: true,
    },
    schemaVersion: 1,
    screenshots,
  };

  await mkdir(receiptRoot, { recursive: true });
  await Bun.write(
    new URL("local-workerd-receipt.json", receiptRoot),
    `${JSON.stringify(receipt, null, 2)}\n`
  );
  if (captureScreenshots) {
    assert.deepEqual(
      screenshots.map(({ kind }) => kind),
      ["desktop", "mobile"]
    );
    await Bun.write(
      new URL("screenshot-manifest.json", receiptRoot),
      `${JSON.stringify(
        {
          candidate: {
            assetsSha256,
            deploymentInputSha256,
            sourceCommit,
            workerModulesSha256,
          },
          evidenceClass: "local-workerd-visual-review-input",
          nonClaims: [
            "Screenshots supplement behavioral assertions and do not prove request type, focus behavior, contrast, reduced motion, HTTP status, hydration, console cleanliness or hosted behavior.",
          ],
          schemaVersion: 1,
          screenshots,
        },
        null,
        2
      )}\n`
    );
  }

  console.log(
    `Cloudflare docs proof passed: SSR=200, asset=200/immutable, missing=404, clientNavigationDocuments=0, serverFunctions=${serverFunctionRequests}, diagnostics=0, gzipUploadKiB=${(gzipUploadBytes / 1024).toFixed(2)}, processStartToFirstResponseMs=${processStartToFirstResponseMs.toFixed(2)}, firstResponseRequestMs=${initialRequestMs.toFixed(2)}.`
  );
} finally {
  workerProcess.kill("SIGTERM");
  await Promise.race([
    workerProcess.exited,
    Bun.sleep(5000).then(() => {
      workerProcess.kill("SIGKILL");
    }),
  ]);
  const [stderr, stdout] = await Promise.all([workerStderr, workerStdout]);
  const workerOutput = `${stdout}\n${stderr}`;

  assert.doesNotMatch(
    workerOutput,
    /(?:\[wrangler:error\]|Uncaught|Internal error|Error 110[12])/u
  );
  const remainingProcesses = await readProcessTable();
  const remainingPids = new Set(remainingProcesses.map(({ pid }) => pid));

  assert.deepEqual(
    observedDescendants
      .map(({ pid }) => pid)
      .filter((pid) => remainingPids.has(pid)),
    [],
    "Wrangler left an observed local workerd descendant running."
  );
  await browser?.close();
  await rm(temporaryRoot, { force: true, recursive: true });
}
