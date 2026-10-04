import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array as EffectArray, Effect } from "effect";

import {
  lintFiles as runOxlint,
  writeLintFixture,
  writeTemporaryLintFixture,
} from "./cli-fixture.js";

const { join } = nodePath;
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const generatedConsumer = join(
  repositoryRoot,
  "tools/oxlint/fixtures/.generated-route-transport-consumer.tsx"
);
const writeConfiguredConsumer = (source: string) =>
  writeLintFixture(generatedConsumer, source);
const writeUnconfiguredFixture = (source: string, extension = "tsx") =>
  writeTemporaryLintFixture(source, extension);
const diagnosticsFor = (output: string, messageId: string) =>
  EffectArray.filter(
    output.split("\n"),
    (line) =>
      line.includes(messageId) &&
      line.includes(
        "[Error/taxkit(no-route-transport-restore-outside-consumers)]"
      )
  );
describe("taxkit/no-route-transport-restore-outside-consumers", () => {
  test.effect(
    "allows direct, immutable binding, named component and head consumers",
    () =>
      Effect.gen(function* () {
        const result = yield* runOxlint([
          "tools/oxlint/fixtures/route-transport-allowed.tsx",
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.output).not.toContain(
          "taxkit(no-route-transport-restore-outside-consumers)"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("fails closed for an unresolved named route component", () =>
    Effect.gen(function* () {
      const fixture = yield* writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      const MissingRouteComponent = getMissingRouteComponent();

      export const Route = createFileRoute("/unresolved")({
        component: MissingRouteComponent,
      });

      docsPageRouteBoundary.restore(Route.useLoaderData());
    `);
      const result = yield* runOxlint([fixture]);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain(
        "binding could not be resolved statically"
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "fails closed when createFileRoute is not the direct TanStack import",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "The createFileRoute route or component/head binding"
          )
        ).toHaveLength(1);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("rejects direct restoration in an unconfigured file", () =>
    Effect.gen(function* () {
      const fixture = yield* writeUnconfiguredFixture(`
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      docsPageRouteBoundary.restore(value);
    `);
      const result = yield* runOxlint([fixture]);
      expect(
        diagnosticsFor(
          result.output,
          "Canonical route transport restore is allowed only"
        )
      ).toHaveLength(1);
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects route-local leaves, hooks, helpers, callbacks and providers",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "Canonical route transport restore is allowed only"
          )
        ).toHaveLength(5);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects namespace, default, aliased, dynamic and CommonJS imports",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeUnconfiguredFixture(`
      import boundaries from "#/lib/docs/route-boundary";
      import * as routeBoundaries from "#/lib/docs/route-boundary";
      import { docsPageRouteBoundary as pageBoundary } from "#/lib/docs/route-boundary";

      void boundaries;
      void routeBoundaries;
      void pageBoundary;
      void import("#/lib/docs/route-boundary");
      void require("#/lib/docs/route-boundary");
    `);
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(result.output, "Import canonical route boundaries")
        ).toHaveLength(5);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects restore aliases, destructuring, computed access, callback passing and call/apply/bind",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeUnconfiguredFixture(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "Canonical route transport restore must be"
          )
        ).toHaveLength(10);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects assignment aliases of the canonical boundary object",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "Canonical route transport restore must be"
          )
        ).toHaveLength(1);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("rejects whole-boundary argument and storage forwarding", () =>
    Effect.gen(function* () {
      const fixture = yield* writeUnconfiguredFixture(`
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      consume(docsPageRouteBoundary);
      const storedObject = { boundary: docsPageRouteBoundary };
      const storedArray = [docsPageRouteBoundary];
      const callback = () => docsPageRouteBoundary;
      void [storedObject, storedArray, callback];
    `);
      const result = yield* runOxlint([fixture]);
      expect(
        diagnosticsFor(
          result.output,
          "Canonical route transport restore must be"
        )
      ).toHaveLength(4);
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects reassignment, getRouteApi, prop and context loader sources",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "A route component restore must consume"
          )
        ).toHaveLength(4);
        expect(
          diagnosticsFor(result.output, "A route head restore must consume")
        ).toHaveLength(1);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects closure loader sources and shadowed route bindings",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "A route component restore must consume"
          )
        ).toHaveLength(2);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("rejects closure capture and multiple restores", () =>
    Effect.gen(function* () {
      const fixture = yield* writeConfiguredConsumer(`
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
      const result = yield* runOxlint([fixture]);
      expect(
        diagnosticsFor(result.output, "Restore loader transport once")
      ).toHaveLength(1);
      expect(
        diagnosticsFor(
          result.output,
          "Canonical route transport restore is allowed only"
        )
      ).toHaveLength(1);
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects encoded loader data and restored Result forwarded to children",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "Do not forward encoded loader transport"
          )
        ).toHaveLength(1);
        expect(
          diagnosticsFor(
            result.output,
            "Do not forward the restored route Result"
          )
        ).toHaveLength(1);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects loader and Result aliases used to forward route state",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
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
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(
            result.output,
            "Do not forward encoded loader transport"
          )
        ).toHaveLength(1);
        expect(
          diagnosticsFor(
            result.output,
            "Do not forward the restored route Result"
          )
        ).toHaveLength(1);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "requires the restored Result to be matched in the same consumer",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";

      export const Route = createFileRoute("/unmatched")({
        component() {
          const loaderData = Route.useLoaderData();
          return docsPageRouteBoundary.restore(loaderData);
        },
      });
    `);
        const result = yield* runOxlint([fixture]);
        expect(
          diagnosticsFor(result.output, "Match the restored Result")
        ).toHaveLength(1);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "keeps direct Schema decoding prohibited in route consumers",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeConfiguredConsumer(`
      import { createFileRoute } from "@tanstack/react-router";
      import { Schema } from "effect";

      export const Route = createFileRoute("/decode")({
        component() {
          Schema.decodeUnknownSync(Schema.String)(Route.useLoaderData());
          return null;
        },
      });
    `);
        const result = yield* runOxlint([fixture]);
        expect(result.output).toContain(
          "taxkit(no-decoding-outside-boundaries)"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("rejects inline disable directives for both boundary rules", () =>
    Effect.gen(function* () {
      const fixture = yield* writeUnconfiguredFixture(
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
      const result = yield* runOxlint(
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
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect("does not report unrelated restore methods", () =>
    Effect.gen(function* () {
      const fixture = yield* writeUnconfiguredFixture(
        `
      const cache = { restore: (value) => value };
      cache.restore("value");
    `,
        "ts"
      );
      const result = yield* runOxlint([fixture]);
      expect(result.output).not.toContain(
        "taxkit(no-route-transport-restore-outside-consumers)"
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "does not mistake a shadowed canonical import for a boundary",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeUnconfiguredFixture(
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
        const result = yield* runOxlint([fixture]);
        expect(result.output).not.toContain(
          "taxkit(no-route-transport-restore-outside-consumers)"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
});
