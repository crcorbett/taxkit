# Authority, Plan, and Apply

## Contents

- [Model authority as data](#model-authority-as-data)
- [Credential custody](#credential-custody)
- [Preflight](#preflight)
- [Plan classification](#plan-classification)
- [Apply](#apply)
- [Workflow contract](#workflow-contract)
- [Exit states](#exit-states)

## Model authority as data

Decode an operation authority record before provider access. It should identify:

- operation;
- stack and stage;
- environment;
- source repository/ref/revision;
- provider scope;
- exact resource selector;
- allowed change classes;
- credential provenance/class;
- expiry or workflow run identity;
- required preflight/readback/receipt;
- recovery owner.

Do not accept a boolean such as `ALLOW_PRODUCTION=true` as the whole authority contract.

Keep authority separate from desired state. A valid graph does not authorise apply, and an authorised operation does not make an invalid graph safe.

## Credential custody

For each credential, record:

- source: OIDC, provider integration, secrets manager, local user session;
- technical capabilities;
- operationally authorised use;
- provider/account scope;
- lifetime;
- whether it can read state, read provider, mutate provider, or query proof;
- revocation/rotation owner.

Prefer short-lived or workload identity credentials. Do not reuse Preview credentials for Production without an explicit cross-environment design.

Never print or persist credentials to:

- Alchemy outputs;
- workflow outputs;
- plan files;
- logs/spans;
- receipts;
- test snapshots;
- error messages.

## Preflight

Run read-only checks before planning or applying:

1. decode stage/source/authority;
2. identify provider account/project/tenant;
3. validate credential class and safe metadata;
4. check quota, entitlement, and capacity;
5. inventory resource identities in scope;
6. verify state backend availability and namespace;
7. detect retained or foreign collisions;
8. verify workflow/environment protection.

Stop on contradictory identity. Do not “best effort” a Production target.

## Plan classification

Normalise the plan into a closed set:

- create;
- update in place;
- replace;
- adopt;
- retain/detach;
- delete;
- read-only/no-op;
- unknown.

Assert:

- exact expected logical resources;
- allowed change class per resource;
- no unexpected deletion or replacement;
- no cross-stage physical name;
- no Production resource in a disposable graph;
- source revision matches the requested revision;
- provider mode supports the requested operation.

Unknown must fail closed.

## Apply

Only apply after:

- preflight passed;
- plan was reviewed by policy;
- authority covers the exact plan;
- protected environment gates passed;
- concurrency is serialised for the target stage;
- recovery steps are available.

Use one mutation runtime. Do not run two Production applies against the same state namespace.

Prefer serial provider operations when:

- later resources depend on provider read-after-write;
- rate limits are tight;
- custom providers can observe uncertain writes;
- ordering is part of safe compensation.

## Workflow contract

A Production workflow should normally enforce:

- explicit manual or approved trigger;
- protected Production environment;
- concurrency group by stack/stage;
- exact source SHA;
- no fork/untrusted credential exposure;
- no Preview credential reuse;
- read-only plan before mutation;
- plan policy gate;
- independent provider readback;
- sanitised durable receipt;
- explicit failure/recovery path.

Pin third-party actions according to repository policy. Keep permissions least-privileged.

## Exit states

Return one of:

- applied and independently verified;
- applied, provider verified, journey unverified;
- partially applied, recovery required;
- blocked before mutation;
- no-op under verified state;
- destroyed and absence verified;
- destroy attempted with residue.

Do not collapse these to “success” or “failure”. State which proof layers exist.
