---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-api-mcp-package-owner
last_reviewed: 2026-10-17
review_trigger: MCP toolkit, handlers, protocol composition, cancellation or response budget change
---

# API MCP

`@taxkit/api-mcp` owns the remote MCP tool contract, service-backed handlers,
HTTP server Layer, request cancellation and complete-response budget. It calls
`PublicCalculatorService` and `ContentService` directly and reuses their checked
Schemas. It has no app, infrastructure, Alchemy or runtime dependency.

## Exports

- `./tools`: the six shared tool definitions and their annotations.
- `./handlers`: the static `TaxKitMcpHandlersLive` Layer over calculator/content services.
- `./service`: the `TaxKitMcpHost` composition contract, with the selected native
  protocol adapter and checked publication origin.
- `./server`: `TaxKitMcpHttpLayer`, using the HTTP owner's MCP path.
- `./schemas`: tool request/reply Schemas, safe failures, session identity and
  shared protocol budget constants.
- `./request`: the private `McpRequestAbortSignal` Context reference.
- `./cancellation`: `withMcpRequestCancellation`, which refuses a missing
  capability and interrupts disconnected request work with scoped cleanup.
- `./response-budget`: `withBoundedMcpReply`, which buffers complete native
  JSON/SSE replies within 2 MiB and ten seconds, preserving status and headers.

These are compiled internal source/types/default exports. The repository's
`source` condition resolves TypeScript; ordinary imports use built JavaScript.
There is no duplicate calculator/content service, client or runtime to acquire.
Host integration tests substitute domain Layers and supply a fresh private
cancellation signal.
The host provides configuration and owns protocol lifetime.

Originless remote clients are accepted. Browser Origins must exactly match the
checked publication origin. The app selects the native `2026-07-28` adapter for
stateless requests and `2025-11-25` for the legacy session host; this package's
Layer supports either selection. Legacy session admission keeps its existing
32-initialisation, 32-concurrent-request and ten-minute bounds. Durable Object
registration, session storage/expiry, trusted request forwarding, analytics and
stripping private request context before host capture remain in
[`apps/api`](../../../apps/api/README.md).

## Documentation impact

The repository [API architecture](../../../docs/architecture/api-and-sdk.md)
and [package ownership](../../../docs/architecture/package-ownership.md) own
the durable transport/app boundary. The API app README owns native hosting;
the Website retains its browser tool coordination. Package tests prove the
reply budget and cancellation cleanup. The API's official-client tests and
Website's native-pair MCP tests retain protocol, origin, session and isolation
proof through the actual app composition.

The renderer receipt records adaptation from the compiled internal service
scaffold to the narrower tool-transport role. Its domain service/live/test
scaffolding was removed because existing calculator and content Layers own those
contracts. The generic template validator requires that scaffold and does not
represent this package's protocol ownership contract.

## Runbook applicability

There is no package-specific deployment or runtime runbook. Native startup and
MCP qualification belong to the [API host](../../../apps/api/README.md) and
repository [runbooks](../../../docs/runbooks/README.md). No provider operation
is needed to build or test this private package.

## Non-claims

Local package checks do not establish provider state, deployed MCP access,
external client compatibility beyond retained tests or package publication.
This transport does not advertise resumable or unbounded event streams.
