import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { Array, Effect, Schema } from "effect";

import {
  DocsRuntimeProbeSnapshot,
  readDocsRuntimeProbe,
} from "./lib/runtime-factory.server";
import { docsRuntime } from "./lib/runtime.server";

const startHandler = createStartHandler(defaultStreamHandler);
const runtimeProofRequestHeader = "x-taxkit-docs-runtime-proof";
const runtimeProofResponseHeader = "x-taxkit-docs-runtime-constructions";
const runtimeProofIsolateHeader = "x-taxkit-docs-runtime-isolate";

export default {
  fetch: (request: Request) =>
    Effect.runPromise(
      Effect.gen(function* () {
        // The host permits either a Response or Promise; normalise its result here.
        // Unexpected framework rejection remains a defect.
        const response = yield* Effect.promise(() =>
          Promise.resolve(startHandler(request))
        );
        if (
          request.headers.get(runtimeProofRequestHeader) !==
          "construction-count"
        ) {
          return response;
        }
        // Ordinary host responses do not initialise documentation services.
        const context = yield* docsRuntime.contextEffect;
        const probe = yield* readDocsRuntimeProbe.pipe(
          Effect.provide(context),
          Effect.flatMap(Schema.encodeEffect(DocsRuntimeProbeSnapshot))
        );
        // Preserve unrelated host headers and replace only the two proof headers.
        const headers = new Headers([
          ...Array.filter(
            Array.fromIterable(response.headers),
            ([name]) =>
              name !== runtimeProofResponseHeader &&
              name !== runtimeProofIsolateHeader
          ),
          [runtimeProofResponseHeader, String(probe.constructions)],
          [runtimeProofIsolateHeader, probe.isolateId],
        ]);
        return new Response(response.body, {
          headers,
          status: response.status,
          statusText: response.statusText,
        });
      }),
      { signal: request.signal }
    ),
};
