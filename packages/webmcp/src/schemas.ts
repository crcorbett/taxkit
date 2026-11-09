import { TaxKitMcpToolkit } from "@taxkit/api-mcp/tools";
import { Record, Schema } from "effect";
import type { Effect, JsonSchema } from "effect";
import type { WebMCP } from "webmcp-types";

// The WebMCP tools are the API MCP toolkit's tools, so their names are its keys.
export const WebMcpToolName = Schema.Literals(
  Record.keys(TaxKitMcpToolkit.tools)
);
export type WebMcpToolName = typeof WebMcpToolName.Type;

// The plain JSON object of arguments the host passes to a tool. The tool's own
// strict parameter Schema checks it.
export type WebMcpToolInput = Parameters<WebMCP.ToolExecuteCallback>[0];

// MCP's tool result shape, which browser agents read as remote MCP clients do.
export const WebMcpToolResult = Schema.Struct({
  content: Schema.Array(
    Schema.Struct({ text: Schema.String, type: Schema.Literal("text") })
  ),
  isError: Schema.Boolean,
  structuredContent: Schema.optionalKey(Schema.Json),
});
export type WebMcpToolResult = typeof WebMcpToolResult.Type;

/** A tool as the browser's WebMCP host receives it; `execute` is an Effect. */
export interface WebMcpTool {
  readonly annotations: Readonly<{ readOnlyHint: boolean }>;
  readonly description: string;
  // Interrupting the Effect is how the host's cancellation reaches the tool.
  readonly execute: (input: WebMcpToolInput) => Effect.Effect<WebMcpToolResult>;
  readonly inputSchema: JsonSchema.JsonSchema;
  readonly name: WebMcpToolName;
}

// Why the host refused: the DOMException name it reported, a missed deadline
// or any other refusal. The name is bounded, so a refusal is visible in logs.
export class WebMcpRegistrationError extends Schema.TaggedError<
  WebMcpRegistrationError,
  { readonly brand: unique symbol }
>()("WebMcpRegistrationError", {
  reason: Schema.Literals([
    "AbortError",
    "DataCloneError",
    "InvalidStateError",
    "NotAllowedError",
    "NotSupportedError",
    "SecurityError",
    "registration-timeout",
    "unexpected-host-refusal",
  ]),
  tool: WebMcpToolName,
}) {}
