# HTTP, RPC, and Serialisation

## Outbound HTTP

Use Effect Platform HttpClient or a private provider adapter.

For each operation:

1. construct path/query/header/body from branded domain input;
2. encode body with Schema;
3. keep credentials redacted until the request boundary;
4. set one timeout for headers and complete body decoding, plus redirect policy;
5. classify transport/status failures;
6. decode response body with Schema;
7. scope streaming bodies;
8. add span and safe attributes.

Do not use global `fetch` in domain code. If a host supplies fetch, provide it as the platform HttpClient Layer.

## Status handling

Map status/code to a closed domain vocabulary. Do not accept every 2xx response without decoding. Do not turn every non-2xx into one string error.

Handle redirects intentionally:

- follow when the operation contract permits;
- inspect manually for redirect proof/auth flows;
- reject unexpected cross-origin redirects;
- never log sensitive Location query values.

## Inbound HTTP

At the route boundary:

- decode path, query, headers, cookies, and body;
- enforce size limits;
- construct a named domain operation;
- map tagged errors exhaustively to protocol errors;
- encode response through Schema;
- set headers/cookies through typed protocol facilities;
- execute in the incoming native Effect request fibre when the host supplies one;
- otherwise bridge only at the application-owned host runner.

Do not pass a raw Request into the domain service.

For a native Alchemy HTTP host, keep its HttpEffect contract and let the host
adapt routing failures, defects and cancellation. Do not replace all failures
with 500: a missing route must still return 404. Test the native host adaptation
and select safe ErrorReporter fields separately from the response mapping.

## RPC

Define RPC procedures from shared Schemas and tagged serialisable errors. Keep transport details out of the domain service.

Require:

- request/response Schema;
- error Schema;
- authentication/authorisation boundary;
- deadline/cancellation propagation;
- versioning;
- payload limits;
- observability safe fields.

Do not expose arbitrary Effect Causes or unencoded class instances over RPC.
Declared Schema-tagged errors are encoded on the wire and decoded by clients.

## Shared client contract

Keep native generated clients private to semantic client Layers. HTTP and RPC
clients implement the same domain service contract as the backend. Decode
expected backend failures with the shared Schema and map connection or invalid
reply failures to distinct named domain-access errors. No protocol error or
unchecked provider payload leaks into UI policy.

Test syntactically valid replies with the wrong payload Schema, as well as
broken JSON. In the qualified rc.117, native RPC reply decoding can produce a
SchemaError defect. The private client marks failure inside only the native
exit reply codec's decoder, before native RPC converts that failure to a
defect. Its semantic operation translates only that private marker to the named
invalid-response error. Keep the native Schemas, Ndjson parser, Protocol and
client; do not replace them with a handwritten protocol.

Never infer reply failure from the SchemaError class alone. An unrelated
transport or request encoder can fail with that same class and must keep its
original defect identity. Test both reads with bad native replies and an
unrelated adapter SchemaError. Preserve caller interruption and other defects;
do not turn every Cause into an expected failure. Requalify the cached native
exit Schema identity and reply decoder behaviour on Effect upgrades before
retaining or removing this compatibility handling.

For public, unauthenticated browser reads, omit credentials and reject redirects
so a checked API address cannot silently send the browser somewhere else.
Supply native Fetch RequestInit policy when the operation executes, not only
while constructing its Layer. Protected clients need their own explicit policy.

A selecting field can identify a response union. Native generation alone does
not give a dependent return type: check the selected response Schema before
narrowing literal/default inputs. See the [format-selected example](../examples/format-selected-client.md).

For browser clients, test CORS preflight with the actual native request headers.
In the qualified Effect version this includes b3 and traceparent. A successful
server request is not browser-access proof. Remote MCP and Website WebMCP have
separate Origin policies; do not inherit one policy from the other.

## Serialisation

Values crossing a process/runtime/hydration boundary must be encoded.

Watch:

- Dates/instants;
- Option/Result;
- branded values;
- big integers;
- Maps/Sets/Chunks;
- tagged errors;
- URLs;
- Redacted;
- binary data;
- cyclic values.

Never assume JSON.stringify preserves domain semantics. Use Schema transformations and a versioned envelope.

## Streaming HTTP/RPC

Use Stream for actual incremental bodies/messages. Scope the response body and propagate cancellation. Define framing, maximum frame size, decode failure, heartbeat, and reconnection.

Do not buffer a full stream into text/JSON and still claim streaming.

## Testing

Provide controlled HttpClient/fetch Layers. Assert:

- encoded request;
- secret header redaction;
- redirect policy;
- status/error mapping;
- invalid JSON/body;
- whole-read deadline before headers and while decoding a stalled body;
- earlier caller interruption and request/body finalisation;
- retry policy;
- serialisation round-trip;
- no live network in unit tests.
