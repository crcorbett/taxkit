import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  DocsPageNotFoundError,
  DocsSourceError,
} from "@whattax/docs-content/errors";
import {
  DocsNavigation,
  DocsPagePath,
  DocsSourcePath,
} from "@whattax/docs-content/schemas";
import { Effect, Match, Result, Schema } from "effect";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { describe, expect, test, vi } from "vitest";

import { DocsContentPreloadError } from "#/lib/docs/errors";
import { docsHomeRouteBoundary } from "#/lib/docs/route-boundary";

const homeSuccess = {
  navigation: Schema.decodeUnknownSync(DocsNavigation)({
    contentRoot: "apps/docs/content",
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
  loader: ({ params }) =>
    Match.value(params.scenario).pipe(
      Match.when("success", () =>
        Effect.runPromise(
          docsHomeRouteBoundary.encodeExit(Effect.succeed(homeSuccess))
        )
      ),
      Match.when("preload-error", () =>
        Effect.runPromise(
          docsHomeRouteBoundary.encodeExit(
            Effect.fail(
              new DocsContentPreloadError({
                message: "Unable to preload docs content",
                path: Schema.decodeUnknownSync(DocsSourcePath)(
                  "content/start/index.mdx"
                ),
              })
            )
          )
        )
      ),
      Match.when("not-found-error", () =>
        Effect.runPromise(
          docsHomeRouteBoundary.encodeExit(
            Effect.fail(
              new DocsPageNotFoundError({
                path: Schema.decodeUnknownSync(DocsPagePath)("/missing"),
              })
            )
          )
        )
      ),
      Match.when("source-error", () =>
        Effect.runPromise(
          docsHomeRouteBoundary.encodeExit(
            Effect.fail(new DocsSourceError({ cause: new Error("source") }))
          )
        )
      ),
      Match.when("malformed", () => ({ malformed: true })),
      Match.when("defect", () =>
        Effect.runPromise(
          docsHomeRouteBoundary.encodeExit(
            Effect.die(new Error("fatal docs loader defect"))
          )
        )
      ),
      Match.when("interruption", () =>
        Effect.runPromise(docsHomeRouteBoundary.encodeExit(Effect.interrupt))
      ),
      Match.orElse((scenario) =>
        Effect.runPromise(
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
          DocsPageNotFoundError: ({ _tag }) => (
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

const withRenderedHarnessRoute = <A,>(
  path: string,
  inspect: (render: HarnessRender) => Effect.Effect<A>
) =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const host = document.createElement("div");
      const root = createRoot(host, { onCaughtError: () => {} });
      const router = createHarnessRouter(path);

      document.body.replaceChildren(host);

      return {
        consoleError: vi.spyOn(console, "error").mockImplementation(() => {}),
        consoleWarn: vi.spyOn(console, "warn").mockImplementation(() => {}),
        host,
        root,
        router,
      };
    }),
    (render) =>
      Effect.gen(function* renderHarnessRoute() {
        yield* Effect.promise(() => render.router.load());
        yield* Effect.sync(() => {
          flushSync(() => {
            render.root.render(<RouterProvider router={render.router} />);
          });
        });
        yield* nextAnimationFrame;

        return yield* inspect(render);
      }),
    (render) =>
      Effect.sync(() => {
        render.consoleError.mockRestore();
        render.consoleWarn.mockRestore();
        render.root.unmount();
        render.router.history.destroy();
        document.body.replaceChildren();
      })
  );

const expectCleanConsole = ({
  consoleError,
  consoleWarn,
}: Pick<HarnessRender, "consoleError" | "consoleWarn">) => {
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
};

describe("docs route boundary browser harness", () => {
  test("renders success after direct route-root restoration", () =>
    Effect.runPromise(
      withRenderedHarnessRoute("/success", (render) =>
        Effect.sync(() => {
          expect(
            render.host.querySelector('[data-testid="loader-success"]')
          ).toHaveProperty("textContent", "Docs loaded");
          expectCleanConsole(render);
        })
      )
    ));

  test.each([
    ["preload-error", "DocsContentPreloadError"],
    ["not-found-error", "DocsPageNotFoundError"],
    ["source-error", "DocsSourceError"],
  ])("renders the %s expected failure in route UI", (scenario, tag) =>
    Effect.runPromise(
      withRenderedHarnessRoute(`/${scenario}`, (render) =>
        Effect.sync(() => {
          expect(
            render.host.querySelector('[data-testid="expected-loader-error"]')
          ).toHaveProperty("textContent", tag);
          expect(
            render.host.querySelector('[data-testid="framework-loader-error"]')
          ).toBeNull();
          expectCleanConsole(render);
        })
      )
    )
  );

  test("renders malformed transport in route UI", () =>
    Effect.runPromise(
      withRenderedHarnessRoute("/malformed", (render) =>
        Effect.sync(() => {
          expect(
            render.host.querySelector('[data-testid="transport-loader-error"]')
          ).toHaveProperty("textContent", "DocsRouteTransportError");
          expect(
            render.host.querySelector('[data-testid="framework-loader-error"]')
          ).toBeNull();
          expectCleanConsole(render);
        })
      )
    ));

  test.each(["defect", "interruption"])(
    "routes %s rejection to the TanStack error component",
    (scenario) =>
      Effect.runPromise(
        withRenderedHarnessRoute(`/${scenario}`, (render) =>
          Effect.sync(() => {
            expect(
              render.host.querySelector(
                '[data-testid="framework-loader-error"]'
              )
            ).not.toBeNull();
            expect(
              render.host.querySelector('[data-testid="loader-success"]')
            ).toBeNull();
            expectCleanConsole(render);
          })
        )
      )
  );
});
