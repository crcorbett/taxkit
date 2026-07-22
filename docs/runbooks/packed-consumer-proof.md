---
document_type: runbook
lifecycle: current
authority: canonical
owner: taxkit-packed-consumer-operation-owner
last_reviewed: 2026-07-22
review_trigger: SDK source, export map, packed file set, package manifest, or downstream fixture change
---

# Packed-consumer proof

Owner: `taxkit-packed-consumer-operation-owner`

## Identity and resource scope

This runbook validates the locally packed `@taxkit/sdk` artifact and a fresh
downstream consumer. Its target is transient local packing output; it does not
touch npm or another registry.

## Preconditions

Read `packages/sdk/typescript/package.json`,
`packages/sdk/typescript/README.md`, and the accepted local summary
`docs/evidence/releases/HGI-203-accepted-attempt.json`. Confirm Bun is the
repository-pinned runtime and no retained tarball is being treated as proof.

## Authority

Local builds, temporary directories and package-consumer tests may run within
the attached task. Registry credentials, publication, Git and provider actions
are outside this runbook and require separate authority.

## Procedure

1. Run `bun run --filter=@taxkit/sdk check-packed-artifact` to inspect the exact
   packed file/export contract.
2. Run `bun run --filter=@taxkit/sdk validate:downstream` to install and execute
   the package through a fresh consumer boundary.
3. Record command, true exit, candidate/package identity and observed import
   paths. Remove transient packing directories through the command's own
   cleanup; do not commit or preserve tarballs as canonical evidence.

## Evidence and postcondition

Success is a local pack whose declared files and public export paths load from
a clean consumer, with bounded output tied to the current candidate. The
accepted HGI-203 summary is historical local proof, not a substitute for a new
candidate run.

## Rollback

Packing should change no tracked file. If it does, stop and preserve the diff
for diagnosis; revert only identified generated residue after confirming it is
not user work. Retain bounded failed provenance, not raw tarballs.

## Escalation

Escalate unexpected packed files, missing declarations, source-condition drift,
consumer import failure, cleanup failure or credential prompts to the SDK
package owner and requesting repository owner.

## Stop conditions

Stop before `versioning`, `commit`, `push`, `tag`, `release`, `registry-publication`,
`deployment`, `provider-access`, or `recovery-mutation` when authority is
unknown. Stop immediately if a supposedly local command requests a credential
or external registry mutation.

## Limitations

Local packing cannot establish that the registry contains the artifact or that
an external consumer, runtime or deployment can retrieve it.

## Non-claims

This proof does not publish, version, tag, release or deploy a package and does
not claim npm, provider or external-consumer state.
