---
document_type: runbook
lifecycle: current
authority: canonical
owner: taxkit-versioning-operation-owner
last_reviewed: 2026-07-22
review_trigger: Changesets configuration, package graph, release train, or authority change
---

# Versioning

Owner: `taxkit-versioning-operation-owner`

## Identity and resource scope

This runbook scopes a named TaxKit package/version train in one local checkout.
It owns Changesets-driven manifest and changelog mutation, not Git publication,
registry publication, tags, releases or deployment.

## Preconditions

Read `.changeset/config.json`, `docs/standards/versioning.md`, and
`docs/operations/authority-model.md`. Identify the exact packages, intended
semver impact, current changesets, clean candidate identity and rollback diff.

## Authority

The principal for versioning is currently unknown. Inspection may run, but
mutation requires a per-run receipt naming principal, packages, versions,
environment, approval boundary, duration/revocation, audit evidence, rollback
precondition and escalation owner.

## Procedure

1. Inspect planned releases with `bun run changeset status --verbose`.
2. Compare each planned bump with the public contract change and required
   package-facing Changeset; stop on missing or contradictory intent.
3. Capture pre-mutation manifests, changelogs and candidate identity.
4. Only after the authority receipt is complete, run
   `bun run version-repo` exactly once.
5. Review the exact diff, rerun focused package proof and record postcondition.
   Hard-stop any later commit, push, tag, hosted release or registry operation
   until a future target-specific runbook and its authority receipt exist.

## Evidence and postcondition

Evidence is the authority receipt, before/after Changeset status, exact changed
manifests/changelogs and focused consumer proof. Success means the authorized
version train alone changed and its package contract remains valid.

## Rollback

Before mutation, identify the exact manifest/changelog diff that can be
reverted without discarding unrelated work. If the postcondition fails, stop,
retain the receipt and revert only the authorized versioning slice.

## Escalation

Escalate missing Changesets, ambiguous semver impact, unexpected packages,
dirty overlapping files or absent authority to the requesting repository owner.
Include the exact planned package/version set and unchanged external-state
non-claims.

## Stop conditions

Stop before `versioning`, `commit`, `push`, `tag`, `release`, `registry-publication`,
`deployment`, `provider-access`, or `recovery-mutation` when the corresponding
principal or authority receipt is absent. In particular, do not run the
versioning command while the principal remains unknown.

## Limitations

Changesets and local diffs do not prove Git publication, registry contents,
consumer installation, release creation or deployment.

## Non-claims

This procedure does not authorize or claim a commit, push, tag, hosted release,
registry publication, deployment or provider change.
