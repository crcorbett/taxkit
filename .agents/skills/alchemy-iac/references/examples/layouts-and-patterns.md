# Layouts and Patterns

## Contents

- [Compact Cloudflare site](#pattern-compact-cloudflare-site)
- [Cloudflare plus Axiom](#pattern-cloudflare-plus-axiom)
- [Reusable custom providers](#pattern-reusable-custom-providers)
- [Vercel-owned deployments](#pattern-vercel-owned-deployments)
- [Lifecycle proof](#pattern-lifecycle-proof)
- [Declarative dashboard](#pattern-declarative-dashboard)

## Pattern: compact Cloudflare site

```text
alchemy.run.ts
apps/web/src/lib/build/
  schemas.ts
  cloudflare/
    stack.ts
    website.ts
    observability.ts
  cloudflare-stack.test.ts
```

`alchemy.run.ts` decodes Stage, selects Cloudflare providers/state, invokes `declareWebsite`, and returns URL/deployment identity. Tests keep asset settings, bindings, and application build assumptions aligned.

## Pattern: Cloudflare plus Axiom

```text
alchemy.run.ts
apps/web/src/lib/build/
  cloudflare.ts
  axiom.ts
datasets/
  definitions.ts
  index.ts
dashboards/
  definitions.ts
  runtime-health.ts
  deployment-proof.ts
  index.ts
tools/infrastructure/
  axiom-capacity-preflight.ts
  axiom-readback.ts
  receipt.ts
```

Order:

1. preflight Axiom capacity and credential class;
2. declare datasets;
3. create scoped ingestion/query tokens;
4. bind redacted telemetry config to the Cloudflare runtime;
5. deploy;
6. emit a unique proof signal;
7. query Axiom by app/service/environment/stage/revision;
8. read dashboards/datasets and issue a receipt.

## Pattern: reusable custom providers

```text
packages/infrastructure/src/
  schemas.ts
  errors.ts
  service.ts
  live.layer.ts
  memory.layer.ts
  inventory.ts
  drift.ts
  receipt.ts
  providers/
    vercel-project.ts
    vercel-environment.ts
    workos-redirect.ts
  stacks/
    application.ts
    lifecycle-proof.ts
alchemy.run.ts
alchemy.lifecycle.run.ts
```

Provider modules own read/diff/reconcile/delete. Stack modules compose a declarative manifest. Entrypoints constrain stage/authority and choose Layers.

## Pattern: Vercel-owned deployments

```text
docs/architecture/deployment.md
packages/infrastructure/src/vercel/
  schemas.ts
  errors.ts
  service.ts
  live.layer.ts
  project-readback.ts
```

No Alchemy deployment resource exists. The service observes project/Git/deployment identity. Alchemy may coordinate Cloudflare, Axiom, or WorkOS configuration around the Vercel-owned URL under a narrow authority.

## Pattern: lifecycle proof

```text
alchemy.lifecycle.run.ts
packages/infrastructure/src/stacks/lifecycle-proof.ts
tools/infrastructure/lifecycle-receipt.ts
```

The entrypoint accepts one exact disposable stage, explicit physical names, and a closed resource list. It proves create, no-op, update, recovery, destroy, and absence without sharing Production resources.

## Pattern: declarative dashboard

```ts
export const runtimeHealthDashboard = {
  id: "runtime-health",
  datasets: ["app-prod-logs", "app-prod-metrics"],
  requiredIdentity: ["service", "environment", "stage"],
  groups: [
    {
      title: "Requests",
      charts: [
        {
          id: "request-rate",
          signal: "metrics",
          query: "... predicates include service/environment/stage ...",
        },
      ],
    },
  ],
} as const;
```

Treat this as structural pseudocode. Encode it with the repository's installed Schema and provider API.
