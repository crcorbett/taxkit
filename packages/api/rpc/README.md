---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-api-rpc-owner
last_reviewed: 2026-10-13
review_trigger: RPC contracts, native codecs, clients, handlers, exports or transport proof change
---

# `@taxkit/api-rpc`

Private compiled Effect 4 RPC transport over the existing calculator and content
services. It owns nine calculator operations at revision `4` and five
documentation operations at revision `2`, their thin handlers, the native POST
`/rpc` server Layer with JSON framing, and checked RPC clients. Tax definitions
and calculation stay with `@taxkit/calculators` and the rule packages.

The native API serves this protocol for machine callers. The Website does not
use it: it reads the API through the generated HTTP client. The client Layers
here are the package's checked RPC clients, used by its own tests, the
Website's native tests and other machine callers.

## Exports

- `./group`: the nine calculator procedures, `TaxKitRpcGroup` and the combined
  `TaxKitPublicRpcGroup` used by the server.
- `./schemas`: calculator-owned request/result/catalogue/query Schemas, the
  checked API origin, contract version, ten-second deadline and 2 MiB reply
  limit.
- `./errors`: bounded expected, unavailable, invalid-response and deadline errors.
- `./handlers`: handler Layer calling the corresponding named calculator service operation once.
- `./service`: closed named client contract matching the calculator service.
- `./server`: native POST `/rpc` Layer with JSON serialisation and checked ingress;
  requires supplied `PublicCalculatorService`, `ContentService` and
  `ContentDiscovery`.
- `./live`: the calculator RPC client Layer; the caller supplies its HttpClient.
- `./test`: explicit test-only in-process client over the same handler.
- `./testing/fixtures`: deterministic real-calculator and failure fixtures only.
- `./request-boundary`: re-export of the 64 KiB, five-second POST body limit
  owned by `@taxkit/api-http/request-boundary`.
- `./host-telemetry`: API/Website log and reporter containment with fixed
  fields, and `observeHostRequest`, the one checked `taxkit.request` record per
  request (service, closed route family, method, outcome, status and
  response-ready time). The Axiom dashboards read these names.
- `./content/*`: the documentation group, Schemas, errors, client contract,
  handlers, client Layer and test Layer.

Workspace source conditions resolve `src`; ordinary imports and declarations
resolve `dist`. Build with `bun run --filter=@taxkit/api-rpc build`. This private
package has no public publisher or packed-consumer claim.

## Failure and lifetime ownership

The handler projects calculator errors to a fixed reason without reflecting
private issue paths, causes or messages. Contract version disagreement has its
own checked error. The server uses the native JSON parser/encoder and validates
its unknown request envelopes before native dispatch. Only bounded request IDs,
the declared procedure, a bounded batch and correctly shaped headers pass.
Malformed JSON/envelopes use the native global defect path; decoded procedure
payload failures use the procedure defect encoder. A supported codec hook
replaces that path's encoding with a fixed safe value; the procedure also
declares a safe defect Schema. No message framing is invented.

The private reply codec marks only failures decoding a declared native
operation exit. Bad JSON and invalid result shapes become
`CalculatorRpcInvalidResponse`. An unrelated adapter defect retains its
identity; defects remain defects. These paths are qualified on Effect 4.0.0,
whose RPC APIs remain marked unstable; requalify on upgrades.

The clients give each call one ten-second budget covering headers and complete
body decoding, and read at most 2 MiB of encoded reply, stopping before an
oversized tail. HTTP 408, 413 and 429 become distinct checked errors with fixed
codes and manual-retry guidance; other unsuccessful statuses are unavailable.
Client resources belong to the operation; caller interruption releases pending
body work. Calls omit credentials, reject redirects, set exactly `/rpc` and
disable tracing headers. No call retries.

## Request admission and work limits

The 64 KiB body limit is shared with the HTTP owner and counts encoded bytes,
including multi-byte text. The native API applies it outside both HTTP and RPC;
a custom RPC-only host must supply its own request-admission middleware. The
[shared work policy](../../../packages/calculators/README.md#shared-calculation-work-limits)
gives the API instance one eight-calculation pool across HTTP and RPC, including
individual batch messages, with a five-second operation budget for all nine
methods. Capacity and timeout errors are canonical revision `4` errors. Metadata
uses no calculation place. Synchronous CPU work cannot be stopped by a
JavaScript timer; a late-result check rejects it after control returns.

## Complete named operation contract

Revision `4` exposes the calculation, calculator detail/schema/graph,
catalogue, facts, rules, jurisdictions and tax-year operations. Each handler
calls its corresponding application operation once. Request/result Schemas
come from the calculator owner; no alternate metadata or calculation model is
created. Older revisions are rejected before reaching the service.

The group supplies the allowed native procedure tags and owning exit Schemas.
One private Effect transformation owns each generated native client scope, the
complete-response deadline, credential/redirect/tracing policy and safe
transport failure projection. It exposes no raw-client callback.

Calculator-owned context, help and filter fields use `Option<Option<A>>` in
checked TypeScript values: `None` means a missing key, `Some(None)` means a
present undefined key, and `Some(Some(value))` means a present value. JSON keeps
its ordinary optional representation. Native RPC serialisation applies the
owning request codecs; test messages built from unknown JSON must encode the
canonical request first.

## Native calculation rate admission

Revision `4` preserves canonical `CalculatorRateLimited` and
`CalculatorAdmissionUnavailable` alongside the other expected errors. The API
shares the [calculator-owned rate contract](../../calculators/README.md#native-calculation-rate-admission)
across HTTP and RPC; each batch calculation takes one unit and metadata takes
none. Edge rate identity belongs to the API app (`api/edge-identity`), separate
from RPC request JSON, and is never an analytics identifier.

## Documentation connection

`./content/group`, `./content/schemas`, `./content/errors`, `./content/service`,
`./content/handlers`, `./content/live` and `./content/test` own five named calls:
`getNavigation`, `getPage`, `getMarkdown`, `searchPages` and `getDiscovery`.
Their native procedure tags are `GetDocsNavigation`, `GetDocsPage`,
`GetDocsMarkdown`, `SearchDocsPages` and `GetDocsDiscovery`. The combined server
group admits these beside the nine calculator procedures. Documentation calls
require revision `2` and fail with `DocsRpcVersionMismatch` during version
skew. There is no automatic retry or backend fallback.

The documentation client uses the same checked API origin, deadline, 2 MiB
reader and request policy as the calculator client. Handlers capture the
supplied `ContentService` and `ContentDiscovery` once. Missing-page, search and
discovery failures use the content owner's fixed errors; discovery accepts only
a closed file address, and the client checks that the returned file matches.
This package imports only compiled content contracts.

## Checks

Run `bun run --filter=@taxkit/api-rpc test`, `check-types` and `build`. The
package tests cover every named call for bad JSON/result shapes, exact and
exceeded reply size, rejected status, deadline, interruption, scope cleanup,
fetch policy and old revisions. The Website's native tests exercise these
clients against the built API Worker. Unit transport tests alone are not Worker
or deployment checks.

No provider operation is introduced by this package. See
[API and SDK](../../../docs/architecture/api-and-sdk.md) and
[package ownership](../../../docs/architecture/package-ownership.md).
