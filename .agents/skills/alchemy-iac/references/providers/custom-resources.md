# Custom Resources and Actions

## Contents

- [Use a custom Resource only for a real lifecycle](#use-a-custom-resource-only-for-a-real-lifecycle)
- [Read semantics](#read-semantics)
- [Diff semantics](#diff-semantics)
- [Reconcile semantics](#reconcile-semantics)
- [Delete and retain](#delete-and-retain)
- [Provider modes](#provider-modes)
- [Actions](#actions)
- [Tests](#tests)

## Use a custom Resource only for a real lifecycle

A custom Alchemy Resource needs a stable identity and provider semantics. Define:

- input Schema;
- output/state Schema;
- logical name;
- provider safe ID;
- read;
- diff;
- reconcile/create/update;
- delete or retain;
- list/import/adopt if supported;
- retry, timeout, and uncertain-write policy;
- removal policy;
- observability and receipt fields.

Keep provider implementation private to its package.

## Read semantics

Read must distinguish:

- resource exists and is readable;
- resource is missing;
- credential is forbidden;
- request failed transiently;
- provider returned invalid data;
- identity is ambiguous.

Do not translate every error into “missing”; that can create duplicates.

Decode provider output immediately. Return the minimum durable state needed for future reconciliation.

## Diff semantics

Classify each managed field:

- no change;
- in-place update;
- replacement;
- adoption;
- removal;
- forbidden drift;
- unknown.

Ignore provider-owned volatile fields. Reject drift in identity or ownership fields. Make replacement and deletion visible to plan policy.

## Reconcile semantics

Reconcile must converge when repeated with the same desired input.

- Read before create/update where feasible.
- Use provider idempotency keys where supported.
- Persist stable provider IDs.
- After timeout or transport ambiguity, read before retry.
- Apply only managed fields.
- Read back after write.
- Bound retries with Schedule and timeout.
- Log semantic operation and safe identity.

Do not hide a non-idempotent callback inside reconcile.

## Delete and retain

Default foreign or adopted resources to retain. For deletion:

- require exact stage/resource authority;
- read and verify identity before delete;
- refuse cross-stage or ambiguous matches;
- handle already-missing as converged;
- query until absence or a bounded terminal state;
- record residue or blocked cleanup honestly.

Never implement delete as a generic SDK method call over arbitrary input.

## Provider modes

When supporting memory/read-only/live modes, make the mode part of the Layer:

- **memory**: deterministic graph and lifecycle simulation;
- **read-only**: provider reads and drift, no mutation paths;
- **live**: bounded mutation under authority.

Do not let a mode flag silently skip a requested write while returning success. Return a typed authority/mode error.

## Actions

Use an Action for bounded input-dependent work without an independently managed durable object:

- qualify a scoped token;
- run entitlement/capacity preflight;
- execute a provider verification query;
- derive a safe provider identity;
- generate a sanitised proof artefact.

Define input/output Schemas and secret-negative results. An Action still needs retry, timeout, and observability policy.

## Tests

Exercise:

- create;
- no-op reconcile;
- update;
- replacement classification;
- delete;
- retain;
- already-missing;
- invalid provider payload;
- forbidden credential;
- transient failure and retry;
- timeout after successful write;
- adoption;
- ambiguous identity;
- read-only mode.

Memory tests prove the provider algorithm and graph policy, not the live API. Add isolated provider conformance tests when authority exists.
