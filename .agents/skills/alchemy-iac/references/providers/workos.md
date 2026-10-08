# WorkOS

## Contents

- [Treat WorkOS as an identity boundary](#treat-workos-as-an-identity-boundary)
- [Default integration shape](#default-integration-shape)
- [When to use a custom Alchemy resource](#when-to-use-a-custom-alchemy-resource)
- [Redirect URI lifecycle](#redirect-uri-lifecycle)
- [Multi-provider transaction](#multi-provider-transaction)
- [Proof requirements](#proof-requirements)

## Treat WorkOS as an identity boundary

WorkOS configuration can redirect authentication traffic. Model exact tenant/application/environment identity before mutation.

Record:

- WorkOS environment;
- client/application safe ID;
- organisation safe ID where relevant;
- redirect URI;
- logout/homepage/domain configuration where in scope;
- owning application stage;
- provider credential provenance;
- creation, rollback, and removal policy.

Never infer environment from a key prefix alone when the provider can be queried.

## Default integration shape

WorkOS application use usually belongs in an Effect provider adapter:

```text
workos/
  schemas.ts
  errors.ts
  service.ts
  live.layer.ts
  memory.layer.ts
  redirect-uri.ts
```

- `schemas.ts`: branded IDs, exact redirect URI Schema, request/response codecs.
- `service.ts`: named operations such as `createRedirectUri`, `listRedirectUris`, and `deleteRedirectUri`.
- `live.layer.ts`: private WorkOS SDK and redacted Config.
- `redirect-uri.ts`: lifecycle policy if Alchemy owns redirect configuration.

Do not expose the WorkOS client or a generic SDK callback.

## When to use a custom Alchemy resource

Create a narrow custom Resource only when the repository owns the redirect lifecycle and can implement:

- read/list by stable provider ID or exact canonical URI;
- semantic diff;
- idempotent create/reconcile;
- explicit delete/retain;
- uncertain-write recovery;
- provider readback;
- stage isolation.

Otherwise keep WorkOS configuration provider-owned and document/read it without adding a fictitious resource.

## Redirect URI lifecycle

Before create:

1. decode and canonicalise the URI;
2. assert HTTPS except an explicitly allowed local host;
3. assert host/path belongs to the expected stage;
4. read the target WorkOS application;
5. list existing redirects;
6. distinguish already-present, conflicting, and absent states;
7. require exact mutation authority.

After create:

1. read/list again;
2. match the provider ID and canonical URI;
3. redeploy/restart the relying application only if its runtime requires it;
4. perform an authentication redirect journey;
5. record safe identity and result.

On partial failure, read before retry. A timed-out create may have succeeded.

For branch Previews, do not assume one redirect per branch, wildcard redirects, or a new callback broker. First inspect the application's existing callback architecture and WorkOS environment policy. A stable first-party Preview callback or broker can reduce redirect churn, but it is a material authentication and security design: present it as an option and require explicit product/security ownership before adding it.

## Multi-provider transaction

A common flow spans Cloudflare/Vercel and WorkOS:

1. reserve an isolated application stage;
2. create/deploy runtime resources;
3. obtain the final callback origin;
4. create the WorkOS redirect;
5. read back both providers;
6. exercise the redirect journey;
7. recover or roll back in reverse dependency order;
8. remove the redirect before destroying the callback host when deletion is authorised;
9. verify residue and revoke disposable credentials.

Do not present this as an atomic transaction. Document compensation for every step.

## Proof requirements

An HTTP 200 on the application does not prove WorkOS configuration. Require:

- exact WorkOS application/environment readback;
- redirect inventory containing the expected URI;
- provider ID where available;
- an actual redirect/authentication journey or a clearly stated non-claim;
- teardown readback for disposable redirects.

Fail closed if provider inventory contradicts the expected URL.
