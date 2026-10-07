---
document_type: runbook
lifecycle: current
authority: canonical
owner: taxkit-release-readiness-operation-owner
last_reviewed: 2026-10-07
review_trigger: release graph, current or historical journey inventory, proof schema, package graph, or accepted HGI-203 evidence change
---

# Release readiness

Owner: `taxkit-release-readiness-operation-owner`

## Identity and resource scope

This runbook evaluates one identified local TaxKit candidate and the six current
consumer-visible journeys. The retained HGI-203 packet owns its separate exact
five-journey historical contract. It may write ignored local proof and an explicitly
scoped candidate packet. It does not include versioning or any external state.

## Preconditions

- Read `docs/evidence/releases/HGI-203-local.json`,
  `docs/evidence/releases/HGI-203-critical-journeys.json`,
  `docs/verification/critical-journeys.json`,
  `docs/evidence/releases/HGI-203-accepted-attempt.json`,
  `docs/evidence/releases/HGI-203-failed-attempts.json`, and
  `docs/documentation-audit/HGI-203-validation.json` as one accepted handoff.
- Confirm the packet is `accepted`, its attempt succeeded once, its exact
  summary, historical journey snapshot, content manifest, hashes and attempt ID
  reconcile, and failed provenance remains retained. The historical snapshot's
  SHA-256 must equal the packet's original `journeyInventorySha256`; the
  evolving current inventory is decoded independently and is not attributed to
  the old attempt.
- A new run requires a new schema-valid `candidate` packet and content manifest;
  never substitute `tmp/**`, a candidate, failed, superseded, inconclusive, or
  stale/hash-mismatched record for accepted proof.
- Report-only CI mode is distinct from a candidate attempt. It requires no
  candidate packet, reads or writes no candidate/attempt receipt, and makes no
  candidate claim.
- Eligible deterministic checks run through Turbo. Remote caching is optional
  acceleration; a miss, missing token or unavailable service must leave the
  complete local graph runnable.
- Token-bearing same-repository pull requests and `main` use remote read/write.
  Fork pull requests receive no repository token and must keep using the full
  local fallback. Never change this route to `pull_request_target` merely to
  make remote caching available to a fork.
- Do not cache `node_modules`. Bun's package-download cache may accelerate the
  live `bun install --frozen-lockfile`; it must not replace that install.

## Authority

Local read, test, build and ignored proof writes are allowed only within the
attached task. The [authority model](../operations/authority-model.md) governs
everything else. An accepted packet proves an observation, not authority.

## Procedure

1. Run `bun run check:runbooks`; resolve every exact-target diagnostic before
   using this procedure.
2. For an existing immutable attempt, run
   `RELEASE_ATTEMPT_PATH=<repository-relative-receipt.json> RELEASE_ATTEMPT_SHA256=sha256:<64-hex-digest> bun run release:present`.
3. Run the focused boundary suite with `bun run test:release-readiness`.
4. Run the repository graph with `bun run verification`.
5. To validate only the checked-out CI revision, run `bun run release:check --
   --ci`. Its nine-check report may be repeated after a material revision or
   environment change, but cannot be promoted into candidate or release proof.
   Local runs use local Turbo caching. Do not provide direct `TURBO_TEAM` or
   `TURBO_TOKEN` values. Trusted GitHub runs get those values only from the
   fixed `taxkit/ci` Doppler bridge.
   The `docs-browser` check executes `bun run web:test:native-pair`: it freshly
   builds the native API/Website and runs all native cases, including
   accepted pages, navigation, private server calls, search, Markdown, images,
   keyboard/focus/landmarks/contrast/reduced-motion and safe recovery. It no
   longer executes the old app browser command.
   Save the returned `PASS` lines and verify their exact stdout/stderr paths
   and hashes before citing details. Do not infer a run from directory recency,
   a shared check ID or nearby creation time: a test fixture may produce its
   own later detail. CI output remains a bounded report, not an attempt receipt.
6. Only for an explicitly prepared new candidate, run `bun run release:check`
   once. Do not rerun merely to improve presentation or conceal a failure.
7. Preserve the immutable attempt, bounded summary, candidate identity,
   limitations and failed-attempt provenance; request independent acceptance.

## Evidence and postcondition

Candidate mode's postcondition is one identified candidate, one immutable
terminal attempt, exact journey outcomes, sanitized bounded evidence, and no
false-success state. CI mode's postcondition is only a bounded nine-check report
for the checked-out revision, with no candidate or attempt receipt.
The accepted HGI-203 packet, its exact historical journey snapshot, accepted
summary, failed provenance and validation receipt remain the canonical
historical handoff. The current journey inventory remains the canonical owner
for new local verification and future candidates.

## Rollback

If candidate code is rejected, revert the identified semantic candidate while
retaining accepted, failed, superseded and inconclusive evidence. Never delete
or rewrite an immutable attempt to make a later run appear successful.
To undo the current documentation check selection, restore the graph command,
Quality Playwright owner/policy, current journey/profile and their guides
together at the receipt's base revision. The old app and its deployment
procedure remain retained pending their own replacement; this local check
change does not redirect or roll back a provider.

If the journey-epoch migration is reverted, revert its snapshot, contract,
validator and documentation changes together; do not modify the original
packet, summaries, manifests or validation receipt.

## Escalation

Escalate mismatched snapshot hashes, a current inventory substituted for a
historical one, missing detail, unknown terminal state, stale candidate
identity, unredacted sensitive data, or an authority request to the requesting
repository owner. Include exact artifact, last successful step, recovery hint
and non-claims.

## Stop conditions

Stop before `versioning`, `commit`, `push`, `tag`, `release`, `registry-publication`,
`deployment`, `provider-access`, or `recovery-mutation` whenever the named
principal and full authority receipt are absent. Also stop when accepted proof
does not reconcile or the candidate identity was already consumed.

## Limitations

Local commands do not observe a registry, Git provider, deployment provider,
external consumer, deployed SSR/hydration, or public availability. Ignored raw
detail is not clean-clone proof. The retained HGI-203 snapshot proves only the
journey contract that its original attempt observed; it does not qualify later
journey changes.

## Non-claims

Completing this runbook does not claim package publication, a tag or release,
Git publication, deployment, provider state, or external availability.
Preserving the historical snapshot does not fabricate a new attempt or claim
that HGI-203 exercised the current docs harness.
