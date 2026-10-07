---
document_type: developer-guide
lifecycle: current
authority: supporting
owner: taxkit-deployment-tool-owner
last_reviewed: 2026-10-07
review_trigger: docs deployment command, receipt Schema, workflow adapter, provider inventory, authority, or proof change
---

# Docs deployment tooling

This directory owns repository-side validation, workflow receipt checks and
provider/state inventory for retained docs operations and the replacement native app plan. Durable resource policy
lives in [`../../docs/architecture/deployment.md`](../../docs/architecture/deployment.md);
operator procedure and authority live in
[`../../docs/runbooks/docs-deployment.md`](../../docs/runbooks/docs-deployment.md).

## Current boundaries

- `schemas.ts`, `workflow-receipts.schemas.ts`, `workflow-check.schemas.ts` and
  `inventory.schemas.ts` own current external representations and closed safe
  errors. `schemas.ts` also decodes immutable historical v1/v2 receipts, while
  version-three `NativeAppsPlanProjection` admits the replacement two-app graph
  and its Production-only retained zone/settings. Old v2 projections remain
  available for retained tooling; they cannot admit the replacement graph.
  Historical decoders are not deployment authority.
- `input.boundary.ts` owns repository-relative retained-evidence reads, typed
  JSON decoding and SHA-256 through Effect Crypto. Read/decode/hash failures
  expose only the safe target identity, preserving retained digest bytes.
- `workflow-check.boundary.ts` owns workflow-provided file, JSON and SHA-256
  ingress through Effect FileSystem, Crypto and Schema.
- `inventory-credentials.boundary.ts` owns Alchemy state-store credential
  ingress. It distinguishes absent, malformed and unreadable inputs, rejects
  excess fields, keeps the bearer redacted and checks account identity before
  state construction. File JSON is restored once, then the owning credential
  Schema checks that value. Malformed cache fallback and unreadable input
  remain separate outcomes.
- Each `workflow-*-check.runtime.ts` file decodes its Config Schema, calls the
  shared boundary and one typed verification program, logs safe fields through
  Effect Console, provides Bun services and executes once through
  `BunRuntime.runMain`.
- `workflow-evidence.schemas.ts` and `workflow-evidence.ts` retain the historical
  `bootstrap`, `plan`, `replan` and `provider` algorithms and original receipt
  bytes. Their runtime refuses every operation. The same source owner now
  calculates native tracked-file identities for the existing plan-projection
  command. It runs only fixed Git reads for the commit, clean status and file
  list; it cannot choose or run Alchemy, Wrangler, GitHub or another executable.
- `workflow-artifact.schemas.ts`, `workflow-artifact.ts` and its runtime own
  the final upload boundary. The runtime decodes one fixed mode and separate
  source/upload directories. The Effect program copies only the named safe
  JSON and screenshot files for that mode, follows no file outside the source
  directory, scans admitted JSON for secret sentinels and token shapes, and
  reports only a safe file name and reason. Mode lookups fail closed; ordered
  Effect traversal preserves the file allowlist and serial copy behaviour.
  Its command has one exact strict runtime admission; ordinary files and tests
  have none. Raw Alchemy output, stderr,
  inventories and hosted diagnostics remain in the runner work directory.
- `inventory.service.ts` exposes the checked `read` operation and pure agreement
  policy. `inventory.live.layer.ts` privately captures Alchemy State and Worker
  services once, checks each actual reply beside its read, and preserves the
  original bounded concurrency and first matching ownership tags. The test
  Layer substitutes a checked report without provider access.
- `inventory.runtime.ts` composes the live provider/state services and the owning
  configuration Schema. `inventory.report.egress.ts` encodes the saved pretty
  JSON and newline; encoding/write failures have closed safe reasons. The
  report-only command performs no mutations and prints no underlying errors.
- `local-doppler-environment.boundary.ts` restores the full flat environment
  through Effect ConfigProvider, preserving empty values and underscored names.
  Its typed errors reveal no environment values; the runtime composes the live
  provider. It makes no Doppler or keyring request and starts no child command.
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
  boundaries and unmanaged docs runtime state. The exact Worker host may
  execute one native request program. The source contract also requires lazy
  documentation context acquisition, typed probe encoding, preserved response
  fields/other headers and the request abort signal; deliberate bypass fixtures
  reject lost ownership. This source control is separate from actual Worker
  behaviour and framework promise cancellation.
- Private `@taxkit/infrastructure` owns the native `TaxKitApi` and
  `TaxKitWebsite` declarations, plus Production-only zone/settings. Root
  `alchemy.apps.run.ts` owns cloud providers/state and selected Doppler secrets.
  This directory does not build or spawn either app. The old `DocsWebsite`
  entry and writer workflows remain retired.
- `workflow-plan-projection.ts` is the single beta.80-bound host adapter for
  Alchemy's text plan output. Its retained version-two path admits only the
  retired `DocsWebsite` resource and rejects other resource lines. The
  replacement version-three path is described below. Beta.80's upstream
  `formatPlanLines` emits `Plan: no resources` for an empty plan; the adapter
  admits that line only for an already-absent teardown. The
  `fixtures/alchemy-beta.64/` manifest binds five real sanitised GitHub
  artefact captures to Alchemy `2.0.0-beta.64`, upstream commit
  `31edd3c4b2f0f3310fad07f5423aee20cf72be8d`, their source run/artefact
  identities and SHA-256 digests. The fixture tests recompute every digest and
  cover create, update, no-op, delete and already-absent destroy. The old
  empty-plan text remains historical and is rejected by the current parser.

The retired orphan classifier has no current workflow, command, Schema,
service, runtime or child-process boundary. Its immutable JSON receipts remain
historical evidence; they are not a contributor-lifecycle system.

## Replacement native plan projection

`workflow-plan-projection.runtime.ts` uses the existing command owner. Set
`TAXKIT_WORKFLOW_PLAN_GRAPH=native-apps` to select version three; omitting it
retains the historical v2 path. Native mode accepts only deploy-plan text and
refuses teardown. It checks the exact account and requires the exact zone for
`prod`. `pr-N` has two resources, no domains and unmanaged Production DNS.
The parser recognises native adoption, binding rows and `Plan: no changes`.
Repeated/unknown rows, deletes, replacement, zone creation, extra resources,
local-mode output and wrong summary counts refuse with safe errors.

The command checks a clean checkout at the named candidate before and after
reading its tracked source files, and refuses changed bytes. It calculates the
configuration, source-manifest, lockfile and receiving Alchemy patch hashes.
Optional supplied hashes must match. It checks the installed Alchemy package
version and writes a version-two native source identity beside the version-three
projection. Both outputs must be distinct files inside the selected stage's
ignored `tmp/native-apps-plans/<stage>/` directory; neither may overwrite the
plan text or resolve through a symlink to source or another stage. The
[runbook](../../docs/runbooks/docs-deployment.md) owns the exact inputs.

The source manifest covers the named tracked app/package/tool/patch and root
configuration paths in `workflow-evidence.ts`. It excludes ignored/generated
files, installed dependency bytes, environment values and provider state. The
installed version check does not prove installed patch bytes; the frozen
installation and dependency checks remain separate. Caller-supplied plan text
is checked for shape, but this command cannot prove which checkout or provider
produced it. Source capture has a twenty-second deadline; it establishes a
local snapshot, not a continuing lock on the checkout. Identity is written
before projection, so a later write failure can leave the local identity file.
Neither file supplies apply, bootstrap or provider approval.

The fixture text under `fixtures/alchemy-beta.80/` is checked against the
installed formatter on actual receiving graph plans in the infrastructure
suite, with memory state and provider writes forbidden. These are local
mock-provider observations, not cloud plans. The command tests cover both
stages, wrong commits/hashes, changing source, unsafe output paths, target
mismatch, missing zone, malformed patch identity, teardown and unknown mode.
Actual CLI tests use isolated local homes and no credentials. Historical writer
commands and workflows remain stopped. Native bootstrap/provider receipts,
real custody and live plan qualification remain pending.

The narrow Alchemy dependency patch now also changes the native shared redirect
reader to catch only `RulesetNotFound`. The actual source and compiled provider
were exercised with mock HTTP replies; failed access causes no shared-rule PUT,
confirmed absence permits one PUT, and foreign rules are preserved. Worker
upload precedes that read, so failure is not an atomic rollback of the whole
Worker operation. The exact mock-wire fixture has decoding/encoding permission;
actual-command lint fixtures keep runtime execution forbidden there and both
codecs forbidden in its ordinary neighbouring test.

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

## Local checking

`test:docs-deployment` uses Bun-hosted Vitest with the shared source resolver.
The upload-file, retained-input, source-contract, credential, workflow-input,
workflow-source, plan-projection, saved-evidence, automation receipt, retained-record policy and native memo tests use
`@effect/vitest`, scoped FileSystem fixtures and ordered Effect work. The
remaining suites preserve their existing assertions under Vitest. DEV-73
strict enforcement is locally qualified; the active clean-slate plan owns its
exact evidence and remaining review. Local command checks read retained
records only. Static source checks, saved receipts and local passing tests do
not establish current provider state or authorise a deployment.

The strict source-contract findings and path/source types derive from their
owning Schemas. Pure inspection preserves finding order using Effect arrays;
checked missing source reads become empty input so required source patterns
fail. This source-pattern check supplements the actual lint fixtures, rather
than proving that a runtime or deployment has run.

`fixtures/fake-doppler.runtime.ts` is the checked synthetic child command used
by local adapter tests. Its owning Schema encodes the exact argument/environment
receipt. A scoped symlink invokes that tracked executable with synthetic values,
`--no-env-file` and no actual Doppler invocation. Its sole exact runtime/argument
admission is test-only; neighbouring files and production services gain none.
The original negative child-exit assertion now checks the owning typed error.
Credential tests preserve cached-file precedence, malformed fallback and
unreadable-input refusal; scope tests preserve the most-specific selection
regardless of ordering. Strict-policy qualification and provider/runtime
behaviour are separate claims; current native plan work is recorded below.


Workflow-source assertions retain ordered Effect traversal and checked step
lookup. The plan parser checks optional regex groups, resource selection and
summary lookup. Its JSON encoder reuses the receipt field Schemas in the exact
canonical digest order. The projection runtime encodes once for file/hash work
and returns bounded typed configuration/read/decode/write errors. The plan
verifier and saved-evidence writer use that encoding. Inventory/version lookups
are checked; absent stages use Option internally and retain the original text
at workflow egress. Three executable runtime admissions are exact; ordinary
sources and tests have none. The original workflow/capture/evidence tests,
five historical capture digests and eight accepted-finding mappings remain.
Added negative tests read only scoped synthetic records, with no provider request.


The automation receipt checker retains its exact authority, plan and
provider/hosted/run/input comparisons using pure findings, checked optional
selection and persistent maps/sets. Its original locale finding order and wire
nulls remain. Evidence types derive from a Struct reusing the owning field
Schemas. The command reuses the file JSON/SHA-256 boundary with its own safe
errors and reads screenshots serially. Its one exact runtime admission grants
no execution permission to tests or policy files; old raw Bun/decode/test
permissions are removed. Scoped command fixtures cannot establish external
state and reject malformed or incomplete registers. The original eight policy
cases retain their assertions. Saved establishment counts do not prove current
provider state. The retained provider inventory is historical; these local
checks do not qualify a live inventory of the replacement app graph.


Retained-record policies use persistent collections, checked selections and
ordered pure findings. Saved-plan and receipt fingerprints are computed through
the controlled Crypto service. The exact JSON egress keeps the original locale
key order, numeric-key handling and primitive/array representation, so historical
fingerprints remain valid. Ordinary provider comparisons use the provider
Schema's field equality rules rather than making temporary JSON fingerprints.
The historical tests use Effect Vitest; fixed fingerprints and failure examples
check numeric/nested keys, insertion/array order, non-finite values and safe
service errors. The command alone has an exact execution admission and reports
bounded failures. Its operation counts describe retained records only.

Inventory and workflow proof/run/teardown check files receive the strict policy
with actual accepted/rejected lint fixtures. Only their four named commands have
exact runtime admissions. Unused raw Bun/process permissions and the old inventory
test's runtime permission are removed. Workflow receipt guards and finding order
remain; one-use source-event helpers now read as local checked values. Synthetic
native service tests cover named reads, invalid version/stage/resource/attributes/
worker/tag replies, safe provider failures, other stacks, original first-tag
selection and cancellation cleanup. Caller tests cover test-Layer substitution,
exact saved JSON bytes, write refusal, Config defaults/empty values and CI refusal.
These tests make no current provider request. DEV-73 local qualification does
not establish live provider state or complete the native T007 plan work.
