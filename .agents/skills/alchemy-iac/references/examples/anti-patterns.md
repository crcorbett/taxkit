# Anti-patterns

## Ceremonial infrastructure

**Smell:** an Alchemy scaffold exists but no product-owned provider lifecycle exists.

**Correction:** document the real owner and remove or archive the unused graph. Do not create a third deployment authority.

## Giant provider dump

**Smell:** `infrastructure.ts` or `axiom.ts` contains config parsing, dozens of dashboards, raw clients, token issuance, apply, readback, and receipts.

**Correction:** split by semantic owner: Schemas/errors/service/Layer, provider graph, datasets, dashboards, operations, receipt.

## Filesystem boundary bypass

**Smell:** a root stack, tool, app, or package imports `../apps/**`,
`../packages/**`, or another workspace's private `src/**` path.

**Correction:** use an explicit workspace export. If the contract is genuinely
shared, move it and its Schema to the package that owns the shared meaning.
Do not expose an app-internal module only to keep a misplaced owner alive.

## Copied website origin

**Smell:** application origin configuration contains a fixed public address,
builds a `workers.dev` address from stage and account names, copies a chosen
custom domain, or guesses a local development address.

**Correction:** bind `Cloudflare.Worker.URL` on a Website.Vite or native Worker
for its own origin. Use another host's native resource Output for its address.
Validate the resolved value with Schema when application code reads it. A
custom domain declaration remains valid infrastructure input. See the
[website origin rules](../providers/cloudflare.md#website-origin-rules).

## Stateful success

**Smell:** state contains a resource, so the change is reported live.

**Correction:** query the provider independently, then run the public/application journey.

## Plan as authority

**Smell:** a clean plan automatically proceeds to Production.

**Correction:** classify the plan, compare it with an operation-specific authority, and pass the protected environment gate.

## Generic provider callback

**Smell:** `withVercelClient(fn)` or `request<T>(...)` exposes the raw provider.

**Correction:** define named semantic operations and keep the client private to `live.layer.ts`.

## Retry after uncertain write

**Smell:** a timed-out create is retried immediately.

**Correction:** read/list using stable identity before retry; converge on the existing resource.

## Delete by name

**Smell:** deletion accepts an arbitrary resource name.

**Correction:** resolve stable provider ID, verify account/stage/managed ownership, require destroy authority, then read back absence.

## Shared stage identity

**Smell:** proof, Preview, and Production use the same physical bucket, callback, route, or dataset without explicit shared topology.

**Correction:** isolate physical names or document shared ownership and require identity predicates plus retained-resource protection.

## Dashboard without dataset policy

**Smell:** queries refer to ad hoc or retired dataset names and omit stage/service filters.

**Correction:** define dataset catalogue, dashboard dependencies, required identity predicates, and semantic validation.

## Telemetry acceptance as ingestion proof

**Smell:** exporter request returned success, so dashboards are reported working.

**Correction:** generate a unique signal and query the backend using exact identity and a bounded window.

## Vercel deployment impersonation

**Smell:** an Alchemy observation resource is reported as owning a Vercel Git deployment.

**Correction:** keep deployment provenance with Vercel Git; scope the custom resource to observation/adoption/configuration.

## WorkOS URL-only proof

**Smell:** callback URL returns 200, so redirect configuration is reported complete.

**Correction:** read the exact WorkOS application/environment and redirect inventory, then run the redirect journey.

## Portable receipt violation

**Smell:** receipt contains an absolute CI runner or workstation path, raw provider JSON, or token-like values.

**Correction:** encode a bounded Schema with safe IDs, relative artefact references, sanitised errors, and explicit non-claims.

## “Read-only” credential ambiguity

**Smell:** workflow promises no mutation but uses an administrator credential without recording its capability.

**Correction:** distinguish operational intent from technical capability and prefer provider-scoped read-only credentials.

## Provider-free overclaim

**Smell:** a memory Layer test is called live lifecycle proof.

**Correction:** report it as graph/provider-algorithm proof and separately run isolated provider conformance under authority.
