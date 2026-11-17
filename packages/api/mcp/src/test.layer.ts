import { Effect } from "effect";
import type { Layer } from "effect";
import type { Tool, Toolkit } from "effect/ai";

import { McpToolUnavailable } from "./errors.js";
import { TaxKitMcpToolkit } from "./tools.js";

const unavailable = new McpToolUnavailable({
  code: "service-unavailable",
  retry: "try-again-manually",
});
// Deterministic handlers for every toolkit tool: each answers with the safe
// `service-unavailable` failure, so a registration host can be tested without
// the calculator or content services.
export const TaxKitMcpHandlersTest: Layer.Layer<
  Tool.HandlersFor<Toolkit.Tools<typeof TaxKitMcpToolkit>>
> = TaxKitMcpToolkit.toLayer({
  taxkit_calculate: () => Effect.fail(unavailable),
  taxkit_docs_navigation: () => Effect.fail(unavailable),
  taxkit_find_docs: () => Effect.fail(unavailable),
  taxkit_get_calculator_schema: () => Effect.fail(unavailable),
  taxkit_list_calculators: () => Effect.fail(unavailable),
  taxkit_read_doc: () => Effect.fail(unavailable),
});
