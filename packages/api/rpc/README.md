---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-api-rpc-owner
last_reviewed: 2026-10-06
review_trigger: RPC contracts, native codecs, clients, handlers, exports or transport proof change
---

# `@taxkit/api-rpc`

Private compiled Effect 4 RPC transport over the existing calculator service.
It owns the complete nine named calculator-service operations, their revision agreement, thin handlers and checked clients.
Tax definitions and calculation remain with `@taxkit/calculators` and rule
packages. Both native app candidates now consume it. T003's bounded local
connection acceptance is complete; T009 still owns safe exported tracing.

## Exports

- `./group`: all nine native procedures and `TaxKitRpcGroup`.
- `./schemas`: calculator-owned request/result/catalogue/query and content-owned navigation/path
  Schemas, checked API origin, contract version and ten-second deadline.
- `./errors`: bounded expected, unavailable, invalid-response and deadline errors.
- `./handlers`: handler Layer calling the corresponding named calculator service operation once.
- `./service`: closed named client matching the existing calculator service.
- `./server`: native POST `/rpc` Layer with JSON serialisation and checked ingress.
- `./live`: configured protocol Layer with a native client scope per named operation;
  the app supplies its HttpClient.
- `./test`: explicit test-only in-process client over the same handler.
- `./testing/fixtures`: deterministic real-calculator and failure fixtures only.
- `./request-boundary`: shared native POST body limit, 64 KiB and five seconds.
- `./host-telemetry`: API/Website log and reporter containment with fixed fields.

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
payload failures use the procedure defect encoder.
A supported codec hook replaces that path's encoding with a fixed safe value;
the procedure also declares a safe defect Schema. No message framing is invented.

The private reply codec marks only failures decoding any declared native operation exit.
Bad JSON and invalid result shapes become `CalculatorRpcInvalidResponse`.
An unrelated adapter defect retains its identity; defects remain defects.
The native exit/defect Schema identities and these paths are qualified on
Effect 4.0.0, whose RPC APIs remain marked unstable. Requalify on upgrades.

A single ten-second budget includes headers and complete body decoding. Earlier
caller interruption releases pending body work. Client resources belong to the
operation scope; the protocol configuration belongs to the caller Layer.
This package creates no runtime or Layer during any operation. A native Worker
can suspend between requests, so a receive loop acquired by an earlier request
must not be retained for later calls. Public calls omit credentials and reject
redirects. The native HTTP transform sets exactly `/rpc`, avoiding the default
empty-path client's `/rpc/` redirect. RPC and HTTP tracing are both disabled for
this transport; the tests check actual native request headers. The Website's
saved local pair test also checks real browser enforcement and CORS.

## Documentation impact

The repository [transport architecture](../../../docs/architecture/api-and-sdk.md),
[package ownership](../../../docs/architecture/package-ownership.md),
[quality guide](../../../docs/architecture/testing-and-quality.md) and active
[execution plan](../../../docs/exec-plans/active/clean-slate-foundation.md) own the
wider design and proof limits. Reusable content operations remain with T005;
re-exported content Schemas do not mount authored content in the browser.

Run `bun run --filter=@taxkit/api-rpc test`, `check-types` and `build` for focused
proof. Root verification also checks source/export direction, actual lint
permissions and current documentation.

## Runbook applicability

No provider operation is introduced by this package. Repository app/infrastructure
runbooks gain matching-stage host instructions when those hosts are implemented.
This package does not authorise a plan, deployment or secret access.

## Non-claims

Unit transport proof alone is not Worker, Website, binding or browser proof.
The Website's local pair receipt separately records its native built artifacts
and real Chromium journey. Neither proves a provider, telemetry backend or
deployed calculation. The saved native RPC failure test now checks actual built global, procedure and
fatal replies, checked service/version errors, and a damaged valid-JSON reply
through the Website binding and Chromium form. Separate removal checks disable
the native global/procedure encoder or reply decoder and require the saved test
to fail, then restore source and compiled dependencies. This does not complete
trace-export proof. The native cancellation test separately qualifies the complete
ten-second headers/body budget and browser abort after a deadline, editing or
browser Back leaving the form. Its upstream artificial stream can continue;
remote-operation cancellation is not established. Retained tax results remain unchanged; Medicare correction
is a separate unresolved decision. The canonical render receipt records its
original scaffold and explicit stable-version adaptation; structural validation
alone does not prove runtime behaviour.

The catalogue operation reads `MetadataQuery` and returns the canonical
`CalculatorCatalogResponse` through the same calculator service. It carries no
pay figures and runs no calculation. All nine declared procedures use the existing
version, body/batch limits, safe error/defect encoding, operation-scoped native
client, complete response deadline and credential/redirect/tracing policy.
The major Changeset records the complete required method set and revision 3;
it performs no versioning or publication. Complete package/transport/domain
qualification remains T004 work.

The streamed native POST reader and native RPC byte admission share the same
64 KiB constant. The check counts encoded bytes, including multi-byte text,
rather than characters or a claimed content length. Exactly 64 KiB is accepted;
a stream crossing the limit stops before reading its remaining tail. The
five-second body-read deadline now returns fixed checked JSON 413/408 guidance.
The owning export is `@taxkit/api-http/request-boundary`; this package preserves
its original compatibility re-export. The retained standalone HTTP server uses
the same body owner. All nine service calls have the shared five-second operation
budget; metadata uses no calculation place. Per-client rate limits and later MCP
envelopes remain active T004/T006 work. A custom RPC-only host must supply its
request-admission middleware; the native API host applies it outside both routes.

The private client checks HTTP status before reading a rejected body. Status
408, 413 and 429 become distinct checked errors with fixed safe codes, literal
messages and manual retry guidance. Other unsuccessful statuses remain
unavailable. The request is scoped through headers and bounded body reading,
then released before native RPC decoding. No automatic calculation retries.

All nine closed JSON operations count encoded response bytes before materialisation
and accept at most 2 MiB, including native envelopes and JSON whitespace. This
shared channel limit also protects calculator replies; the accepted SPEC records
why. A crossing chunk stops the source before its tail. Content-Length cannot
bypass it. Exact-limit valid native replies to every named operation must decode;
multi-byte and progressive oversized replies return the checked size error.
The decoder and unrelated-defect identity rules remain unchanged. This does not
qualify future framed/streaming MCP replies or public SDK transport policy.

The [shared work policy](../../../packages/calculators/README.md#shared-calculation-work-limits) gives the API instance one eight-calculation pool
across HTTP and RPC, including individual batch messages, with a five-second
calculation budget. Checked capacity and operation-timeout errors become HTTP
503/504 envelopes or canonical RPC revision `3` errors. Website guidance requests
manual retry only. This is separate from the body-read and ten-second client
budgets. Metadata does not use a calculation place. Native built proof covers a
seven-calculation RPC batch plus one HTTP calculation, rejected extra HTTP/SSR/
browser calls, HTTP 504/RPC timeouts and reached cleanup. Synchronous CPU work
cannot be stopped by a JavaScript timer; a late-result check rejects it after
control returns. Rate identity, per-client rate limits, MCP and full T004
qualification remain unfinished.


## Complete named operation contract

Revision `3` exposes the existing calculation, calculator detail/schema/graph,
catalogue, facts, rules, jurisdictions and tax-year operations. Each handler
calls its corresponding application operation once. Request/result Schemas
come from the calculator owner; no alternate metadata or calculation model is
created. Revisions `1` and `2` are rejected before reaching the service. The
required methods added to the closed service contract have a major Changeset.

The group itself supplies the allowed native procedure tags and owning exit
Schemas. One private concrete Effect transformation owns each generated native
client scope, the ten-second complete-response deadline, credential/redirect/
tracing policy and safe transport failure projection. It accepts an already
constructed native operation Effect and exposes no raw-client callback.
Request-error projection is reused only by the four methods whose existing
calculator contract can fail that way. Defects remain defects with fixed safe
wire values. The 2 MiB reader applies to every reply; calculations do not retry.

The saved RPC corpus checks every named call for bad JSON/result shapes, exact
and exceeded response size, rejected status, deadline, interruption, caller
scope cleanup, fetch policy and old revisions. Native built-Worker proof checks
all seven new metadata calls as well as retained catalogue/calculation journeys.
Full qualification is recorded in the [dated receipt](../../../docs/documentation-audit/clean-slate-foundation/2026-10-06-closed-rpc-operations.json).
Remaining body/work/rate and whole T004 requirements are separate; this slice
adds no rate identity, metadata operation budget, MCP or provider operation.


Calculator-owned context, help and filter fields use `Option<Option<A>>` in
checked TypeScript values: `None` means a missing key, `Some(None)` means a
present undefined key, and `Some(Some(value))` means a present value. Owning
constructors default omitted keys to `None`. JSON and HTTP query fields retain
their ordinary optional representation. Flatten the two absent forms only where
they mean the same thing; do not invent a jurisdiction or tax year.

Native RPC serialisation applies the owning request codecs. Test messages built
through an unknown JSON fixture must encode the canonical request first. The
wire contract and current revision retain their existing fields and values.
