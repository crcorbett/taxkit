import { DocsWebsiteOrigin } from "@taxkit/content/schemas";
import {
  Array,
  Cause,
  Context,
  Duration,
  Effect,
  FiberSet,
  Match,
  Option,
  Predicate,
  Record,
  Schema,
  Stream,
} from "effect";
import { AiError, Tool } from "effect/ai";
import type { Toolkit } from "effect/ai";
import type { WebMCP } from "webmcp-types";

import {
  WebsiteBrowserToolFailure,
  WebsiteBrowserToolRegistrationFailed,
} from "./browser-tools.schemas";
import type { WebsiteBrowserToolkit } from "./browser-tools.toolkit";

// A declaration checks the native capability without copying its receiver.
// Browser methods can require the original modelContext object as `this`.
const NativeModelContext = Schema.declare<
  Pick<WebMCP.ModelContext, "registerTool">
>(
  (input): input is Pick<WebMCP.ModelContext, "registerTool"> =>
    Predicate.hasProperty(input, "registerTool") &&
    Predicate.isFunction(input.registerTool)
);
const nativeBrowserContext = (websiteOrigin: DocsWebsiteOrigin) =>
  Effect.sync(() => {
    // SSR has no document. Capability detection is lazy at this native host
    // boundary, so importing the module performs no browser work.
    const documentHost = Option.fromNullishOr(globalThis.document);
    if (Option.isNone(documentHost)) {
      return Option.none<Pick<WebMCP.ModelContext, "registerTool">>();
    }
    const origin = Schema.decodeUnknownOption(DocsWebsiteOrigin)(
      globalThis.location.origin
    );
    return Option.isSome(origin) && origin.value.origin === websiteOrigin.origin
      ? Schema.decodeUnknownOption(NativeModelContext)(
          documentHost.value.modelContext
        )
      : Option.none<Pick<WebMCP.ModelContext, "registerTool">>();
  });

// This is the one private browser protocol adapter. Toolkit owns argument
// decoding and result encoding; the registration Scope owns both native tool
// removal and callback fibres. It creates no browser ManagedRuntime.
export const registerWebsiteBrowserTools = Effect.fnUntraced(function* (
  toolkit: Toolkit.WithHandler<typeof WebsiteBrowserToolkit.tools>,
  websiteOrigin: DocsWebsiteOrigin
) {
  const host = yield* nativeBrowserContext(websiteOrigin);
  if (Option.isNone(host)) {
    return;
  }
  const run =
    yield* FiberSet.makeRuntimePromise<
      Tool.HandlerServices<
        (typeof WebsiteBrowserToolkit.tools)[keyof typeof WebsiteBrowserToolkit.tools]
      >
    >();
  yield* Effect.forEach(
    Record.toEntries(toolkit.tools),
    ([name, tool]) =>
      Effect.gen(function* () {
        const registration = yield* Effect.acquireRelease(
          Effect.sync(() => new AbortController()),
          (controller) => Effect.sync(() => controller.abort())
        );
        // Inputs are plain JSON form fields or the checked EmptyParams record.
        // Advertise that checked shape, including the unknown -> EmptyParams
        // ingress codec, rather than advertising Unknown as the host contract.
        const input = Schema.toJsonSchemaDocument(
          Schema.toType(tool.parametersSchema),
          {
            onExcessProperty: "error",
          }
        );
        yield* Effect.tryPromise({
          catch: (cause) => {
            const refusal = Schema.decodeUnknownOption(
              Schema.instanceOf(DOMException)
            )(cause).pipe(
              Option.flatMap((error) =>
                Schema.decodeUnknownOption(
                  WebsiteBrowserToolRegistrationFailed.fields.reason
                )(error.name)
              )
            );
            return new WebsiteBrowserToolRegistrationFailed({
              reason: Option.getOrElse(
                refusal,
                () => "unexpected-host-refusal"
              ),
              tool: tool.name,
            });
          },
          try: (signal) =>
            host.value.registerTool(
              {
                annotations: {
                  consequentialHint: false,
                  readOnlyHint: Context.get(tool.annotations, Tool.Readonly),
                  untrustedContentHint: true,
                },
                description:
                  Tool.getDescription(tool) ??
                  "Use the mounted TaxKit calculator's visible commands.",
                execute: (parameters, options) =>
                  run(
                    toolkit
                      .handle(name, parameters, undefined, {
                        onExcessProperty: "error",
                      })
                      .pipe(
                        Stream.unwrap,
                        Stream.runLast,
                        Effect.flatMap(Effect.fromOption),
                        Effect.map((result) => result.encodedResult),
                        Effect.catchCause((cause) => {
                          if (Cause.hasInterrupts(cause)) {
                            return Effect.interrupt;
                          }
                          const error = Cause.findErrorOption(cause);
                          const validation = error.pipe(
                            Option.filter(AiError.isAiError),
                            Option.exists((value) =>
                              Match.value(value.reason).pipe(
                                Match.tag(
                                  "ToolParameterValidationError",
                                  () => true
                                ),
                                Match.orElse(() => false)
                              )
                            )
                          );
                          return Schema.encodeEffect(
                            Schema.toCodecJson(WebsiteBrowserToolFailure)
                          )(
                            error.pipe(
                              Option.filter(
                                Schema.is(WebsiteBrowserToolFailure)
                              ),
                              Option.getOrElse(
                                () =>
                                  new WebsiteBrowserToolFailure({
                                    code: validation
                                      ? "invalid-input"
                                      : "service-unavailable",
                                    retry: validation
                                      ? "check-the-visible-form"
                                      : "try-again-manually",
                                  })
                              )
                            )
                          );
                        }),
                        Effect.scoped
                      ),
                    { signal: options.signal }
                  ),
                inputSchema: {
                  ...input.schema,
                  $defs: input.definitions,
                },
                name: tool.name,
              },
              { signal: AbortSignal.any([registration.signal, signal]) }
            ),
        }).pipe(
          Effect.timeoutOrElse({
            duration: Duration.seconds(2),
            orElse: () =>
              Effect.fail(
                new WebsiteBrowserToolRegistrationFailed({
                  reason: "registration-timeout",
                  tool: tool.name,
                })
              ),
          }),
          Effect.catchTag("WebsiteBrowserToolRegistrationFailed", (error) =>
            Effect.logWarning("A TaxKit browser tool could not register.", {
              reason: error.reason,
              tool: error.tool,
            })
          )
        );
      }),
    { concurrency: Array.length(Record.toEntries(toolkit.tools)) }
  );
});
