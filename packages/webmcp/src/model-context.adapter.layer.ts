import { DocsWebsiteOrigin } from "@taxkit/content/schemas";
import {
  Duration,
  Effect,
  FiberSet,
  Layer,
  Option,
  Predicate,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import type { WebMCP } from "webmcp-types";

import { WebMcpRegistrationError } from "./schemas.js";
import type { WebMcpTool } from "./schemas.js";
import { ModelContextHost, WebMcpSite } from "./service.js";

type NativeModelContext = Pick<WebMCP.ModelContext, "registerTool">;
// A declaration checks the native capability without copying its receiver:
// browser methods can require the original modelContext object as `this`.
const NativeModelContext = Schema.declare<NativeModelContext>(
  (input): input is NativeModelContext =>
    Predicate.hasProperty(input, "registerTool") &&
    Predicate.isFunction(input.registerTool)
);
// Server rendering has no document. Detection is lazy at this host boundary,
// so importing the module performs no browser work.
const findModelContext = (site: DocsWebsiteOrigin) =>
  Effect.sync(() => {
    const documentHost = Option.fromNullishOr(globalThis.document);
    if (Option.isNone(documentHost)) {
      return Option.none<NativeModelContext>();
    }
    const origin = Schema.decodeUnknownOption(DocsWebsiteOrigin)(
      globalThis.location.origin
    );
    return EffectBoolean.match(
      Option.isSome(origin) && origin.value.origin === site.origin,
      {
        onFalse: () => Option.none<NativeModelContext>(),
        onTrue: () =>
          Schema.decodeUnknownOption(NativeModelContext)(
            documentHost.value.modelContext
          ),
      }
    );
  });
// The one browser Promise bridge for WebMCP. The host's `registerTool`
// returns a Promise and calls `execute` outside Effect; the registration
// Scope owns both the tool's removal and its running callbacks.
export const ModelContextHostLive = Layer.effect(
  ModelContextHost,
  Effect.gen(function* () {
    const site = yield* WebMcpSite;
    return ModelContextHost.of({
      registerTool: Effect.fn("ModelContextHost.registerTool")(function* (
        tool: WebMcpTool
      ) {
        const host = yield* findModelContext(site.origin);
        if (Option.isNone(host)) {
          return;
        }
        const run = yield* FiberSet.makeRuntimePromise();
        // Aborting this signal is how WebMCP unregisters the tool.
        const registration = yield* Effect.acquireRelease(
          Effect.sync(() => new AbortController()),
          (controller) =>
            Effect.sync(() => {
              controller.abort();
            })
        );
        yield* Effect.tryPromise({
          catch: (cause) =>
            new WebMcpRegistrationError({
              reason: Schema.decodeUnknownOption(
                Schema.instanceOf(DOMException)
              )(cause).pipe(
                Option.flatMap((error) =>
                  Schema.decodeUnknownOption(
                    WebMcpRegistrationError.fields.reason
                  )(error.name)
                ),
                Option.getOrElse(() => "unexpected-host-refusal" as const)
              ),
              tool: tool.name,
            }),
          try: (signal) =>
            host.value.registerTool(
              {
                annotations: {
                  consequentialHint: false,
                  readOnlyHint: tool.annotations.readOnlyHint,
                  untrustedContentHint: true,
                },
                description: tool.description,
                execute: (input, options) => {
                  const program = tool.execute(input);
                  return run(program, { signal: options.signal });
                },
                inputSchema: tool.inputSchema,
                name: tool.name,
              },
              { signal: AbortSignal.any([registration.signal, signal]) }
            ),
        }).pipe(
          Effect.timeoutOrElse({
            duration: Duration.seconds(2),
            orElse: () =>
              Effect.fail(
                new WebMcpRegistrationError({
                  reason: "registration-timeout",
                  tool: tool.name,
                })
              ),
          })
        );
      }),
    });
  })
);
