# @taxkit/webmcp

Private source package that registers the API's MCP tools with the browser's
WebMCP host. The tool definitions and the client-backed handlers belong to
[`@taxkit/api-mcp`](../api/mcp/README.md); the Website supplies the handlers,
the checked origin and the registration lifetime through one root Atom in its
browser runtime. This package owns no runtime.

## Exports

- `./service` exports `ModelContextHost`, whose `registerTool` lasts for the
  enclosing Scope, and `WebMcpSite`, the Website origin allowed to register.
- `./host` exports `ModelContextHostLive`, the one WebMCP Promise bridge. It
  reads `document.modelContext`, then the older `navigator.modelContext`, only
  inside an Effect and only when `location.origin` equals the checked Website
  origin. It keeps the host object as the method receiver and gives each
  registration a two-second deadline. Closing the Scope aborts the
  registration's signal, which unregisters the tool, and interrupts running
  calls through `FiberSet.makeRuntimePromise`.
- `./registration` exports `registerWebMcpTools`. Every tool comes from
  `TaxKitMcpToolkit` with the name, description, strict input JSON Schema and
  read-only hint that remote MCP lists; the test compares them with
  `McpServer`'s own registration. Results are MCP tool results: the encoded
  success, a declared `McpToolUnavailable`, invalid-input detail or a fixed
  message. The host never sees a rejected Promise except on cancellation. A
  refused tool is logged and the others still register.
- `./schemas` exports `WebMcpToolResult`, `WebMcpToolName`, `WebMcpTool` and
  `WebMcpRegistrationError`, whose reason is the host's `DOMException` name,
  `registration-timeout` or `unexpected-host-refusal`.

A browser without WebMCP, another origin and server rendering register nothing.

## Documentation impact

Change this README, [package ownership](../../docs/architecture/package-ownership.md)
and the [frontend architecture](../../docs/architecture/frontend.md) when the host
contract, registration or result Schemas change. Tool definitions change in
`@taxkit/api-mcp`.

## Runbook applicability

No package runbook is needed. The registration ships with the Website, whose
deployment belongs to the [deployment runbook](../../docs/runbooks/deployment.md).

## Non-claims

Package tests use a controlled host. They do not prove a particular browser's
WebMCP implementation or the deployed Website's registration.
