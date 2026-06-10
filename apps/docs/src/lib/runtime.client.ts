import { Effect } from "effect";

import type { DocsRouteRuntime } from "./route-runtime";

const clientLoaderRuntimeError = "Docs content loaders run on the server.";

export const docsRuntime = {
  runPromise: () =>
    Effect.runPromise(Effect.die(new Error(clientLoaderRuntimeError))),
  runPromiseExit: () =>
    Effect.runPromiseExit(Effect.die(new Error(clientLoaderRuntimeError))),
} satisfies DocsRouteRuntime;
