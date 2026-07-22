---
document_type: runbook
lifecycle: current
authority: canonical
owner: taxkit-release-readiness-operation-owner
last_reviewed: 2026-07-22
review_trigger: release graph, journey inventory, proof schema, package graph, or accepted HGI-203 evidence change
---

# Release readiness

Owner: `taxkit-release-readiness-operation-owner`

## Identity and resource scope

This runbook evaluates one identified local TaxKit candidate and the five
consumer-visible journeys. It may write ignored local proof and an explicitly
scoped candidate packet. It does not include versioning or any external state.

## Preconditions

- Read `docs/evidence/releases/HGI-203-local.json`,
  `docs/verification/critical-journeys.json`,
  `docs/evidence/releases/HGI-203-accepted-attempt.json`,
  `docs/evidence/releases/HGI-203-failed-attempts.json`, and
  `docs/documentation-audit/HGI-203-validation.json` as one accepted handoff.
- Confirm the packet is `accepted`, its attempt succeeded once, its exact
  summary, journey inventory, content manifest, hashes and attempt ID reconcile,
  and failed provenance remains retained.
- A new run requires a new schema-valid `candidate` packet and content manifest;
  never substitute `tmp/**`, a candidate, failed, superseded, inconclusive, or
  stale/hash-mismatched record for accepted proof.
- Report-only CI mode is distinct from a candidate attempt. It requires no
  candidate packet, reads or writes no candidate/attempt receipt, and makes no
  candidate claim.

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
6. Only for an explicitly prepared new candidate, run `bun run release:check`
   once. Do not rerun merely to improve presentation or conceal a failure.
7. Preserve the immutable attempt, bounded summary, candidate identity,
   limitations and failed-attempt provenance; request independent acceptance.

## Evidence and postcondition

Candidate mode's postcondition is one identified candidate, one immutable
terminal attempt, exact journey outcomes, sanitized bounded evidence, and no
false-success state. CI mode's postcondition is only a bounded nine-check report
for the checked-out revision, with no candidate or attempt receipt.
The five handoff paths above remain the canonical accepted HGI-203 evidence.

## Rollback

If candidate code is rejected, revert the identified semantic candidate while
retaining accepted, failed, superseded and inconclusive evidence. Never delete
or rewrite an immutable attempt to make a later run appear successful.

## Escalation

Escalate mismatched hashes, missing detail, unknown terminal state, stale
candidate identity, unredacted sensitive data, or an authority request to the
requesting repository owner. Include exact artifact, last successful step,
recovery hint and non-claims.

## Stop conditions

Stop before `versioning`, `commit`, `push`, `tag`, `release`, `registry-publication`,
`deployment`, `provider-access`, or `recovery-mutation` whenever the named
principal and full authority receipt are absent. Also stop when accepted proof
does not reconcile or the candidate identity was already consumed.

## Limitations

Local commands do not observe a registry, Git provider, deployment provider,
external consumer, deployed SSR/hydration, or public availability. Ignored raw
detail is not clean-clone proof.

## Non-claims

Completing this runbook does not claim package publication, a tag or release,
Git publication, deployment, provider state, or external availability.
