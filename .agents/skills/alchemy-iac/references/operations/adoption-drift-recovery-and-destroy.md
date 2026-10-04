# Adoption, Drift, Recovery, and Destroy

## Contents

- [Adoption](#adoption)
- [Drift](#drift)
- [Recovery design](#recovery-design)
- [Multi-provider compensation](#multi-provider-compensation)
- [Destroy](#destroy)
- [Lifecycle proof stage](#lifecycle-proof-stage)
- [Blockers](#blockers)

## Adoption

Adoption attaches an existing provider resource to desired state. It is a state mutation even if the provider resource is not changed.

Before adoption:

- resolve exact provider identity;
- verify account/project/tenant;
- read all managed fields;
- classify unmanaged fields;
- compare stage and source ownership;
- require adoption authority;
- default removal to retain;
- create a recovery snapshot containing only safe semantic fields.

Reject ambiguous name matches. Prefer provider IDs.

## Drift

Classify drift:

- **benign provider field**: timestamps, generated URLs, etags;
- **managed update**: a field the stack may reconcile;
- **ownership drift**: provider project/account/source changed;
- **identity drift**: expected ID or physical name changed;
- **destructive drift**: reconciliation would replace/delete;
- **unknown**: provider response cannot be decoded or classified.

Only managed update drift may be automatically reconciled, and only under authority. Ownership, identity, destructive, and unknown drift fail closed.

## Recovery design

For every mutating operation, specify:

- safe retry rule;
- idempotency key;
- read-after-timeout behaviour;
- partial-state detection;
- compensation order;
- state repair/adoption path;
- credential revocation;
- human escalation threshold.

Do not retry a create blindly after a network timeout. Read first; the provider may have committed it.

## Multi-provider compensation

Cross-provider changes are not atomic. Order creation from durable prerequisites to dependants, then compensate in reverse:

```text
create runtime/storage
  -> configure identity/redirect
  -> issue scoped telemetry/runtime credential
  -> deploy/redeploy
  -> read back
  -> journey
```

On failure:

```text
disable dependent route/config
  -> revoke disposable credential
  -> remove redirect
  -> destroy runtime/storage if authorised
  -> verify residue
```

Retained resources need an explicit handoff; they are not “cleaned up”.

## Destroy

Destroy is a separate authorised operation.

Before destroy:

- decode exact stack/stage;
- inventory resources from state and providers;
- reject Production unless explicitly authorised;
- classify retain/delete per resource;
- check dependants and data retention;
- generate and review a destroy plan;
- ensure credentials can perform both deletion and absence readback.

During destroy:

- delete dependants before prerequisites;
- treat already-missing as converged;
- stop on ambiguous identity;
- preserve retained resources;
- bound retries.

After destroy:

- query each provider for absence;
- query routes/callbacks/bindings for residue;
- verify state disposition;
- revoke temporary credentials;
- emit a residue-aware receipt.

## Lifecycle proof stage

Use an exact disposable stage to prove:

1. create;
2. readback;
3. no-op reapply;
4. update;
5. replacement classification where safe;
6. simulated or real partial failure;
7. recovery;
8. destroy;
9. absence and retained-resource isolation.

Give it collision-resistant physical names. Never reuse Preview or Production resources merely to save time.

## Blockers

Stop repeated hosted waits when the same external entitlement, credential, or provider capability blocker persists. Report:

- smallest blocked capability;
- completed non-mutating evidence;
- exact authority or provider change needed;
- recovery state;
- non-claims.
