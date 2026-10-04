# Ownership and Boundaries

## Contents

- [Start with lifecycle ownership](#start-with-lifecycle-ownership)
- [Write an ownership matrix](#write-an-ownership-matrix)
- [Decide when Alchemy should own a resource](#decide-when-alchemy-should-own-a-resource)
- [Separate authority from capability](#separate-authority-from-capability)
- [Separate claims](#separate-claims)
- [Bound custom configuration of foreign resources](#bound-custom-configuration-of-foreign-resources)

## Start with lifecycle ownership

Do not begin with provider APIs. Begin with a resource inventory and name the system that owns each lifecycle transition.

Use these lifecycle verbs precisely:

- **declare**: describe desired state without claiming mutation;
- **create**: make a resource that does not exist;
- **adopt**: attach state to a pre-existing resource;
- **observe**: read and report without changing;
- **configure**: mutate a bounded setting on a resource owned elsewhere;
- **reconcile**: converge the managed fields to desired state;
- **deploy**: create a runtime or artifact from a source revision;
- **retain**: remove the resource from this stack without deleting it;
- **destroy**: delete the provider resource and verify absence.

Do not collapse these verbs into “manage”.

## Write an ownership matrix

Before implementation, record:

| Resource            | Lifecycle owner                   | Deployment owner | State owner   | Readback authority | Removal policy |
| ------------------- | --------------------------------- | ---------------- | ------------- | ------------------ | -------------- |
| Cloudflare Worker   | Alchemy or Vercel Git, choose one | named workflow   | named backend | Cloudflare API     | delete/retain  |
| Vercel deployment   | Vercel Git by default             | Vercel Git       | Vercel        | Vercel API         | Vercel policy  |
| Axiom dataset       | Alchemy                           | not applicable   | Alchemy state | Axiom API/query    | retain/delete  |
| WorkOS redirect URI | WorkOS or narrow custom resource  | not applicable   | explicit      | WorkOS API         | delete/retain  |

Add account, organisation, project, tenant, zone, or team identifiers when ambiguity is possible. Store safe identifiers, never credentials.

## Decide when Alchemy should own a resource

Use Alchemy when all relevant conditions hold:

- the repository owns the desired state;
- the lifecycle can be expressed deterministically;
- independent readback exists;
- create/update/delete semantics are understood;
- retries can converge;
- partial failure can be recovered;
- stage identity can prevent collisions;
- credentials can be scoped to the authorised operation;
- the repository can test the graph and the provider result.

Prefer another owner or no new IaC when:

- Vercel Git already owns deployments and source provenance;
- a resource is manually governed for a documented reason;
- the provider API cannot support safe read, update, or delete semantics;
- the only available credential is materially over-broad;
- the repository cannot distinguish its resource from a foreign one;
- live state cannot be read independently;
- the proposed module exists only to make the tree look symmetrical.

An explicit “no Alchemy role” architecture decision is stronger than an unused scaffold.

## Separate authority from capability

A credential that can mutate a provider does not authorise every mutation it permits.

Require an operation-specific authority record:

- operation: plan, create, update, adopt, reconcile, destroy, issue token;
- stage and environment;
- exact resource set;
- expected source revision;
- credential provenance;
- allowed replacement/deletion;
- expiry or single-use constraint where appropriate;
- required preflight and readback;
- rollback or recovery owner.

Keep provider discovery and read-only diagnostics within their stated scope. Do not escalate from “inspect” to “apply”.

## Separate claims

Keep these claims independent:

1. **source claim** — which repository/ref/revision defines desired state;
2. **graph claim** — what the evaluated Alchemy stack intends;
3. **state claim** — what Alchemy state records;
4. **provider claim** — what the provider independently reports;
5. **deployment claim** — which source artifact a runtime serves;
6. **Preview claim** — behaviour in the Preview environment;
7. **Production claim** — behaviour in Production;
8. **public claim** — what an external caller actually observes.

Never use one claim as shorthand for another. For example:

- a green deployment job does not prove the public asset path;
- a resource in state does not prove it still exists;
- an HTTP 200 does not prove the expected redirect inventory;
- an accepted telemetry request does not prove data is queryable;
- a branch deployment does not prove default-branch establishment.

## Bound custom configuration of foreign resources

If Alchemy configures a resource deployed elsewhere:

- name the foreign deployment owner;
- manage only a closed field set;
- read the current value before writing;
- compute a semantic diff;
- reject unrelated changes;
- use retain by default;
- read back the exact field after write;
- never claim deployment provenance.

This pattern suits narrowly governed environment variables, redirect URIs, or observability drains. It does not justify wrapping an entire provider client.
