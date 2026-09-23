---
document_type: developer-guide
lifecycle: current
authority: supporting
owner: taxkit-deployment-tool-owner
last_reviewed: 2026-08-28
review_trigger: docs deployment command, receipt Schema, workflow adapter, provider inventory, authority, or proof change
---

# Docs deployment tooling

This directory owns repository-side validation, workflow receipt checks and
provider/state inventory for the docs application. Durable resource policy
lives in [`../../docs/architecture/deployment.md`](../../docs/architecture/deployment.md);
operator procedure and authority live in
[`../../docs/runbooks/docs-deployment.md`](../../docs/runbooks/docs-deployment.md).

## Current boundaries

- `schemas.ts`, `workflow-receipts.schemas.ts`, `workflow-check.schemas.ts` and
  `inventory.schemas.ts` own current external representations and closed safe
  errors. `schemas.ts` also decodes immutable historical v1/v2 receipts, while
  current v2 plans admit only the native one-resource graph. Historical
  decoders are not current deployment admission.
- `input.boundary.ts` owns repository-relative retained-evidence reads.
- `workflow-check.boundary.ts` owns workflow-provided file, JSON and SHA-256
  ingress through Effect FileSystem, Crypto and Schema.
- `inventory-credentials.boundary.ts` owns Alchemy state-store credential
  ingress. It distinguishes absent, malformed and unreadable inputs, rejects
  excess fields, keeps the bearer redacted and checks account identity before
  state construction.
- Each `workflow-*-check.runtime.ts` file decodes its Config Schema, calls the
  shared boundary and one typed verification program, logs safe fields through
  Effect Console, provides Bun services and executes once through
  `BunRuntime.runMain`.
- `workflow-evidence.schemas.ts`, `workflow-evidence.ts` and
  `workflow-evidence.runtime.ts` form one closed command with `bootstrap`,
  `plan`, `replan` and `provider` modes. It calculates shared tracked-file identities, reuses
  the beta.79 plan projection and provider inventory Schemas, decodes bounded
  Wrangler JSON, and encodes sanitised bootstrap, plan, provider and GitHub
  output files. Its only child process is fixed `git ls-files`; it cannot choose
  or run Alchemy, Wrangler, GitHub or another executable.
- `workflow-artifact.schemas.ts`, `workflow-artifact.ts` and its runtime own
  the final upload boundary. The runtime decodes one fixed mode and separate
  source/upload directories. The Effect program copies only the named safe
  JSON and screenshot files for that mode, follows no file outside the source
  directory, scans admitted JSON for secret sentinels and token shapes, and
  reports only a safe file name and reason. Raw Alchemy output, stderr,
  inventories and hosted diagnostics remain in the runner work directory.
- `inventory.runtime.ts` is the provider/state readback composition owner. It
  remains read-only unless a separately authorized workflow owns mutation.
- `local-doppler.ts` owns the one fixed local credentialed command. It removes
  ambient Doppler and Cloudflare values, selects only `taxkit/dev`, disables
  env-config and fallback reads, limits fetched names, and starts Bun with
  automatic `.env` loading disabled. Its runtime exposes no caller-selected
  project, config, executable or argument.
- `doppler-custody.boundary.ts` reads the local Doppler config through Effect
  FileSystem, YAML and Schema, selects the most specific repository-scoped
  token reference, and accepts only a mode-`0600` `secret-...` system-keyring
  reference. Its runtime prints only pass/fail and never resolves or prints the
  token. Do not replace it with `doppler configure debug`.
- `no-local-env` is the intentionally empty Alchemy dotenv input. It prevents
  the native local command from reading a developer `.env` while Doppler
  supplies the two named Cloudflare values through the process environment.
- `strict-boundaries.policy.ts` checks the named application and deployment
  adapters for ambient host access, raw concurrency, lost workflow/credential
  boundaries and unmanaged docs runtime state.
- Private `@taxkit/infrastructure` owns the native
  `Cloudflare.Website.Vite("DocsWebsite")` declaration; root owns its provider
  and state composition. This directory does not
  build or spawn the docs app.
- `workflow-plan-projection.ts` is the single beta.79-bound host adapter for
  Alchemy's text plan output. It admits only the current native Website
  resource and fails closed on any other resource line. The
  `fixtures/alchemy-beta.64/` manifest binds five real sanitised GitHub
  artefact captures to Alchemy `2.0.0-beta.64`, upstream commit
  `31edd3c4b2f0f3310fad07f5423aee20cf72be8d`, their source run/artefact
  identities and SHA-256 digests. The fixture tests recompute every digest and
  cover create, update, no-op, delete and already-absent destroy.

The retired orphan classifier has no current workflow, command, Schema,
service, runtime or child-process boundary. Its immutable JSON receipts remain
historical evidence; they are not a contributor-lifecycle system.

The one remaining Promise host bridge is `apps/docs/src/server.ts`: TanStack's
Cloudflare `fetch` callback crosses into the app-owned `ManagedRuntime` through
`runPromise`. This is a framework adapter, not domain execution ownership.

## Local verification

```sh
bun run check:docs-deployment:types
bun run check:docs-deployment-tools:types
bun run check:doppler-custody
bun run test:docs-deployment
bun run check:docs-deployment
```

The focused tests cover Config and receipt boundaries, every workflow-evidence
mode, credential failures, account mismatch, plan/resource admission,
workflow identity, deterministic output encoding, local Doppler arguments and
ambient-value stripping, pass/fail-only keyring custody, secret-negative failures,
the version-bound real plan fixtures, historical receipt classification and
static adapter contracts. Root
`verification` invokes them once. These local commands do not dispatch
workflows, access providers, deploy, destroy, prove hosted behavior or grant
operational authority.
