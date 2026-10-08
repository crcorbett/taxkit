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
candidate with `TaxKitApi` and `TaxKitWebsite`. Cooper's 7 October active plan
authorises qualified native Preview and Production deployment from this Mac.
Old plan, apply, teardown or rollback authority cannot transfer to it.

Its `prod` candidate additionally declares the retained existing `taxkit.dev`
zone and retained DNS settings, with `taxkit.dev`, `www.taxkit.dev` and
`api.taxkit.dev` attachments. `pr-N` and local graphs omit all Production DNS
and domain properties. Declaration alone proves no attachment. The
[cloud delivery receipt](../documentation-audit/clean-slate-foundation/2026-10-07-native-cloud-preparation.json)
and [agent guide delivery receipt](../documentation-audit/clean-slate-foundation/2026-10-07-agent-setup-and-cancellation-bounds.json)
record the separately authorised native operations and their actual readback.

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

If GitHub cannot run because of account or runner limits, use the same pinned
dependencies and complete local `bun run release:check -- --ci` graph. Record
the unavailable run separately. Native plan/apply commands can run from the
authorised local machine under the same exact resource, stage, credential,
plan-review and readback requirements below. Confirm no other apply is active.
The execution location grants no additional provider or Production authority.

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

### Native domain preparation

The dated target read is retained at
`docs/documentation-audit/clean-slate-foundation/2026-10-07-domain-provider-readback.json`.
The local source identity follow-up is recorded at
`docs/documentation-audit/clean-slate-foundation/2026-10-07-native-source-plan.json`.
Native credential, state and namespace preparation is recorded at
`docs/documentation-audit/clean-slate-foundation/2026-10-07-native-cloud-preparation.json`.
Guide delivery is recorded at
`docs/documentation-audit/clean-slate-foundation/2026-10-07-agent-setup-and-cancellation-bounds.json`.
Current operational handover is recorded at
`docs/documentation-audit/clean-slate-foundation/2026-10-07-native-operation-handover.json`.

1. Preserve the exact candidate, native entry, lockfile, dependency patch and
   source-input identities. The native plan projection is version three;
   never change old receipt identities or pass a v2 `DocsWebsite` approval to it.
2. For an authorised read, use the existing `cf` default profile and independently
   check account `f9f94270a4a5af8af7010d891020922d` and zone
   `15103853342ab9f18f7894b7fae39c39`. The 7 October
   [readback](../documentation-audit/clean-slate-foundation/2026-10-07-domain-provider-readback.json)
   observes an empty first DNS page, disabled DNSSEC, active locked registration
   with automatic renewal, preserved settings and a specific missing redirect
   entrypoint reply. It is dated evidence, not a fresh pre-operation inventory.
   Enumerate every DNS page exposed by the reader and preserve foreign records.
   The existing `cf` reader returns a decoded list, without the API pagination
   envelope. Use an explicit page size and continue to an empty page. The
   Production deploy token does not include DNS-record read access; use the
   separately verified existing read profile, without adding permissions.
3. Read shared redirect rules separately. Stop on access, malformed-reply or
   network failure. Only the SDK's specific `RulesetNotFound` means absence.
   The dependency patch preserves unrelated rules and uses the native 301
   redirect with path and query retained. No registrar, DS, nameserver, TLS,
   mail or verification change belongs to this candidate.
4. Check native Alchemy credential/account selection and repository-scoped
   Doppler custody separately. A working `cf` profile proves neither. An existing
   TaxKit CLI login may supply native provider credentials only through an
   explicitly selected scope belonging to the same verified TaxKit repository.
   Resolve its system-keyring token in memory for native `DOPPLER_TOKEN`, and
   use `doppler run` with the exact project/config for the Cloudflare pair.
   Never print, persist, copy to another environment or broaden credentials.
   This native bridge is distinct from the retired writer's checkout-scope
   guard. Record its identity, purpose, expiry and readback in the operation
   receipt. The
   root secret selection remains `taxkit/dev`, `taxkit/stg_preview` or
   `taxkit/prd` by checked stage, with the implicit shell secret source disabled.
   Stop credentialed planning if its credential purpose, account or custody is
   unknown. Do not create or broaden credentials to complete a local check.
   Omit `--env-file` for the explicit native secret list. The owned namespace
   configuration supplies `10078` for Production and `10078<PR number>` for
   Preview. Read every available Worker binding before apply and refuse foreign
   namespace collisions. Use the paged Worker script search to confirm the
   complete name list, then read each script's settings; the older list reply
   has no pagination metadata. A read after apply cannot establish this earlier
   check. Verify native state version and authenticated access
   before planning; reuse a same-account native state profile only after this
   readback. Refuse automatic shared-store bootstrap, resume or upgrade outside
   the operation's named authority.
5. Under a separately named planning operation, capture the exact native
   beta.80 no-apply plan and its bootstrap/read effects. Reuse the already
   authenticated store; do not bootstrap or upgrade it. The dated delivery
   receipts retain live plans for their exact candidates. A new operation needs
   a new source/provider observation. Prepare the existing projection inputs:
   `TAXKIT_WORKFLOW_PLAN_GRAPH=native-apps`,
   `TAXKIT_WORKFLOW_PLAN_KIND=deploy`,
   `TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT` (the full clean checkout commit),
   `TAXKIT_WORKFLOW_PLAN_REPOSITORY_ROOT`,
   `TAXKIT_WORKFLOW_PLAN_TEXT_PATH`, `TAXKIT_WORKFLOW_PLAN_STAGE` and
   `TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID` (the exact account above). `prod` also
   requires `TAXKIT_WORKFLOW_PLAN_ZONE_ID` (the exact zone above). Create the
   ignored `tmp/native-apps-plans/<stage>/` directory in that checkout first.
   Set `TAXKIT_WORKFLOW_PLAN_IDENTITY_PATH` and
   `TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH` to distinct files inside it; neither
   may overwrite the plan text. Resolved symlinks must stay inside that stage.
   Run
   `bun --no-env-file --conditions=source run tools/docs-deployment/workflow-plan-projection.runtime.ts`.
   It reads local text, checks the exact clean commit and source bytes before
   and after capture, then writes a native source identity and sanitised
   projection/digest with no provider call. The optional
   `TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256`,
   `TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256`,
   `TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256` and
   `TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256` must match calculated hashes when
   supplied. Review the named tracked-file coverage in the
   [tool owner](../../tools/docs-deployment/README.md); generated/dependency
   bytes, environment and provider state remain outside that manifest. The
   command checks the installed beta.80 version, not installed patch equality.
   It does not establish the origin of supplied plan text. Preserve the plan
   operation's own source/provider receipt separately. Preview must contain only
   the API/Website and their named bindings. Production must adopt/refresh the
   retained zone, never create, replace or delete it.
6. Prepare explicit approval, expiry, revocation, partial-failure and rollback
   records before apply. The native redirect provider uploads its Worker script
   before reading shared rules; a later read failure stops rule replacement but
   does not undo that upload. Record the last successful step and compare the
   actual script version, bindings, domains and rules before any recovery.
7. After separately approved apply, independently read exact app/class/binding
   and domain identities, DNS, certificates, TLS and actual Website/API behaviour.
   Recheck registrar/DNSSEC without treating adoption or a green apply as their
   proof. A fresh equal plan and source-bound rollback are separate checks.

### Native local commands

After the existing repository-scoped Doppler login has been resolved in memory,
select `taxkit/prd` for `prod` or `taxkit/stg_preview` for `pr-N`. Use that
selection to supply only the existing native credential inputs; the native
Stack owns application secret names and precedence. Select the independently
verified native state profile. No token value belongs in command output,
receipts or a copied environment file.

From a clean checkout at the named candidate, use the installed native command:

```sh
bun --no-env-file --conditions=source run node_modules/alchemy/bin/cli.js plan --config alchemy.apps.run.ts --stage <stage> --profile <verified-state-profile>
```

Keep stdout and stderr separately, and qualify stdout with the existing
source/projection command above. Complete the frozen installation and full
local checks before apply; confirm no local or hosted apply is active against
the same stack/stage. Retain account, stage, namespace, plan and source checks
in the operation receipt. Under the named deployment authority, use:

```sh
bun --no-env-file --conditions=source run node_modules/alchemy/bin/cli.js deploy --config alchemy.apps.run.ts --stage <stage> --profile <verified-state-profile>
```

Review the plan shown by this command again before answering its exact
`Apply this plan?` prompt. Refuse an unexpected resource, deletion, replacement,
shared-store bootstrap or upgrade. Do not use `--yes`: it also accepts a
shared-store upgrade. Do not use `--env-file` with this cloud Stack.
The command may build and upload both apps more than once while native peer
Outputs resolve; record the final saved versions and independently checked
bindings. A later plan can conservatively propose two app and three binding
updates for those Outputs. Do not repeatedly apply it merely to obtain an empty
plan, or claim no-op convergence from correct provider/public behaviour.

The historical workflow evidence command and receipts remain attached to the
retired graph; historical writer workflows stay stopped. The native procedure
uses the existing CLI, source/projection owner and bounded per-operation
receipts, with no replacement command runner. The
[handover receipt](../documentation-audit/clean-slate-foundation/2026-10-07-native-operation-handover.json)
records current credential identities, authenticated state, paged names,
separate rate counters and domain/certificate/registrar reads. It is dated
evidence, not continuing authority or a guarantee of future provider state.
If the projection's second write fails, preserve the first local file and
failed observation; a partial pair grants no operation approval.

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
