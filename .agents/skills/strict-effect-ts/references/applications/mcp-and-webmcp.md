# MCP and browser WebMCP

MCP is a server interface for agent tools and resources. WebMCP exposes tools
inside a supporting browser. Share application operations where their meaning
is the same; keep each host's protocol and resource lifetime in its own adapter.
These are optional application capabilities, not required scaffold components.

## One operation, several interfaces

```text
owning Schemas + service operations
  -> HTTP / RPC handlers
  -> shared tool definitions + handlers -> server MCP Layer
                                       -> browser WebMCP registration
```

Use a shared Toolkit for the same tool names, checked inputs, results, failures
and annotations. Provide its handlers with the existing service Layer. Do not
call an HTTP route from the same API server just to reuse policy. In the
Website/API split, browser handlers call the public typed API client using the
checked address from the root loader. Keep authored sources and live backend
implementations out of the browser build.

Keep `McpServer`, server configuration and provider implementations out of the
browser graph. Native MCP tools, resources, templates and prompts compose as
Layers under the server's existing transport. Choose protocol versions and
origin/authentication policy explicitly; static read-only content does not
justify carrying that policy into future authenticated or write tools.

## Separate browser registration from remote access

Register Website WebMCP tools only when the current browser origin equals the
checked Website origin. This controls where the Website installs browser tools;
it does not restrict ordinary server agents adding the public `/mcp` endpoint.

A public, read-only remote MCP endpoint can accept agents without an `Origin`
header and browsers from checked HTTP(S) origins when the repository chooses
broad public access. Reject malformed, opaque `null`, credential-bearing and
non-HTTP(S) origins. Respond with 403 to a present origin rejected by the policy.
Apply CORS to that checked policy, including preflight and actual responses;
do not copy the Website registration allowlist or reflect unchecked input.
Keep credentials disabled for this public-read policy. Origin checks and CORS
are not user authentication; protected data or write tools need their own
explicit access decision. Follow the specification's
[Streamable HTTP security requirements](https://modelcontextprotocol.io/specification/latest/basic/transports/streamable-http).

In rc.117, `McpServer.layerHttp.allowedOrigins` is an exact string list;
`["*"]` is not a wildcard, and an absent list rejects every browser Origin.
Surrounding CORS alone does not change that native admission check. For broad
checked public access, qualify one narrow HTTP host adapter around the shared
native MCP router: inspect and decode the original Origin on every `/mcp`
method first, reject invalid origins, and handle checked preflight before the
native method handler. Only after admission may that adapter remove Origin
from the request supplied to the native router. Keep the original checked
origin for actual-response CORS and `Vary: Origin`, including error responses.
Never strip an unchecked origin or construct a new MCP server for each request.

This rc.117 compatibility adaptation changes only Origin admission. Preserve
the request body, protocol metadata headers, request Scope, cancellation and
response stream. Allow the actual advertised adapters' outgoing preflight
headers: `content-type`, `accept`, `mcp-protocol-version`, `mcp-method`,
`mcp-name`, tracing headers, and exact declared `mcp-param-*` names when used.
Older session adapters also need their actual session headers and exposed
response headers checked. Keep credentials disabled. Test absent, valid and
rejected origins; preflight and actual success/error responses; native version
and header/body disagreement; and cancellation. Requalify or retire this
adaptation when the native Origin API changes. It remains optional design
guidance, not a qualified starter MCP endpoint.

## Qualify the protocol, not just the endpoint

Select supported protocol adapters explicitly from the installed Effect
implementation. The qualified rc.117 includes `McpProtocol.v2026_07_28` and
older adapters such as `McpProtocol.v2025_11_25`. Include older versions only
when their compatibility is intended and tested. Do not relabel an older
implementation with a newer date or maintain a parallel handwritten protocol.

The [2026-07-28 transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
uses per-request version/capability metadata and request-scoped replies. It
does not use the older initialise/session handshake or GET event stream.
Test version rejection, header/body agreement, discovery, a real tool/resource
call and cancellation under every advertised adapter. Test actual outgoing MCP
headers in browser preflight; ordinary HTTP tracing headers alone are not the
complete MCP header set. Recheck the specification and installed implementation
on upgrades and keep dated qualification in the receiving repository.

## Make descriptions describe the actual interface

Generate discovery entries from checked definitions or the live registrations.
Capture the registry service while constructing its owning Layer, then read
registrations when serving the description if sibling Layers populate it.
Do not snapshot an incomplete tool list during concurrent Layer construction.

Compare advertised tools, resources, templates, prompts and capabilities with
the actual protocol responses. An empty-object Schema is not a check that two
capability objects are equal. Preserve strict input policy and referenced JSON
Schema definitions (`$defs`) when describing browser inputs.

Check the installed library's encoder rather than assuming a class Schema and
its wire representation are interchangeable. Contain a required compatibility
projection in the output adapter, reuse checked field Schemas, and record the
affected release and review trigger. Do not solve an encoder fault with a cast,
unchecked JSON or a global relaxation of the Effect policy.

## One private browser host adapter

Expose a named service operation such as `registerTool`, held for an Effect
Scope. Discover browser support inside an Effect, not at module import. Validate
the capability while preserving the original host object: its method may require
that object as `this`. Decoding it into a copied data object can break the call.

Use the host API supported by the installed browser. Compatibility fallback
between `document.modelContext` and older `navigator.modelContext` belongs only
in the private adapter and has an explicit retirement condition.

A missing browser capability is ordinary absence. A supported host that refuses
a tool is a named registration failure with safe bounded detail. Register
independent tools independently; failure or a pending registration of one tool
must not prevent another tool from being attempted. Log real refusals without
throwing away their reason or silently parking an unread failure in an atom.

Confine the unavoidable Promise callback and registration adaptation to that
adapter. Accommodate a synchronous return only when a supported implementation
requires it; do not claim a test stand-in defines the native browser contract.
Use the installed scoped callback bridge, such as `FiberSet.makeRuntimePromise`,
to execute tool calls under the registration's scope. An owned abort signal and
finaliser remove registration and interrupt outstanding work on release.

Decode agent arguments with the owning strict Schema before invoking the
handler. Return safe protocol-shaped results: useful validation details for
invalid input, declared safe domain errors, and a fixed message for unexpected
failures. Keep raw Causes and host/provider payloads out of agent responses.

Use the application's existing browser runtime. For React with Effect Atom,
`Atom.runtime(browserLayers).atom(registerTools)` is mounted through the root
registry and `useAtomMount`. Unmounting owns cleanup; it must not leave registered
tools or running callbacks behind. See [React and TanStack](react-and-tanstack.md).

## A few checks at the owning boundaries

Extend existing service and adapter tests rather than building a separate suite
for each interface. Compare shared tool definitions and representative success
and error results. Exercise an unsupported host, one refused tool, a host method
that reads `this`, and real runtime mount/unmount cleanup. Check framework route
wiring and the built browser imports rather than testing only isolated handlers.

For an important assertion, temporarily introduce the fault it is meant to
catch and confirm it fails, then restore the implementation. Prefer an independent
expected value or a protocol comparison over rebuilding the implementation in
the test. Reuse existing checks that already cover the contract; do not duplicate
them merely to increase a test count.

Keep the evidence stages separate: controlled host tests, registration after
browser hydration, discovery scans, server MCP calls, and tool execution from a
native WebMCP-enabled browser. A scan finding registered names does not prove
that a browser agent can call a tool. Name the missing observation explicitly.

## Public skills and changing specifications

If the application publishes an agent skill, generate it from public content
and shared tool definitions. Keep repository development skills private. Quote
generated frontmatter safely and hash the exact served bytes when an index
declares a digest.

Verify the [WebMCP draft](https://webmachinelearning.github.io/webmcp/) and
[MCP specifications](https://modelcontextprotocol.io/specification) against
installed implementations. Keep draft paths and compatibility workarounds
versioned and reviewable; a third-party checker is not the specification owner.
