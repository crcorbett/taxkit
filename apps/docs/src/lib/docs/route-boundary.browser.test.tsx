import { describe, expect, it as test } from "@effect/vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { DocsSourceError } from "@taxkit/docs-content/errors";
import { DocsNavigation, DocsSourcePath } from "@taxkit/docs-content/schemas";
import { Effect, Match, Result } from "effect";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import { DocsContentPreloadError } from "#/lib/docs/errors";
import { docsHomeRouteBoundary } from "#/lib/docs/route-boundary";

const homeSuccess = {
  navigation: DocsNavigation.make({
    contentRoot: "packages/docs-content/content",
    primaryNavigation: [],
    status: "published",
  }),
  pages: [],
};

const rootRoute = createRootRoute({ component: Outlet });

const FrameworkError = ({ error }: ErrorComponentProps) => (
  <div data-error={String(error)} data-testid="framework-loader-error" />
);

const harnessRoute = createRoute({
  getParentRoute: () => rootRoute,
  // This is the single fake server-loader bridge required by the Router host.
  // Native test bodies below do not execute an Effect runtime.
  loader: ({ params }) =>
    Effect.runPromise(
      Match.value(params.scenario).pipe(
        Match.when("success", () =>
          docsHomeRouteBoundary.encodeExit(Effect.succeed(homeSuccess))
        ),
        Match.when("preload-error", () =>
          docsHomeRouteBoundary.encodeExit(
            Effect.fail(
              new DocsContentPreloadError({
                message: "Unable to preload docs content",
                path: DocsSourcePath.make("content/start/index.mdx"),
              })
            )
          )
        ),
        Match.when("not-found-error", () => Effect.die(notFound())),
        Match.when("source-error", () =>
          docsHomeRouteBoundary.encodeExit(
            Effect.fail(
              new DocsSourceError({
                message: "The docs source failed.",
                operation: "getPage",
              })
            )
          )
        ),
        Match.when("malformed", () => Effect.succeed({ malformed: true })),
        Match.when("defect", () =>
          docsHomeRouteBoundary.encodeExit(
            Effect.die(new Error("fatal docs loader defect"))
          )
        ),
        Match.when("interruption", () =>
          docsHomeRouteBoundary.encodeExit(Effect.interrupt)
        ),
        Match.orElse((scenario) =>
          docsHomeRouteBoundary.encodeExit(
            Effect.die(new Error(`Unknown browser scenario: ${scenario}`))
          )
        )
      )
    ),
  path: "/$scenario",
});

const HarnessRoute = () => {
  const loaderData = harnessRoute.useLoaderData();
  const routeResult = docsHomeRouteBoundary.restore(loaderData);

  return Result.match(routeResult, {
    onFailure: (error) =>
      Match.value(error).pipe(
        Match.tags({
          DocsContentPreloadError: ({ _tag }) => (
            <div data-testid="expected-loader-error">{_tag}</div>
          ),
          DocsRouteTransportError: ({ _tag }) => (
            <div data-testid="transport-loader-error">{_tag}</div>
          ),
          DocsSourceError: ({ _tag }) => (
            <div data-testid="expected-loader-error">{_tag}</div>
          ),
        }),
        Match.exhaustive
      ),
    onSuccess: () => <div data-testid="loader-success">Docs loaded</div>,
  });
};

const routeTree = rootRoute.addChildren([
  harnessRoute.update({
    component: HarnessRoute,
    errorComponent: FrameworkError,
    notFoundComponent: () => (
      <div data-testid="framework-not-found">Not found</div>
    ),
  }),
]);

const nextAnimationFrame = Effect.callback((resume) => {
  const frame = requestAnimationFrame(() => {
    resume(Effect.void);
  });

  return Effect.sync(() => cancelAnimationFrame(frame));
});

const createHarnessRouter = (path: string) =>
  createRouter({
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree,
  });

type HarnessRender = Readonly<{
  consoleError: ReturnType<typeof vi.spyOn>;
  consoleWarn: ReturnType<typeof vi.spyOn>;
  host: HTMLDivElement;
  root: ReturnType<typeof createRoot>;
  router: ReturnType<typeof createHarnessRouter>;
}>;

const acquireRenderedHarnessRoute = (path: string) =>
  Effect.gen(function* () {
    const host = yield* Effect.acquireRelease(
      Effect.sync(() => {
        const element = document.createElement("div");
        document.body.replaceChildren(element);
        return element;
      }),
      (element) => Effect.sync(() => element.remove())
    );
    const consoleError = yield* Effect.acquireRelease(
      Effect.sync(() =>
        vi.spyOn(console, "error").mockImplementation(() => {})
      ),
      (spy) => Effect.sync(() => spy.mockRestore())
    );
    const consoleWarn = yield* Effect.acquireRelease(
      Effect.sync(() => vi.spyOn(console, "warn").mockImplementation(() => {})),
      (spy) => Effect.sync(() => spy.mockRestore())
    );
    const root = yield* Effect.acquireRelease(
      Effect.sync(() => createRoot(host, { onCaughtError: () => {} })),
      (reactRoot) => Effect.sync(() => reactRoot.unmount())
    );
    const router = yield* Effect.acquireRelease(
      Effect.sync(() => createHarnessRouter(path)),
      (harnessRouter) => Effect.sync(() => harnessRouter.history.destroy())
    );
    yield* Effect.promise(() => router.load());
    yield* Effect.sync(() =>
      flushSync(() => root.render(<RouterProvider router={router} />))
    );
    yield* nextAnimationFrame;
    return {
      consoleError,
      consoleWarn,
      host,
      root,
      router,
    } satisfies HarnessRender;
  });

const expectCleanConsole = ({
  consoleError,
  consoleWarn,
}: Pick<HarnessRender, "consoleError" | "consoleWarn">) => {
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
};

describe("docs route boundary browser harness", () => {
  test.effect("renders success after direct route-root restoration", () =>
    Effect.gen(function* () {
      const render = yield* acquireRenderedHarnessRoute("/success");
      expect(
        render.host.querySelector('[data-testid="loader-success"]')
      ).toHaveProperty("textContent", "Docs loaded");
      expectCleanConsole(render);
    }).pipe(Effect.scoped)
  );

  test.effect.each([
    ["preload-error", "DocsContentPreloadError"],
    ["source-error", "DocsSourceError"],
  ] as const)(
    "renders the %s expected failure in route UI",
    ([scenario, tag]) =>
      Effect.gen(function* () {
        const render = yield* acquireRenderedHarnessRoute(`/${scenario}`);
        expect(
          render.host.querySelector('[data-testid="expected-loader-error"]')
        ).toHaveProperty("textContent", tag);
        expect(
          render.host.querySelector('[data-testid="framework-loader-error"]')
        ).toBeNull();
        expectCleanConsole(render);
      }).pipe(Effect.scoped)
  );

  test.effect("routes missing pages to the TanStack not-found component", () =>
    Effect.gen(function* () {
      const render = yield* acquireRenderedHarnessRoute("/not-found-error");
      expect(
        render.host.querySelector('[data-testid="framework-not-found"]')
      ).toHaveProperty("textContent", "Not found");
      expect(
        render.host.querySelector('[data-testid="expected-loader-error"]')
      ).toBeNull();
      expectCleanConsole(render);
    }).pipe(Effect.scoped)
  );

  test.effect("renders malformed transport in route UI", () =>
    Effect.gen(function* () {
      const render = yield* acquireRenderedHarnessRoute("/malformed");
      expect(
        render.host.querySelector('[data-testid="transport-loader-error"]')
      ).toHaveProperty("textContent", "DocsRouteTransportError");
      expect(
        render.host.querySelector('[data-testid="framework-loader-error"]')
      ).toBeNull();
      expectCleanConsole(render);
    }).pipe(Effect.scoped)
  );

  test.effect.each(["defect", "interruption"] as const)(
    "routes %s rejection to the TanStack error component",
    (scenario) =>
      Effect.gen(function* () {
        const render = yield* acquireRenderedHarnessRoute(`/${scenario}`);
        expect(
          render.host.querySelector('[data-testid="framework-loader-error"]')
        ).not.toBeNull();
        expect(
          render.host.querySelector('[data-testid="loader-success"]')
        ).toBeNull();
        expect(render.consoleError).not.toHaveBeenCalled();
        expect(render.consoleWarn.mock.calls).toEqual([
          [`Warning: Error in route match: /$scenario/${scenario}`],
        ]);
      }).pipe(Effect.scoped)
  );
});
