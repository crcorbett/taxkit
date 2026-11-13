# API MCP

`@taxkit/api-mcp` owns the remote MCP tool contract, service-backed handlers,
HTTP server Layer, request cancellation and complete-response budget. It calls
`PublicCalculatorService` and `ContentService` directly and reuses their checked
Schemas. It has no app, infrastructure, Alchemy or runtime dependency.

## Exports

- `./tools`: `TaxKitMcpToolkit`, the six shared tool definitions and
  annotations. `./server` and the Website's browser WebMCP both use it, so
  remote and browser tools have identical names, Schemas and hints.
- `./client-handlers`: `clientToolHandlers(client)`, the same tools answered
  through the generated public API client for browser WebMCP, with the same
  success Schemas and safe `McpToolUnavailable` codes.
- `src/handlers.layer.ts` (internal): the static `TaxKitMcpHandlersLive` Layer
  over the calculator and content services that `./server` composes.
- `./server`: `TaxKitMcpHttpLayer`, using the HTTP owner's MCP path.
- `./errors`: the safe tool failure `McpToolUnavailable` and the private
  `McpResponseTooLarge` reply-budget signal.

Both handler sets map each owning error by tag with `Effect.catchTags`; the
tool's single declared failure Schema makes a new, unmapped tag a type error.

| `code`                | `retry`                       | Raised for                                                                         |
| --------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| `invalid-calculation` | `check-input-before-retrying` | Input, calculation, unsupported calculator/context and oversized request errors   |
| `not-found`           | `check-input-before-retrying` | A missing documentation page or calculator context for a schema lookup            |
| `rate-limited`        | `wait-then-try-manually`      | The shared calculation allowance is used                                           |
| `capacity-exceeded`   | `try-again-manually`          | Every calculation place is busy                                                    |
| `operation-timeout`   | `try-again-manually`          | The calculation budget, request-body deadline or client ten-second read deadline  |
| `service-unavailable` | `try-again-manually`          | Admission or documentation search is unavailable, or the API gave no usable answer |
| `server-fault`        | `try-again-manually`          | Client handlers only: an API reply that is too large or does not match its Schema  |

An engine defect is not a tool failure: remote MCP answers it with the native
internal error.
- `./schemas`: tool request/reply Schemas and complete-reply
  budget constants.
- `./request`: the private `McpRequestAbortSignal` Context reference.
- `src/cancellation.boundary.ts` (internal): `withMcpRequestCancellation`, which refuses a missing
  capability and interrupts disconnected request work with scoped cleanup.
- `./response-budget`: `withBoundedMcpReply`, which buffers complete native
  JSON/SSE replies within 2 MiB and ten seconds, preserving status and headers.

These exports point at TypeScript source; the package has no build.
There is no duplicate calculator/content service, client or runtime to acquire.
Host integration tests substitute domain Layers and supply a fresh private
cancellation signal.
The host provides native configuration and owns the application scope. The MCP
Layer reads and checks `WEBSITE_PUBLIC_ORIGIN` through Content's
`DocsWebsiteOriginConfig` when registering
its route; the native adapter owns each request's protocol lifetime.

Originless remote clients are accepted. Browser Origins must exactly match the
checked same-stage Website origin. `TaxKitMcpHttpLayer` selects only native
`2026-07-28` with `McpServer.layerHttpRequestScoped`. Registration reuses the
existing calculator/content services; each POST owns its protocol server and
notification consumer until its complete response body has been read. No
request-created consumer remains for a later request to wake. Discovery
advertises `tools.listChanged: false`; subscriptions and legacy sessions are
unsupported. Finite request progress/log notifications remain native and are
buffered with the complete reply. Native Alchemy hosting, request analytics and
private cancellation capability provision remain in
[`apps/api`](../../../apps/api/README.md).

## Documentation impact

The repository [API architecture](../../../docs/architecture/api-and-sdk.md)
and [package ownership](../../../docs/architecture/package-ownership.md) own
the durable transport/app boundary. The API app README owns native hosting;
the Website owns its one root WebMCP registration. Package tests prove the
reply budget, cancellation cleanup and that the client-backed handlers answer
exactly as the service-backed handlers over the actual HTTP routes. The API's official-client tests and
root native-pair MCP tests (`tools/apps-local/test`) retain modern protocol, origin, native callback
progress and isolation proof through the actual app composition.

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
