import { createFileRoute } from "@tanstack/react-router";
import { Option, Result } from "effect";

import {
  docsHomeRouteBoundary,
  docsPageRouteBoundary,
} from "#/lib/docs/route-boundary";

export type PageRouteResult = ReturnType<typeof docsPageRouteBoundary.restore>;

export const DirectRoute = createFileRoute("/lint-direct")({
  component() {
    return Result.match(
      docsHomeRouteBoundary.restore(DirectRoute.useLoaderData()),
      {
        onFailure: () => <main>Failure</main>,
        onSuccess: () => <main>Success</main>,
      }
    );
  },
});

export const ImmutableBindingRoute = createFileRoute("/lint-binding")({
  component() {
    const loaderData = ImmutableBindingRoute.useLoaderData();
    const routeResult = docsPageRouteBoundary.restore(loaderData);

    return Result.match(routeResult, {
      onFailure: () => <main>Failure</main>,
      onSuccess: () => <main>Success</main>,
    });
  },
});

const NamedRouteComponent = () => {
  // oxlint-disable-next-line no-use-before-define -- The named route consumer closes over its route binding.
  const loaderData = NamedRoute.useLoaderData();
  const routeResult = docsPageRouteBoundary.restore(loaderData);

  return Result.match(routeResult, {
    onFailure: () => <main>Failure</main>,
    onSuccess: () => <main>Success</main>,
  });
};

export const NamedRoute = createFileRoute("/lint-named")({
  component: NamedRouteComponent,
});

export const HeadRoute = createFileRoute("/lint-head")({
  head: ({ loaderData }) => {
    const normalisedLoaderData = Option.fromUndefinedOr(loaderData).pipe(
      Option.getOrElse(() => null)
    );
    const routeResult = docsPageRouteBoundary.restore(normalisedLoaderData);

    return Result.match(routeResult, {
      onFailure: () => ({ meta: [] }),
      onSuccess: () => ({ meta: [] }),
    });
  },
});

export const DirectHeadRoute = createFileRoute("/lint-direct-head")({
  head: ({ loaderData }) =>
    Result.match(docsPageRouteBoundary.restore(loaderData), {
      onFailure: () => ({ meta: [] }),
      onSuccess: () => ({ meta: [] }),
    }),
});
