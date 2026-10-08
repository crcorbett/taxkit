# Layout and Composition

## Contents

- [Choose layout by semantic weight](#choose-layout-by-semantic-weight)
- [Root entrypoints](#root-entrypoints)
- [Domain catalogues](#domain-catalogues)
- [Export discipline](#export-discipline)
- [Avoid utils](#avoid-utils)

## Choose layout by semantic weight

Use the smallest layout that keeps ownership obvious. File names are contracts, not decoration.

### Compact application

```text
alchemy.run.ts
apps/web/src/lib/build/
  schemas.ts
  cloudflare.ts
  axiom.ts
datasets/
  definitions.ts
  index.ts
dashboards/
  definitions.ts
  index.ts
  request-health.ts
tools/infrastructure/
  preflight.ts
  readback.ts
  receipt.ts
```

Use this when one application owns a small graph and does not publish infrastructure as a package.

- `alchemy.run.ts`: root input, provider and state composition, stack call, outputs.
- `schemas.ts`: stage/config/authority codecs.
- `cloudflare.ts`: Cloudflare graph or stack factory.
- `axiom.ts`: Axiom graph or stack factory, not dashboard content.
- `datasets/**`: dataset catalogue and retention/description policy.
- `dashboards/**`: dashboard definitions, chart groups, query builders, stable identifiers.
- `tools/infrastructure/**`: command-line adapters for preflight/readback/receipts.

### Provider subdirectories

Split `cloudflare.ts` into `cloudflare/**` when it owns multiple independently testable concepts:

```text
cloudflare/
  stack.ts
  website.ts
  worker.ts
  storage.ts
  routes.ts
  observability.ts
```

Do the same for Axiom only when datasets, tokens, dashboards, and readback have distinct contracts. Avoid empty index files and one-line forwarding modules.

### Reusable infrastructure package

```text
packages/infrastructure/
  package.json
  src/
    schemas.ts
    errors.ts
    service.ts
    live.layer.ts
    memory.layer.ts
    providers.ts
    inventory.ts
    drift.ts
    receipt.ts
    stacks/
      application.ts
      proof.ts
    cloudflare/
    axiom/
    workos/
    vercel/
    state/
  tests/
alchemy.run.ts
alchemy.preview.run.ts
alchemy.production.run.ts
```

Use a package when at least one is true:

- more than one entrypoint composes the same domain;
- custom resources have meaningful read/diff/reconcile/delete semantics;
- provider-free tests need an interchangeable service;
- another workspace consumes the contract;
- inventory, drift, receipt, or recovery policy has become substantial.

The package must remain importable without executing a runtime or reading environment variables.

Root entrypoints, applications, tools and sibling packages must consume it
through declared package exports. If the infrastructure graph needs a Schema
or contract currently buried in an app, move that shared owner into the
package as part of the same change. A package that still imports
`../apps/**` is not an extracted boundary.

## Root entrypoints

Keep root entrypoints boring:

1. define Stack name and stage;
2. decode stage and authority;
3. select state;
4. construct provider Layers;
5. compose a named stack;
6. return serialisable typed outputs.

Create stage-specific entrypoints only when their authority or resource graph is materially different. Do not duplicate the whole graph. Share a stack function and constrain each entrypoint.

Examples:

- `alchemy.run.ts`: normal graph selected by decoded stage;
- `alchemy.preview.run.ts`: Preview-only authority and provider restrictions;
- `alchemy.production.run.ts`: protected Production adapter;
- `alchemy.lifecycle.run.ts`: one disposable recovery/proof lifecycle with an exact stage.

## Domain catalogues

Use catalogue folders for repeated declarative data.

`datasets/definitions.ts` owns dataset identity and immutable policy. `datasets/index.ts` turns the catalogue into resources.

`dashboards/<name>.ts` owns one cohesive dashboard definition. `dashboards/definitions.ts` owns shared chart/query schemas. `dashboards/index.ts` declares resources.

Do not mix provider token issuance, workflow authority, live readback, and dozens of chart definitions in one `axiom.ts`.

## Export discipline

Export:

- domain Schemas and encoded types;
- named stack functions;
- semantic service contracts;
- safe receipt types;
- stable catalogue declarations when another package must consume them.

Workspace consumers import these contracts through package or app export
names. Do not use relative filesystem paths into `apps/**`, `packages/**`, or
another workspace's `src/**` tree. A lint rule should keep this executable,
including in files with narrower import restrictions.

Keep private:

- provider SDK/HTTP clients;
- raw API response types;
- credentials and Config objects;
- Alchemy provider implementation details;
- unredacted errors;
- runtime handles;
- generic mutation helpers.

## Avoid “utils”

Do not create `utils.ts`, `helpers.ts`, `common.ts`, or `shared.ts` for infrastructure policy. Name the owner:

- `resource-identity.ts`;
- `removal-policy.ts`;
- `plan-classification.ts`;
- `provider-readback.ts`;
- `receipt.ts`.

If a function has no clear owner, reconsider whether it belongs in the package.
