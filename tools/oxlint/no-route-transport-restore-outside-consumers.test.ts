import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "../..");
const oxlint = join(repositoryRoot, "node_modules/.bin/oxlint");
const generatedConsumer = join(
  repositoryRoot,
  "tools/oxlint/fixtures/.generated-route-transport-consumer.tsx"
);
const temporaryFiles: string[] = [];

const runOxlint = (
  paths: readonly string[],
  extraArgs: readonly string[] = []
) => {
  const result = Bun.spawnSync({
    cmd: [
      oxlint,
      "-c",
      "oxlint.config.ts",
      "--disable-nested-config",
      "--no-error-on-unmatched-pattern",
      ...extraArgs,
      ...paths,
    ],
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${new TextDecoder().decode(result.stdout)}${new TextDecoder().decode(result.stderr)}`,
  };
};

const writeConfiguredConsumer = async (source: string) => {
  temporaryFiles.push(generatedConsumer);
  await Bun.write(generatedConsumer, source);

  return generatedConsumer;
};

const writeUnconfiguredFixture = async (source: string, extension = "tsx") => {
  const path = join(
    "/tmp",
    `taxkit-route-transport-${crypto.randomUUID()}.${extension}`
  );

  temporaryFiles.push(path);
  await Bun.write(path, source);

  return path;
};

const diagnosticsFor = (output: string, messageId: string) =>
  output.match(
    new RegExp(
      `taxkit\\(no-route-transport-restore-outside-consumers\\): ${messageId}`,
      "gu"
    )
  ) ?? [];

afterEach(async () => {
  await Promise.all(
    temporaryFiles.splice(0).map((path) => rm(path, { force: true }))
  );
});

describe("taxkit/no-route-transport-restore-outside-consumers", () => {
  test("allows direct, immutable binding, named component and head consumers", () => {
    const result = runOxlint([
      "tools/oxlint/fixtures/route-transport-allowed.tsx",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.output).not.toContain(
      "taxkit(no-route-transport-restore-outside-consumers)"
    );
  });

  test("fails closed for an unresolved named route component", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const MissingRouteComponent = getMissingRouteComponent();

      export const Route = createFileRoute("/unresolved")({
        component: MissingRouteComponent,
      });

      docsPageRouteBoundary.restore(Route.useLoaderData());
    `);
    const result = runOxlint([fixture]);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("binding could not be resolved statically");
  });

  test("fails closed when createFileRoute is not the direct TanStack import", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const createFileRoute = () => (options) => options;

      const RouteComponent = () => {
        const loaderData = Route.useLoaderData();
        const routeResult = docsPageRouteBoundary.restore(loaderData);
        return Result.match(routeResult, { onFailure: () => null, onSuccess: () => null });
      };

      export const Route = createFileRoute("/unresolved-route")({
        component: RouteComponent,
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(
        result.output,
        "The createFileRoute route or component/head binding"
      )
    ).toHaveLength(1);
  });

  test("rejects direct restoration in an unconfigured file", async () => {
    const fixture = await writeUnconfiguredFixture(`
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      docsPageRouteBoundary.restore(value);
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(
        result.output,
        "Canonical route transport restore is allowed only"
      )
    ).toHaveLength(1);
  });

  test("rejects route-local leaves, hooks, helpers, callbacks and providers", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const Leaf = () => docsPageRouteBoundary.restore(Route.useLoaderData());
      const useRestored = () => docsPageRouteBoundary.restore(Route.useLoaderData());
      const restoreInHelper = () => docsPageRouteBoundary.restore(Route.useLoaderData());
      const Provider = ({ children }) => {
        docsPageRouteBoundary.restore(Route.useLoaderData());
        return children;
      };

      export const Route = createFileRoute("/owners")({
        component() {
          const loaderData = Route.useLoaderData();
          const routeResult = docsPageRouteBoundary.restore(loaderData);
          const callback = () => docsPageRouteBoundary.restore(loaderData);
          void [Leaf, useRestored, restoreInHelper, Provider, callback];

          return Result.match(routeResult, {
            onFailure: () => <main>Failure</main>,
            onSuccess: () => <main>Success</main>,
          });
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(
        result.output,
        "Canonical route transport restore is allowed only"
      )
    ).toHaveLength(5);
  });

  test("rejects namespace, default, aliased, dynamic and CommonJS imports", async () => {
    const fixture = await writeUnconfiguredFixture(`
      import boundaries from "#/lib/docs/route-boundary";
      import * as routeBoundaries from "#/lib/docs/route-boundary";
      import { docsPageRouteBoundary as pageBoundary } from "#/lib/docs/route-boundary";

      void boundaries;
      void routeBoundaries;
      void pageBoundary;
      void import("#/lib/docs/route-boundary");
      void require("#/lib/docs/route-boundary");
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Import canonical route boundaries")
    ).toHaveLength(5);
  });

  test("rejects restore aliases, destructuring, computed access, callback passing and call/apply/bind", async () => {
    const fixture = await writeUnconfiguredFixture(`
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const boundaryAlias = docsPageRouteBoundary;
      const restoreAlias = docsPageRouteBoundary.restore;
      const { restore } = docsPageRouteBoundary;
      docsPageRouteBoundary["restore"](value);
      consume(docsPageRouteBoundary.restore);
      docsPageRouteBoundary.restore.call(null, value);
      docsPageRouteBoundary.restore.apply(null, [value]);
      docsPageRouteBoundary.restore.bind(null)(value);
      docsPageRouteBoundary?.restore(value);
      docsPageRouteBoundary.restore?.(value);
      void [boundaryAlias, restoreAlias, restore];
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Canonical route transport restore must be")
    ).toHaveLength(10);
  });

  test("rejects assignment aliases of the canonical boundary object", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const unrelatedBoundary = { restore: (value) => value };

      export const Route = createFileRoute("/boundary-assignment-alias")({
        component() {
          const loaderData = Route.useLoaderData();
          let boundaryAlias = unrelatedBoundary;
          boundaryAlias = docsPageRouteBoundary;
          const routeResult = boundaryAlias.restore(loaderData);

          return Result.match(routeResult, {
            onFailure: () => null,
            onSuccess: () => null,
          });
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Canonical route transport restore must be")
    ).toHaveLength(1);
  });

  test("rejects whole-boundary argument and storage forwarding", async () => {
    const fixture = await writeUnconfiguredFixture(`
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      consume(docsPageRouteBoundary);
      const storedObject = { boundary: docsPageRouteBoundary };
      const storedArray = [docsPageRouteBoundary];
      const callback = () => docsPageRouteBoundary;
      void [storedObject, storedArray, callback];
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Canonical route transport restore must be")
    ).toHaveLength(4);
  });

  test("rejects reassignment, getRouteApi, prop and context loader sources", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute, getRouteApi } from "@tanstack/react-router";
      import { createContext, useContext } from "react";
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const LoaderContext = createContext(null);

      export const ReassignedRoute = createFileRoute("/reassigned")({
        component() {
          let loaderData = ReassignedRoute.useLoaderData();
          loaderData = replacement;
          const routeResult = docsPageRouteBoundary.restore(loaderData);
          return Result.match(routeResult, { onFailure: () => null, onSuccess: () => null });
        },
      });

      export const ApiRoute = createFileRoute("/api")({
        component() {
          const loaderData = getRouteApi("/api").useLoaderData();
          const routeResult = docsPageRouteBoundary.restore(loaderData);
          return Result.match(routeResult, { onFailure: () => null, onSuccess: () => null });
        },
      });

      const PropRouteComponent = ({ loaderData }) => {
        const routeResult = docsPageRouteBoundary.restore(loaderData);
        return Result.match(routeResult, { onFailure: () => null, onSuccess: () => null });
      };

      export const PropRoute = createFileRoute("/prop")({ component: PropRouteComponent });

      export const ContextRoute = createFileRoute("/context")({
        component() {
          const loaderData = useContext(LoaderContext);
          const routeResult = docsPageRouteBoundary.restore(loaderData);
          return Result.match(routeResult, { onFailure: () => null, onSuccess: () => null });
        },
      });

      export const ReassignedHeadRoute = createFileRoute("/reassigned-head")({
        head: ({ loaderData }) => {
          loaderData = replacement;
          const routeResult = docsPageRouteBoundary.restore(loaderData);
          return Result.match(routeResult, {
            onFailure: () => ({ meta: [] }),
            onSuccess: () => ({ meta: [] }),
          });
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "A route component restore must consume")
    ).toHaveLength(4);
    expect(
      diagnosticsFor(result.output, "A route head restore must consume")
    ).toHaveLength(1);
  });

  test("rejects closure loader sources and shadowed route bindings", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const closedLoaderData = externalLoaderData;
      const shadowRoute = { useLoaderData: () => externalLoaderData };

      export const ClosureRoute = createFileRoute("/closure-source")({
        component() {
          const routeResult = docsPageRouteBoundary.restore(closedLoaderData);
          return Result.match(routeResult, { onFailure: () => null, onSuccess: () => null });
        },
      });

      export const ShadowedRoute = createFileRoute("/shadowed-route")({
        component() {
          const ShadowedRoute = shadowRoute;
          const routeResult = docsPageRouteBoundary.restore(ShadowedRoute.useLoaderData());
          return Result.match(routeResult, { onFailure: () => null, onSuccess: () => null });
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "A route component restore must consume")
    ).toHaveLength(2);
  });

  test("rejects closure capture and multiple restores", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      export const Route = createFileRoute("/multiple")({
        component() {
          const loaderData = Route.useLoaderData();
          const first = docsPageRouteBoundary.restore(loaderData);
          const second = docsPageRouteBoundary.restore(loaderData);
          const callback = () => docsPageRouteBoundary.restore(loaderData);
          void callback;
          return Result.match(first, {
            onFailure: () => Result.match(second, { onFailure: () => null, onSuccess: () => null }),
            onSuccess: () => null,
          });
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Restore loader transport once")
    ).toHaveLength(1);
    expect(
      diagnosticsFor(
        result.output,
        "Canonical route transport restore is allowed only"
      )
    ).toHaveLength(1);
  });

  test("rejects encoded loader data and restored Result forwarded to children", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const Child = () => null;

      export const Route = createFileRoute("/forwarding")({
        component() {
          const loaderData = Route.useLoaderData();
          const routeResult = docsPageRouteBoundary.restore(loaderData);
          return Result.match(routeResult, {
            onFailure: () => <Child value={routeResult} />,
            onSuccess: () => <Child value={loaderData} />,
          });
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Do not forward encoded loader transport")
    ).toHaveLength(1);
    expect(
      diagnosticsFor(result.output, "Do not forward the restored route Result")
    ).toHaveLength(1);
  });

  test("rejects loader and Result aliases used to forward route state", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Result } from "effect";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const Child = () => null;

      export const Route = createFileRoute("/alias-forwarding")({
        component() {
          const loaderData = Route.useLoaderData();
          const routeResult = docsPageRouteBoundary.restore(loaderData);
          const encodedAlias = loaderData;
          const resultAlias = routeResult;

          return Result.match(routeResult, {
            onFailure: () => <Child value={resultAlias} />,
            onSuccess: () => <Child value={encodedAlias} />,
          });
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Do not forward encoded loader transport")
    ).toHaveLength(1);
    expect(
      diagnosticsFor(result.output, "Do not forward the restored route Result")
    ).toHaveLength(1);
  });

  test("requires the restored Result to be matched in the same consumer", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      export const Route = createFileRoute("/unmatched")({
        component() {
          const loaderData = Route.useLoaderData();
          return docsPageRouteBoundary.restore(loaderData);
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(
      diagnosticsFor(result.output, "Match the restored Result")
    ).toHaveLength(1);
  });

  test("keeps direct Schema decoding prohibited in route consumers", async () => {
    const fixture = await writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Schema } from "effect";

      export const Route = createFileRoute("/decode")({
        component() {
          Schema.decodeUnknownSync(Schema.String)(Route.useLoaderData());
          return null;
        },
      });
    `);
    const result = runOxlint([fixture]);

    expect(result.output).toContain("taxkit(no-decoding-outside-boundaries)");
  });

  test("rejects inline disable directives for both boundary rules", async () => {
    const fixture = await writeUnconfiguredFixture(
      `
        /* eslint-disable taxkit/no-decoding-outside-boundaries */
        /* oxlint-disable taxkit/no-decoding-outside-boundaries */
        // eslint-disable-next-line taxkit/no-decoding-outside-boundaries
        const first = 1;
        // oxlint-disable-next-line taxkit/no-decoding-outside-boundaries
        const second = 2;
        const third = 3; // eslint-disable-line taxkit/no-decoding-outside-boundaries
        const fourth = 4; // oxlint-disable-line taxkit/no-decoding-outside-boundaries

        /* eslint-disable taxkit/no-route-transport-restore-outside-consumers */
        /* oxlint-disable taxkit/no-route-transport-restore-outside-consumers */
        // eslint-disable-next-line taxkit/no-route-transport-restore-outside-consumers
        const fifth = 5;
        // oxlint-disable-next-line taxkit/no-route-transport-restore-outside-consumers
        const sixth = 6;
        const seventh = 7; // eslint-disable-line taxkit/no-route-transport-restore-outside-consumers
        const eighth = 8; // oxlint-disable-line taxkit/no-route-transport-restore-outside-consumers
        void [first, second, third, fourth, fifth, sixth, seventh, eighth];
      `,
      "ts"
    );
    const result = runOxlint(
      [fixture],
      [
        "--allow=taxkit/no-decoding-outside-boundaries",
        "--allow=taxkit/no-route-transport-restore-outside-consumers",
        "--report-unused-disable-directives-severity=error",
      ]
    );

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Unused eslint-disable directive");
    expect(result.output).toContain("Unused oxlint-disable directive");
  });

  test("does not report unrelated restore methods", async () => {
    const fixture = await writeUnconfiguredFixture(
      `
      const cache = { restore: (value) => value };
      cache.restore("value");
    `,
      "ts"
    );
    const result = runOxlint([fixture]);

    expect(result.output).not.toContain(
      "taxkit(no-route-transport-restore-outside-consumers)"
    );
  });

  test("does not mistake a shadowed canonical import for a boundary", async () => {
    const fixture = await writeUnconfiguredFixture(
      `
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const restoreUnrelated = () => {
        const docsPageRouteBoundary = { restore: (value) => value };
        return docsPageRouteBoundary.restore("value");
      };

      void restoreUnrelated;
    `,
      "ts"
    );
    const result = runOxlint([fixture]);

    expect(result.output).not.toContain(
      "taxkit(no-route-transport-restore-outside-consumers)"
    );
  });
});
