import { TaxKitMcpToolkit } from "@taxkit/api-mcp/tools";
import {
  Array,
  Cause,
  Context,
  Effect,
  Option,
  Record,
  Schema,
  Stream,
  Boolean as EffectBoolean,
} from "effect";
import { AiError, Tool } from "effect/ai";

import { WebMcpToolResult } from "./schemas.js";
import { ModelContextHost } from "./service.js";

// MCP's strict tools reject unknown input keys, so WebMCP's do too.
const strict = { onExcessProperty: "error" } as const;
const encodeText = Schema.encodeEffect(Schema.fromJsonString(Schema.Json));
const failed = WebMcpToolResult.make({
  content: [{ text: "The tool call failed.", type: "text" }],
  isError: true,
});

/**
 * Register the API MCP toolkit's tools with the browser's WebMCP host for the
 * enclosing Scope; the caller provides the toolkit's handlers. Everything but
 * `execute` comes from the shared definition, as in remote MCP's
 * `tools/list`: the name, description, strict input JSON Schema (with its
 * `$defs`) and read-only hint. Results follow MCP's tool result: an encoded
 * success, a declared `McpToolUnavailable`, useful detail for invalid input,
 * or a fixed message for anything else. The host sees a rejected Promise only
 * on cancellation. A host that refuses one tool is logged and does not stop
 * the others.
 */
export const registerWebMcpTools = Effect.gen(function* () {
  const host = yield* ModelContextHost;
  const toolkit = yield* TaxKitMcpToolkit;
  const tools = Record.toEntries(toolkit.tools);
  yield* Effect.forEach(
    tools,
    ([name, tool]) => {
      const input = Schema.toJsonSchemaDocument(tool.parametersSchema, strict);
      return host
        .registerTool({
          annotations: {
            readOnlyHint: Context.get(tool.annotations, Tool.Readonly),
          },
          description: Option.fromNullishOr(Tool.getDescription(tool)).pipe(
            Option.getOrElse(() => name)
          ),
          execute: (parameters) =>
            toolkit.handle(name, parameters, undefined, strict).pipe(
              Stream.unwrap,
              Stream.runLast,
              Effect.flatMap(Effect.fromOption),
              // The toolkit's encoded success is MCP's structured content.
              Effect.flatMap(({ encodedResult }) =>
                Schema.decodeUnknownEffect(Schema.JsonObject)(encodedResult)
              ),
              Effect.flatMap((structuredContent) =>
                encodeText(structuredContent).pipe(
                  Effect.map((text) =>
                    WebMcpToolResult.make({
                      content: [{ text, type: "text" }],
                      isError: false,
                      structuredContent,
                    })
                  )
                )
              ),
              Effect.catchCause((cause) => {
                if (Cause.hasInterruptsOnly(cause)) {
                  return Effect.interrupt;
                }
                // A defect never becomes a declared answer.
                const error = Cause.findErrorOption(cause).pipe(
                  Option.filter(() => !Cause.hasDies(cause))
                );
                const invalid = error.pipe(
                  Option.filter(AiError.isAiError),
                  Option.map(({ reason }) => reason),
                  Option.filter(Schema.is(AiError.ToolParameterValidationError))
                );
                if (Option.isSome(invalid)) {
                  return Effect.succeed(
                    WebMcpToolResult.make({
                      content: [
                        {
                          text: `Invalid input: ${invalid.value.message}`,
                          type: "text",
                        },
                      ],
                      isError: true,
                    })
                  );
                }
                return error.pipe(
                  Option.filter(Schema.is(tool.failureSchema)),
                  Option.match({
                    // Only the tool name is logged: a defect can carry
                    // submitted figures or provider text.
                    onNone: () =>
                      Effect.logWarning("A TaxKit browser tool failed.", {
                        tool: name,
                      }).pipe(Effect.as(failed)),
                    onSome: (declared) =>
                      Schema.encodeEffect(tool.failureSchema)(declared).pipe(
                        Effect.flatMap(encodeText),
                        Effect.map((text) =>
                          WebMcpToolResult.make({
                            content: [{ text, type: "text" }],
                            isError: true,
                          })
                        ),
                        Effect.orElseSucceed(() => failed)
                      ),
                  })
                );
              })
            ),
          inputSchema: EffectBoolean.match(
            Record.isEmptyRecord(input.definitions),
            {
              onFalse: () => ({ ...input.schema, $defs: input.definitions }),
              onTrue: () => input.schema,
            }
          ),
          name,
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
