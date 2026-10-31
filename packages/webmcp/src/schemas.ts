import { Schema } from "effect";
import type { Effect, JsonSchema } from "effect";
import type { WebMCP } from "webmcp-types";

// The plain JSON object of arguments the host passes to a tool. The tool's own
// parameter Schema checks it.
export type WebMcpToolInput = Parameters<WebMCP.ToolExecuteCallback>[0];

/** A tool as the browser's WebMCP host receives it; `execute` is an Effect. */
export interface WebMcpTool {
  readonly annotations: Readonly<{ readOnlyHint: boolean }>;
  readonly description: string;
  // The encoded result or encoded declared failure. Interrupting the Effect
  // is how the host's cancellation reaches the tool.
  readonly execute: (input: WebMcpToolInput) => Effect.Effect<unknown>;
  readonly inputSchema: JsonSchema.JsonSchema;
  readonly name: string;
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
  tool: Schema.String.check(Schema.isMaxLength(128)),
}) {}
