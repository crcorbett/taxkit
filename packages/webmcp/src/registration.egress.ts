import { CalculatorToolFailure } from "@taxkit/calculators/page-schemas";
import type { CalculatorPageToolkit } from "@taxkit/calculators/page-tools";
import {
  Array,
  Cause,
  Context,
  Effect,
  Match,
  Option,
  Record,
  Schema,
  Stream,
} from "effect";
import { AiError, Tool } from "effect/ai";
import type { Toolkit } from "effect/ai";

import { ModelContextHost } from "./service.js";

// Tools reject unknown input keys, as remote MCP does.
const strict = { onExcessProperty: "error" } as const;
const encodeFailure = Schema.encodeEffect(
  Schema.toCodecJson(CalculatorToolFailure)
);

/**
 * Register the mounted calculator page's tools with the browser's WebMCP host
 * for the enclosing Scope. Each tool advertises its checked parameter Schema;
 * Toolkit decodes the input and encodes the result. Any failure becomes an
 * encoded `CalculatorToolFailure`, never a rejected Promise or a Cause. A host
 * that refuses one tool is logged and does not stop the others.
 */
export const registerCalculatorPageTools = Effect.fnUntraced(function* (
  toolkit: Toolkit.WithHandler<typeof CalculatorPageToolkit.tools>
) {
  const host = yield* ModelContextHost;
  const tools = Record.toEntries(toolkit.tools);
  yield* Effect.forEach(
    tools,
    ([name, tool]) => {
      // Inputs are plain JSON objects. Advertise the checked parameter shape,
      // not the Unknown ingress side of a decoding codec.
      const input = Schema.toJsonSchemaDocument(
        Schema.toType(tool.parametersSchema),
        strict
      );
      return host
        .registerTool({
          annotations: {
            readOnlyHint: Context.get(tool.annotations, Tool.Readonly),
          },
          description: Option.fromNullishOr(Tool.getDescription(tool)).pipe(
            Option.getOrElse(() => tool.name)
          ),
          execute: (parameters) =>
            toolkit.handle(name, parameters, undefined, strict).pipe(
              Stream.unwrap,
              Stream.runLast,
              Effect.flatMap(Effect.fromOption),
              Effect.map((result) => result.encodedResult),
              Effect.catchCause((cause) => {
                if (Cause.hasInterrupts(cause)) {
                  return Effect.interrupt;
                }
                const error = Cause.findErrorOption(cause);
                const invalid = error.pipe(
                  Option.filter(AiError.isAiError),
                  Option.exists((value) =>
                    Match.value(value.reason).pipe(
                      Match.tag("ToolParameterValidationError", () => true),
                      Match.orElse(() => false)
                    )
                  )
                );
                return encodeFailure(
                  error.pipe(
                    Option.filter(Schema.is(CalculatorToolFailure)),
                    Option.getOrElse(
                      () =>
                        new CalculatorToolFailure({
                          code: invalid
                            ? "invalid-input"
                            : "service-unavailable",
                          retry: invalid
                            ? "check-the-visible-form"
                            : "try-again-manually",
                        })
                    )
                  )
                );
              }),
              Effect.scoped,
              Effect.orDie
            ),
          inputSchema: { ...input.schema, $defs: input.definitions },
          name: tool.name,
        })
        .pipe(
          Effect.catchTag("WebMcpRegistrationError", (refusal) =>
            Effect.logWarning("A TaxKit browser tool could not register.", {
              reason: refusal.reason,
              tool: refusal.tool,
            })
          )
        );
    },
    { concurrency: Array.length(tools), discard: true }
  );
});
