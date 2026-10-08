# Stages, State, and Identity

## Contents

- [Distinguish the identity axes](#distinguish-the-identity-axes)
- [Stage classes](#stage-classes)
- [Physical naming](#physical-naming)
- [State is not provider truth](#state-is-not-provider-truth)
- [State credentials](#state-credentials)
- [Identity in telemetry and receipts](#identity-in-telemetry-and-receipts)
- [Identity assertions](#identity-assertions)

## Distinguish the identity axes

Do not overload one string such as `prod`.

Model:

- **stack**: stable logical application or infrastructure graph;
- **stage**: isolated instance of that stack;
- **environment**: development, preview, proof, staging, production;
- **source**: repository, branch/ref, revision;
- **provider scope**: account, organisation/team, project, tenant, zone;
- **physical identity**: provider-visible resource name or ID;
- **deployment identity**: provider deployment/artifact ID and source revision;
- **state identity**: state backend and namespace.

Decode these values with Schema. Use a tagged union or refined string for allowed Production and proof stages rather than arbitrary string comparisons.

## Stage classes

Use explicit classes with different policies:

- **local**: developer-owned, non-shared, disposable;
- **branch Preview**: source-branch scoped, bounded lifetime;
- **proof**: fixed acceptance environment, isolated from public Production;
- **Production**: protected and durable;
- **lifecycle/recovery**: exact disposable stage used to prove adoption, update, recovery, and destroy.

Do not route a branch name directly into an unbounded provider name. Normalise and append a stable digest when necessary.

## Physical naming

Derive names from a stable contract:

```text
<application>-<environment>-<stage>-<resource>
```

Add a bounded digest when provider length or uniqueness rules require it. Keep logical Alchemy names stable even if physical names change through an explicit replacement.

Assert:

- Preview and Production names differ;
- proof and Production names differ;
- retained resources cannot collide with a new stage;
- provider-wide names include sufficient scope;
- renaming is classified as replacement, not a harmless update.

## State is not provider truth

State records Alchemy's view of a resource graph. It is essential for reconciliation, but it is not independent evidence.

Document:

- state provider and region/account;
- namespace derivation;
- encryption and access custody;
- lock/concurrency behaviour;
- backup/recovery;
- whether state itself creates provider infrastructure;
- stage deletion semantics;
- what happens when state exists but live resources do not, and vice versa.

Do not casually move between local and remote state. Treat a state-backend change as a migration with source and provider readback.

## State credentials

Separate:

- credentials required to read/write state;
- credentials required to read provider resources;
- credentials required to mutate provider resources;
- credentials required to verify public behaviour.

A workflow can be operationally read-only while using a credential that is technically capable of writes. Record that distinction and prefer cryptographically scoped read-only credentials when the provider supports them.

## Identity in telemetry and receipts

Use a stable identity set where relevant:

- application;
- service;
- environment;
- stage;
- repository;
- branch/ref;
- revision/deployment SHA;
- provider project/account/zone safe ID.

Require dashboards and queries to filter by this identity. Do not rely on dataset name alone when multiple deployments share a dataset.

Use low-cardinality fields as metric labels. Put revision and request identifiers in logs or span attributes, not metric labels.

## Identity assertions

Test before apply:

- decoded stage equals the authority stage;
- expected source revision equals the checked-out revision;
- provider account/project/tenant equals the configured target;
- state namespace contains the expected stack/stage;
- every physical name belongs to the current stage;
- returned deployment identity is consistent with provider readback;
- no Production route, callback, dataset, or secret appears in a disposable graph unless explicitly adopted and retained.

Fail closed on contradictory identity. An expected URL plus an unexpected empty provider inventory is a failure, even if the URL returns 200.
