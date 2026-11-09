import {
  Duration,
  Effect,
  FiberSet,
  Layer,
  Option,
  Predicate,
  Schema,
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
const ModelContextOwner = Schema.Struct({
  modelContext: Schema.optional(NativeModelContext),
});
const ModelContextOwners = Schema.Struct({
  document: Schema.optional(ModelContextOwner),
  location: Schema.Struct({ origin: Schema.String }),
  navigator: Schema.optional(ModelContextOwner),
});
// Detection reads `document.modelContext` (the draft and Chrome 153), then the
// older `navigator.modelContext`; retire that fallback once no supported
// browser exposes only the navigator host. Server rendering, an unsupporting
// browser or another origin has none. Suspended, so each registration reads
// the current globals and importing this module performs no browser work.
const findModelContext = (site: WebMcpSite["Service"]) =>
  Effect.suspend(() =>
    Schema.decodeUnknownEffect(ModelContextOwners)(globalThis)
  ).pipe(
    Effect.option,
    Effect.map(
      Option.filter((owners) => owners.location.origin === site.origin.origin)
    ),
    Effect.map(
      Option.flatMap((owners) =>
        Option.fromNullishOr(owners.document?.modelContext).pipe(
          Option.orElse(() =>
            Option.fromNullishOr(owners.navigator?.modelContext)
          )
        )
      )
    )
  );
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
        const host = yield* findModelContext(site);
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
                  readOnlyHint: tool.annotations.readOnlyHint,
                },
                description: tool.description,
                // The draft passes cancellation options; older builds and
                // stand-in hosts call `execute(input)` alone.
                execute: (
                  input,
                  options?: WebMCP.ToolExecuteCallbackOptions
                ) => {
                  const program = tool.execute(input);
                  const cancellation = Option.fromNullishOr(options).pipe(
                    Option.getOrUndefined
                  );
                  return run(program, cancellation);
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
