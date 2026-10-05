---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-api-rpc-owner
last_reviewed: 2026-10-05
review_trigger: RPC contracts, native codecs, clients, handlers, exports or transport proof change
---

# `@taxkit/api-rpc`

Private compiled Effect 4 RPC transport over the existing calculator service.
It owns versioned calculation and catalogue operations, thin handlers and checked clients.
Tax definitions and calculation remain with `@taxkit/calculators` and rule
packages. Both native app candidates now consume it. T003's bounded local
connection acceptance is complete; T009 still owns safe exported tracing.

## Exports

- `./group`: native `Calculate` and `ListCalculators` procedures and `TaxKitRpcGroup`.
- `./schemas`: calculator-owned request/result/catalogue/query and content-owned navigation/path
  Schemas, checked API origin, contract version and ten-second deadline.
- `./errors`: bounded expected, unavailable, invalid-response and deadline errors.
- `./handlers`: handler Layer calling the corresponding named calculator service operation once.
- `./service`: closed `TaxKitRpcClient.calculate` and `listCalculators` client contract.
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

The private reply codec marks only failures decoding either declared native operation exit.
Bad JSON and invalid result shapes become `CalculatorRpcInvalidResponse`.
An unrelated adapter defect retains its identity; defects remain defects.
The native exit/defect Schema identities and these paths are qualified on
Effect 4.0.0, whose RPC APIs remain marked unstable. Requalify on upgrades.

A single ten-second budget includes headers and complete body decoding. Earlier
caller interruption releases pending body work. Client resources belong to the
operation scope; the protocol configuration belongs to the caller Layer.
This package creates no runtime or Layer during either operation. A native Worker
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
pay figures and runs no calculation. Both declared procedures use the existing
version, body/batch limits, safe error/defect encoding, operation-scoped native
client, complete response deadline and credential/redirect/tracing policy.
No generic callback or new message protocol is introduced. A minor Changeset
records this private package interface addition; it performs no versioning or
publication. Complete package/transport/domain qualification remains T004 work.

The streamed native POST reader and native RPC byte admission share the same
64 KiB constant. The check counts encoded bytes, including multi-byte text,
rather than characters or a claimed content length. Exactly 64 KiB is accepted;
a stream crossing the limit stops before reading its remaining tail. The
five-second body-read deadline and empty 413/408 replies are preserved. Common work/rate/concurrency limits and later MCP envelopes remain active T004/T006 work. This native
boundary does not claim the retained standalone Bun HTTP server has the same
admission policy.

The private client checks HTTP status before reading a rejected body. Status
408, 413 and 429 become distinct checked errors with fixed safe codes, literal
messages and manual retry guidance. Other unsuccessful statuses remain
unavailable. The request is scoped through headers and bounded body reading,
then released before native RPC decoding. No automatic calculation retries.

Both closed JSON operations count encoded response bytes before materialisation
and accept at most 2 MiB, including native envelopes and JSON whitespace. This
shared channel limit also protects calculator replies; the accepted SPEC records
why. A crossing chunk stops the source before its tail. Content-Length cannot
bypass it. Exact-limit valid native calculator/catalogue replies must decode;
multi-byte and progressive oversized replies return the checked size error.
The decoder and unrelated-defect identity rules remain unchanged. This does not
qualify future framed/streaming MCP replies or public SDK transport policy.
