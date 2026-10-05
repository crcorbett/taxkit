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
It owns the versioned calculation connection, thin handlers and checked clients.
Tax definitions and calculation remain with `@taxkit/calculators` and rule
packages. Both native app candidates now consume it. T003's bounded local
connection acceptance is complete; T009 still owns safe exported tracing.

## Exports

- `./group`: native `Calculate` procedure and `TaxKitRpcGroup`.
- `./schemas`: calculator-owned request/result and content-owned navigation/path
  Schemas, checked API origin, contract version and five-second deadline.
- `./errors`: bounded expected, unavailable, invalid-response and deadline errors.
- `./handlers`: handler Layer calling `PublicCalculatorService.calculate` once.
- `./service`: closed `TaxKitRpcClient.calculate` client contract.
- `./server`: native POST `/rpc` Layer with JSON serialisation and checked ingress.
- `./live`: configured protocol Layer with a native client scope per calculation;
  the app supplies its HttpClient.
- `./test`: explicit test-only in-process client over the same handler.
- `./testing/fixtures`: deterministic real-calculator and failure fixtures only.
- `./request-boundary`: shared native POST body limit, one MiB and five seconds.
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

The private reply codec marks only failures decoding the native calculation exit.
Bad JSON and invalid result shapes become `CalculatorRpcInvalidResponse`.
An unrelated adapter defect retains its identity; defects remain defects.
The native exit/defect Schema identities and these paths are qualified on
Effect 4.0.0, whose RPC APIs remain marked unstable. Requalify on upgrades.

A single five-second budget includes headers and complete body decoding. Earlier
caller interruption releases pending body work. Client resources belong to the
calculation scope; the protocol configuration belongs to the caller Layer.
This package creates no runtime or Layer during calculation. A native Worker
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
five-second headers/body budget and browser abort after a deadline, editing or
browser Back leaving the form. Its upstream artificial stream can continue;
remote-operation cancellation is not established. Retained tax results remain unchanged; Medicare correction
is a separate unresolved decision. The canonical render receipt records its
original scaffold and explicit stable-version adaptation; structural validation
alone does not prove runtime behaviour.
