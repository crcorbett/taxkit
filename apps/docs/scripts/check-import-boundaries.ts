import ts from "@typescript/typescript6";

const appRoot = new URL("..", import.meta.url);
const sourceRoot = new URL("src/", appRoot);
const browserSource = new Bun.Glob("**/*.{js,jsx,ts,tsx}");
const serverOnlyModulePattern =
  /(?:@taxkit\/docs-content\/(?:generated-source|live|server|service|test|validate)|@taxkit\/docs-fumadocs\/(?:live|service|test)|#\/lib\/runtime\.server|\.\/runtime\.server)/u;
const runtimeExecutionPattern =
  /\b(?:ManagedRuntime|Runtime)\.|\bEffect\.run(?:Fork|Promise|PromiseExit|Sync)\b/u;
const failures: string[] = [];

for await (const relativePath of browserSource.scan({
  cwd: sourceRoot.pathname,
  onlyFiles: true,
})) {
  if (
    relativePath.endsWith(".server.ts") ||
    relativePath.endsWith(".server.tsx") ||
    relativePath.includes(".test.") ||
    relativePath === "server.ts" ||
    relativePath === "routeTree.gen.ts"
  ) {
    continue;
  }

  const source = await Bun.file(new URL(relativePath, sourceRoot)).text();
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true
  );

  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      serverOnlyModulePattern.test(statement.moduleSpecifier.text)
    ) {
      failures.push(
        `${relativePath} statically imports a server-only docs module: ${statement.moduleSpecifier.text}`
      );
    }
  }

  if (runtimeExecutionPattern.test(source)) {
    failures.push(
      `${relativePath} executes an Effect runtime from browser-reachable source.`
    );
  }
}

if (await Bun.file(new URL("src/lib/runtime.client.ts", appRoot)).exists()) {
  failures.push(
    "The docs app must not own a browser Effect runtime at src/lib/runtime.client.ts."
  );
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }

  process.exit(1);
}

console.log("Docs server/browser import boundaries passed.");
