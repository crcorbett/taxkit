---
document_type: runbook
lifecycle: current
authority: canonical
owner: taxkit-docs-deployment-operation-owner
last_reviewed: 2026-10-07
review_trigger: retained docs recovery, native API/Website provider operation, authority or receipt change
---

# Docs deployment and retained recovery

Owner: `taxkit-docs-deployment-operation-owner`

## Identity and resource scope

The old `TaxKitDocsCloudflare/DocsWebsite` operation is retired in this
checkout. Root `alchemy.run.ts` exports a static retirement record rather than
a Stack. The real Alchemy command rejects it before session providers, remote
state or planning. Alchemy startup can still create local logs and an empty
default profile; the direct retirement command creates neither.

The four old writer/browser workflows are manual stop records with no checkout,
credentials, provider steps or automatic teardown. The read-only workflow
receipt reconciler remains available. Saved provider resources, credentials,
GitHub environment settings and deployed websites have not been changed by
this repository retirement.

`alchemy.apps.run.ts` declares the separate native `TaxKitAppsCloudflare`
candidate with `TaxKitApi` and `TaxKitWebsite`. Its provider operation belongs
to DEV-81. Old plan, apply, teardown or rollback authority cannot transfer to it.

## Preconditions

Read `docs/operations/authority-model.md`,
`docs/verification/docs-deployment-journeys.json` and
`docs/evidence/deployments/README.md`. The current journey and automation records
explicitly identify retired operations. Established receipts are dated historical
observations, not current external readback or standing deployment approval.

Use the [retention manifest](../documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json)
for exact source, workflow, original command and recovery identities. All 49
original app sources remain inspectable in a verified JSON bundle. It is not a
complete executable checkout or a deployment artifact.

## Authority

Local source inspection and repository checks need no provider credential.
Every external read or recovery mutation needs its own named principal, exact
operation, source/artifact, account, resource, stage, approval boundary,
duration, receipt, rollback and readback. Stop if any value is unknown.
Neither this guide, a retained workflow nor a successful local check supplies
those missing values.

## Procedure

1. Run `bun run check:docs-deployment`. It verifies the retained source bundle
   and reads historical receipts without contacting a provider.
2. Inspect the manifest and the named dated deployment record. Keep its original
   Stack, logical resource, candidate, state, version, URL and recovery identity.
3. For current reader work, use the [Website guide](../../apps/web/README.md).
   The replacement owns the existing authored page addresses; `/` is the approved
   calculator entry and `/start` is the docs entry.
4. If a hosted old resource needs recovery, stop and prepare a separate exact
   operation for the repository owner to approve. The saved
   [original procedure](../evidence/deployments/retired-docs-operations-2c5ffd40/docs-deployment.md.txt)
   is inspection material only. Restore its complete accepted source/artifact
   context in an isolated checkout under that approval; never extract the JSON
   bundle into an active workspace or treat a successful empty plan as retirement.

## Evidence and postcondition

The local postcondition is verified source addressability, useful page routes
and refusal of retired commands. The manifest retains source hashes and dated
provider recovery pointers. The read-only check does not refresh external state.
New provider proof requires exact candidate, accepted/equal plan, provider/state
readback and actual hosted behaviour under the new operation's procedure.

## Rollback

Repository rollback is a reviewed revert of this slice. Do not delete ignored
local build, dependency or state files. Hosted rollback is a separately approved
operation using the dated last-known-good provider source/artifact and its exact
resource identity. An archived source file or the native replacement cannot
stand in for that deployed artifact.

## Escalation

Escalate unknown recovery identity, missing retained bytes, unexpected provider
state or a request to resume an old writer to the repository owner. Preserve the
failed observation and the last successful step. Resume only after the missing
identity or operation approval is supplied and read back.

## Stop conditions

Stop `versioning`, `commit`, `push`, `tag`, `release`, `registry-publication`,
`deployment`, `provider-access` and `recovery-mutation` when their authority is
unknown. Stop an old writer, an empty old-resource plan, a source-less rollback,
an automatic orphan deletion or a change of old receipts to native resource IDs.

## Limitations

Local tests qualify this source only. They do not change workflows on the
default branch, hosted sites or provider state. The native provider procedure,
custom domain work and hosted replacement proof remain DEV-81 work. Metrics
remain deferred by Cooper's direction.

## Non-claims

No merge, deployment, provider access or mutation, credential change, DNS,
publication, hosted availability, complete historical rebuild or exercised
provider rollback is established by this retirement.
