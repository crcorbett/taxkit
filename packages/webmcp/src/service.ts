import type { DocsWebsiteOrigin } from "@taxkit/content/schemas";
import { Context } from "effect";
import type { Effect, Scope } from "effect";

import type { WebMcpRegistrationError, WebMcpTool } from "./schemas.js";

/**
 * The browser's WebMCP host. A registration lasts as long as the enclosing
 * Scope; closing it unregisters the tool and interrupts its running calls. A
 * browser without WebMCP, or another origin, accepts and ignores the tool.
 */
export class ModelContextHost extends Context.Service<
  ModelContextHost,
  {
    readonly registerTool: (
      tool: WebMcpTool
    ) => Effect.Effect<void, WebMcpRegistrationError, Scope.Scope>;
  }
>()("taxkit/webmcp/ModelContextHost") {}

/** The Website origin whose pages may register tools. */
export class WebMcpSite extends Context.Service<
  WebMcpSite,
  Readonly<{ origin: DocsWebsiteOrigin }>
>()("taxkit/webmcp/WebMcpSite") {}
