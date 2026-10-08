import { Context, Option } from "effect";

// Private native host cancellation capability. It never enters calculator or
// content contracts and carries neither figures nor a caller identity.
export const McpRequestAbortSignal = Context.Reference<
  Option.Option<AbortSignal>
>("taxkit/api/McpRequestAbortSignal", { defaultValue: Option.none });
