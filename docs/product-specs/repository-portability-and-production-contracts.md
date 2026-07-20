---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-07-20
review_trigger: historical intent, task evidence, or successor correction
successor: null
tombstone: false
---

# Repository Portability and Production Contracts

## Overview

Harden TaxKit's website-agnostic repository foundation before further product
or documentation-site decisions. This work removes machine-local checkout
references, defines a deliberate taxonomy for string-shaped contracts, expands
portable Effect linting where static analysis is reliable, and adds a
production-only dependency graph for the nine-package artifact closure,
repository automation and the standalone API runtime.

This spec extends the implemented
[Repository foundation hardening](./repository-foundation-hardening.md) work.
It does not revisit the existing boundary-only decoder, route transport,
release-readiness or packed-package contracts.

## Problem

The repository is healthy, but four foundation gaps can still hide drift:

- A 2026-07-18 tracked-text audit found 39 machine-local checkout references
  across 11 files. These references make otherwise durable documentation
  depend on one workstation and are not rejected by root verification.
- TaxKit brands important identifiers and owns many Schema contracts, but it
  does not yet state one complete rule for deciding whether a string-shaped
  value is an open branded value, a closed literal vocabulary, a redacted
  secret, checked content, a transport primitive or safe diagnostic text.
- Portable custom linting enforces important Effect boundaries, while several
  reliable Effect failure modes remain either calculator-scoped or review-only.
  Porting rules without a TaxKit-owned signal and fixture audit would create
  duplicate rules or suppression pressure.
- The current Knip graph includes development and test surfaces. It does not
  independently prove that public package exports, repository command
  entrypoints and the API runtime form a complete production graph without
  tests, fixtures or development-only modules keeping files alive.

## Call Graphs

```ts
Repository checks: current

tracked source and documentation
  -> root verification
    -> lint + format + Knip + type checks
      -> no machine-local path policy
      -> one development-aware dependency graph
```

```ts
Repository checks: target

tracked source and documentation
  -> repository path check
    -> tracked text inventory
    -> schema-backed findings
    -> zero machine-local checkout references

production entrypoints and public exports
  -> production Knip configuration
    -> nine-package artifact graph
    -> @taxkit/scripts command graph
    -> standalone API runtime graph
    -> no test, fixture or development-only reachability

root verification
  -> existing gates
  -> repository path check
  -> production Knip check
```

```ts
Effect contracts: target

unknown external, config, storage or process value
  -> owner-named Schema at explicit ingress
    -> branded open value | literal vocabulary | Redacted secret
    -> checked content | transport primitive | diagnostic text
      -> canonical schema-derived type
        -> typed service and package flow
          -> owning Schema encoder at explicit egress
```

```ts
Lint tests: target

portable Effect rule
  -> binding-aware visitor
  -> accepted fixture
  -> rejected fixture
  -> unrelated-shadow fixture
  -> installed Oxlint binary
  -> exact TaxKit-owned scope
```

## Goals

- Remove all tracked machine-local checkout references and prevent recurrence
  with a deterministic repository verification command.
- Make tracked docs, specs, task lists, plans and root guidance portable across
  clean checkouts without erasing useful repository-relative history.
- Define and apply a canonical string-contract taxonomy to exported,
  configured, persisted and provider-facing values.
- Reuse owner-named schemas and schema-derived types instead of introducing
  generic brand helpers, raw string mirrors or repeated defensive decoding.
- Add only portable Effect lint rules that have a reliable static signal,
  exact TaxKit scopes, accepted/rejected real-binary fixtures and a manageable
  migration path.
- Keep TaxKit-specific tax, decoder and route-transport rules separate from
  domain-neutral Effect rules.
- Add a production-only Knip graph for the exact nine-package artifact closure,
  repository command entrypoints and `apps/api`.
- Make the path and production-graph checks part of canonical root
  verification.

## Non-goals

- Website identity, metadata, SEO, AEO, Open Graph or canonical page policy.
- Design-system, route, browser, accessibility, performance or website
  deployment work.
- Replacing, redesigning or further hardening the current docs or web apps.
- Adding the current docs or web apps to the production-only Knip graph in
  this rollout.
- Treating Knip as packed-artifact or clean-consumer proof. Existing SDK-owned
  tarball and downstream validation remain the publication evidence.
- Copying another repository's source, names, paths, deployment choices or
  complete lint configuration.
- Branding every string, creating a generic schema/brand factory or moving
  owner-specific schemas into a shared bucket.
- Replacing TaxKit's stricter decoder placement or direct route-consumer
  contracts.
- npm publication, repository versioning, release tags or automated release
  pull requests.

## Resolved Decisions

On 2026-07-19 the user explicitly approved all three recommended options and
the full SPEC, and directed implementation not to stop for another approval.
That approval closes the following repository contradictions without inferring
policy from current code or version alignment:

1. **STR-DEC-001 — tighten the existing `IsoDate` Schema.** The exported Schema
   must validate the `YYYY-MM-DD` representation and a real Gregorian calendar
   date at runtime. The public `isoDate` constructor must use the same invariant.
   Installed Effect `4.0.0-beta.98` proves `Schema.brand` alone accepts arbitrary
   strings, and the current `Date.parse` check also normalizes impossible values
   such as `2026-02-29`; RPC-006 therefore owns one canonical checked-content
   invariant before the existing nominal brand. This is an intentional breaking
   accepted-input correction and requires a major `@taxkit/core` Changeset.
2. **STR-DEC-002 — rule-pack versions are independent ruleset versions.**
   `AnnualTaxReport.rulePackVersion` and
   `TakeHomePayReport.rulePackVersion` identify the stable ruleset contract, not
   the package manifest version. Their initial owner-defined values are
   `rules-au-income-tax/1.0.0` and `rules-au-pay/1.0.0`; runtime manifest reads
   and a generic version package remain prohibited. The exact-value audit found
   only the two current source literals. Existing calculator, HTTP, SDK, app
   smoke and strict downstream tests consume the reports but do not pin either
   value; the OpenAPI snapshot records both fields only as strings. RPC-006 must
   make each owner Schema and report value exact, then add owner, transport and
   packed-consumer assertions. The observable encoded-value and constructor
   contract correction requires major Changesets for both rule packages.
3. **REL-DEC-001 — calculators joins the fixed release train.**
   `@taxkit/calculators` joins the Changesets fixed group as the ninth artifact
   already present at `1.0.0` in the strict downstream closure. RPC-006 updates
   `.changeset/config.json` and `docs/standards/versioning.md`; the validator's
   nine-package inventory already contains calculators and needs proof, not a
   source edit. The policy/configuration edit itself has no package Changeset,
   while the approved package-facing corrections follow the resulting fixed
   group.

The full-SPEC approval also authorizes CORR-003, which replaces calculator
Schema-issue messages that currently include rejected values with stable safe
text while retaining typed paths/tags, and CORR-004, which removes raw
`Cause.pretty` text from the plain SDK's exported and rejected-Promise errors.
Sentinel evaluation reproduced both diagnostic risks. RPC-005 records decisions
only; RPC-006 implements all four approved correction rows, required package
Changesets and the API app changelog. No package source, release configuration,
version, tag or publication changes in RPC-005.

## Ownership and Boundaries

- Root configuration owns canonical verification scripts and Knip entrypoint
  selection.
- `tools/repository-paths` owns the focused repository-path policy,
  schema-backed safe findings, typed failures, tests and executable runtime.
  It is a root validation tool, not a reusable package or generic file-scan
  framework.
- `@taxkit/scripts` remains orchestration-only. It may invoke the canonical
  root path gate through `release:check`, but it must not implement or mirror
  validator policy.
- Each domain, API, SDK, rule, config or automation owner continues to own its
  string schemas and derived types. This spec defines selection policy, not a
  new central schema package.
- `tools/oxlint/effect-rules.js` owns domain-neutral Effect rules and
  `tools/oxlint/taxkit-rules.js` retains tax, decoder and route-transport
  policy. `oxlint.config.ts` owns exact enabled scopes and boundary allowlists.
- The dedicated production Knip configuration owns production reachability
  for the nine-package artifact closure, `@taxkit/scripts` executable commands,
  and `apps/api`. The JSON-only `@taxkit/tsconfig` artifact receives an explicit
  source-graph N/A decision rather than a fake TypeScript entrypoint. Root
  development tools remain in the development-aware graph. This configuration
  does not change package exports or runtime ownership.

All implementation must follow
[Effect services](../architecture/effect-services.md),
[Package ownership](../architecture/package-ownership.md),
[Configuration](../architecture/configuration.md),
[Testing and quality](../architecture/testing-and-quality.md) and
[Code patterns](../standards/code-patterns.md).

## Proposed Approach

### 1. Repository path hygiene

Replace machine-local checkout paths with repository-relative links,
repository identities, pinned external references or concise historical
descriptions. Historical plans remain useful, but their evidence must not
require a particular username, home directory or checkout layout.

Add one focused root tool under `tools/repository-paths`. Its live boundary
uses the repository's Effect v4 `ChildProcess`/`ChildProcessSpawner` command
model to obtain the NUL-delimited `git ls-files` inventory and Effect
`FileSystem`/`Path` services to read repository-relative files. One primary
Effect program classifies every Git-tracked readable text file with bounded
file-read concurrency. Binary means a NUL-containing payload or a failed
strict UTF-8 decode and is skipped deterministically. Text exclusions are not
permitted in the initial policy unless a specific tracked artifact proves
unavoidable and an exact tested exception is documented. This is not an
Oxlint rule.

Findings use owner-named Schemas for repository-relative file, positive line
number and the closed categories POSIX home path, Windows home path, tilde
checkout path, home file URL and checkout-directory path. Rejected cases cover
each category; accepted cases cover repository-relative paths, repository
identities, HTTPS references, portable tool-state paths such as a tilde-dot
directory, and ordinary prose using the word "projects".
Reports are stably ordered by file, line and category and must not echo the
matched absolute value, username, process stderr or surrounding file contents.
Tests construct rejected examples from safe path segments at runtime so the
fixtures themselves cannot violate the tracked-text gate.

Git lookup, non-zero exit and readable-text file failures become typed expected
errors at the live boundary. There are no retries: the local gate is
interruptible and fails once with a safe operation/category report.
`BunServices.layer` is provided once and `BunRuntime.runMain` appears only in
the runtime entrypoint. Keep the tool cohesive: `schemas.ts` owns contracts,
`policy.ts` owns independently testable classification, and
`check.runtime.ts` owns repository I/O and process execution. Do not add a
service/layer or pass-through helper unless implementation proves a real
substitution point beyond the pure policy and CLI integration test.

The root README status-snapshot link must be repository-relative. Add
`check:repository-paths`, `check:repository-paths:types` and
`test:repository-paths` root scripts. Root `verification` invokes the scan and
tool typecheck; root `test` invokes its focused tests. This makes CI enforce the
tool itself as well as the policy without editing the existing workflow.

### 2. String-contract taxonomy

Apply this taxonomy to exported, configured, persisted and provider-facing
string-shaped values:

- **Open semantic values** such as IDs, keys and opaque handles use an
  owner-named string Schema plus `Schema.brand` when accidental mixing is a
  real defect. `Schema.brand` is nominal only. Add runtime checks only when the
  owner has a stable, documented lexical or semantic invariant.
- **Closed vocabularies** such as kinds, statuses, modes and operations use an
  owner-named `Schema.Literal` or `Schema.Literals` contract and `Match` for
  material branching.
- **Secrets** arriving as raw values use owner-named
  `Schema.RedactedFromValue` with encoding disallowed unless an explicit secret
  egress exists. `Schema.Redacted` is for an already-redacted representation.
  Reveal only in the owning live adapter; a secret is not revealed merely to
  add a brand.
- **Content** such as descriptions, messages and authored text may remain a
  plain TypeScript `string` or inline `Schema.String`/`Schema.NonEmptyString`
  when it has no independent validation, secrecy, mixing or reuse policy. Name
  and extract a content Schema only for a stable repeated semantic boundary;
  brand it only when two valid content domains can be accidentally mixed.
- **Transport primitives** such as serialized JSON, headers, URLs and process
  output use named boundary Schemas when exported. Parser-local fragments may
  remain local after their enclosing representation is decoded.
- **Diagnostics** are governed by data flow, not nominal typing. Plain or
  checked text is safe only after sanitization or at an explicitly documented
  local, non-persistent boundary; it must not contain secrets, private paths or
  raw private payloads.

Audit string-shaped fields in exported Schemas, types, constructor inputs,
configuration, encoded/persisted contracts and command evidence reachable from
the nine-package artifact manifests, plus `@taxkit/scripts` and `apps/api`.
Do not inventory every code literal, tag, label, fixture or environment-key
name. Record `@taxkit/tsconfig` as application-string-contract N/A because it
exports compiler JSON, and record persistence, provider and secret surfaces as
explicit N/A findings when none exist. Do not invent infrastructure to satisfy
a category. The audit ledger lives in the active execution plan rather than a
new permanent inventory document.

`docs/architecture/effect-services.md` is the canonical taxonomy owner;
`docs/standards/code-patterns.md` contains only concise examples and a link
back, avoiding duplicated policy.

Each ledger row records owning module/Schema, field, exposure boundary, current
and proposed category, runtime constraints, brand identity, `Type`, `Encoded`,
constructor path, ingress decode, egress encode, compatibility impact and
keep/change/N/A decision. `Schema.make` on trusted literals is canonical
construction, not an unsafe brand bypass. Explicit recursive encoded types such
as `TraceNodeEncoded`, and generic descriptor interfaces that preserve
otherwise unrepresentable recursion or inference, are not DTO mirrors.

RPC-002 is audit-only: it records corrections and blockers but does not change
package contracts. Later approved corrections reuse the owning Schema in
consumers, decode the complete representation once at ingress, pass the
canonical type inward and encode only at serialization egress. Every
package-facing correction, including one in a private versioned package,
requires an appropriate Changeset. An HTTP/deployment-facing `apps/api` change
also updates `apps/api/CHANGELOG.md`.

The ledger must explicitly inspect `@taxkit/scripts` raw `cwd`, stdout and
stderr rendering and the SDK's `Cause.pretty`-derived error messages. A named
Schema alone cannot establish diagnostic safety: require a sentinel
secret/private-path egress test for any proposed sanitizer, or document the
exact local non-persistent boundary and why raw output is accepted.

### 3. Portable Effect linting

Build a candidate decision matrix before changing the plugin. Compare current
Effect rules and source findings with the live TaxKit codebase, recording the
candidate ID, existing overlap, exact intended scope, rejected and accepted
examples, binding model, migration count and admit/reject reason. Initial
candidates include bare `Effect.tryPromise`, host APIs in service contracts,
Effect execution in adapters without an explicit boundary, nullable boundary
leakage, manual `Result`/`Exit` re-encoding and non-throwing synchronous
decoders outside their reviewed consumers.

Existing calculator rules may move into the portable namespace only when the
rule is domain-neutral and broader exact scopes are proven. Do not create a
second decoder-placement rule or weaken the current exact allowlists. Do not
add website- or route-specific rules in this rollout.

The overlap audit starts with the existing
`effect/no-host-imports-in-contracts`,
`effect/no-runtime-execution-outside-boundaries`,
`bun/no-host-api-outside-adapters`,
`bun/no-runtime-outside-entrypoints`,
`effect/no-schema-encoder-outside-egress`,
`effect/no-throwing-schema-sync-codec`,
`taxkit/no-decoding-outside-boundaries` and calculator-scoped
`taxkit/no-nullish-comparison` contracts. Extend an owning rule when its
existing semantic contract fits; reject duplicate rules with different names.

Every admitted rule must resolve canonical imports and aliases, ignore
unrelated shadowed locals, have focused visitor tests, and pass accepted and
rejected fixtures through the installed Oxlint binary with nested config
disabled. Fix real violations at their owning boundary; do not add broad
ignores or suppressions to enable a rule. Oxlint JavaScript plugins are alpha
in the installed `1.66.0` schema, so the real-binary fixture suite is the
compatibility contract. Admitting zero new rules is an acceptable outcome when
the matrix proves existing coverage or unreliable static signals; duplicate or
disabled rule code is not.

### 4. Production dependency graph

Add `knip.production.json` and a root `knip:production` command that invokes
the installed Knip `6.14.2` binary with `--production`, `--config
knip.production.json`, `--no-progress` and `--no-config-hints`. Use Knip
production entry and project patterns with the trailing `!` marker. Do not add
a root production workspace merely to keep
development tools reachable, and do not rely on root-level entry/project keys
that Knip ignores when workspaces are configured.

Model source counterparts for every public export of the eight code-bearing
packages in the nine-package artifact closure (`@taxkit/core`, the three AU
rule packages, `@taxkit/calculators`, `@taxkit/api-http`, `@taxkit/sdk` and
`@taxkit/testing`), plus `@taxkit/scripts` executable command entrypoints and
`apps/api/src/index.ts`. `@taxkit/tsconfig` exports JSON only, so record it as
N/A for the TypeScript source graph and retain its manifest/tarball proof in
the SDK-owned strict downstream validator. Root `tools/**` are development
tooling and stay in the existing development-aware Knip graph.

Exclude tests, Vitest configuration, fixtures, examples, generated files and
development-only tooling from production reachability. Package manifests and
existing source entrypoints are the inventory source of truth; the SDK-owned
packed-artifact and downstream commands remain the proof of final tarball
exports.

Resolve findings by correcting exports, entrypoints, imports or genuinely
obsolete code. Exact exceptions require an ownership explanation; broad
workspace ignores and development entrypoints must not be used to manufacture
a passing graph. Keep the existing development-aware Knip command and run both
graphs from root verification. Prove the new graph is live with a positive
control for a real production import and a negative control that becomes
unused when reachable only from a test or development entrypoint.

## Downstream Artifact Impact

| Surface | Decision | Required artifact or explicit N/A |
| --- | --- | --- |
| Product spec and task state | Change | This spec, its task list, `docs/product-specs/index.md`, and an active execution plan when implementation starts. |
| Repository path policy | Change | The 11 baseline files, root `README.md`, `tools/repository-paths/schemas.ts`, `policy.ts`, `check.runtime.ts`, focused `*.test.ts` files and `tsconfig.json`, root `package.json`, `bun.lock` if the root platform dependency changes, `knip.json`, and exact `oxlint.config.ts` runtime/host allowlists. |
| Canonical architecture and standards | Change | `docs/architecture/effect-services.md`, `docs/architecture/testing-and-quality.md`, `docs/architecture/package-ownership.md`, `docs/standards/code-patterns.md` and `docs/standards/tooling.md`. |
| Package READMEs | Conditional | Change only the README of a package whose package-facing string contract changes. `packages/scripts/README.md` is N/A for repository-path ownership because the validator remains root-owned. |
| Portable lint tooling | Change | `tools/oxlint/effect-rules.js`, `binding-tracker.js` only when new analysis is necessary, `portable-rules.test.ts`, the accepted/rejected/unrelated-shadow Effect fixtures, focused rule tests and `oxlint.config.ts`. Bun and TaxKit plugin files are N/A unless the decision matrix deliberately moves an existing owner. |
| Production dependency graph | Change | `knip.production.json`, root `package.json`, both Knip documentation owners, the production-audit corrections in `packages/api/http/src/client/in-process.layer.ts`, `src/groups/health.ts`, `src/openapi.ts` and their two owning tests, plus one empty no-release Changeset required by status for internal package-file cleanup. `knip.json`, manifests and declared public entrypoints remain unchanged because no manifest/export mismatch was found. `packages/tsconfig` and root `tools/**` are N/A for this production source graph for the reasons above. |
| Publication proof | N/A | Knip does not replace `@taxkit/sdk` packed-artifact or downstream-consumer validation. Those commands run only when an export correction affects their graph. |
| Agent instructions and skills | Change | The approved governance slice updates root `AGENTS.md`, `.agents/skills/prd-writer`, `.agents/skills/prd-implementer`, adds `.agents/skills/effect-client-wrapper`, adds matching `agents/openai.yaml`, and enforces them through `tools/skills/skill-policies.test.ts` plus root `test:skills`. RPC implementation must preserve that edit-first impact-ledger and provider-boundary policy. |
| CI workflow | N/A | `.github/workflows/quality.yml` already invokes root `verification`, `test` and `build`; the new gates arrive transitively through `verification`. |
| Website/browser proof | N/A | `apps/docs`, `apps/web` and browser tests are outside scope. `release:check` is not a mandatory gate here because it intentionally runs docs browser proof. |
| Migrations, telemetry and deployment | N/A | No data migration, provider configuration, dashboard, hosting change or deployment rollback is introduced by deterministic local repository checks. |

The 11 baseline files are `README.md`,
`docs/exec-plans/completed/sdk-backed-http-api-thin-wrapper.md`,
`docs/exec-plans/completed/taxkit-hard-cutover.md`,
`docs/product-specs/docs-fumadocs-package-separation.md`,
its task list, `docs/product-specs/docs-mdx-fumadocs-runtime.md`, its task list,
`docs/product-specs/tanstack-start-loader-transport-boundaries.md`, its task
list, `docs/product-specs/taxkit-hard-cutover.md`, and its task list.

### RPC-005 decision-only impact ledger

| Surface | Decision | Path evidence and RPC-006 consequence |
| --- | --- | --- |
| SPEC, tasks, index and active plan | Change required / N/A | This SPEC, `repository-portability-and-production-contracts.tasks.json` and `docs/exec-plans/active/repository-portability-and-production-contracts.md` record the approvals, evidence and exact next scope. `docs/product-specs/index.md` stays N/A until final rollout status changes. |
| Canonical docs, standards, references and documentation audit | N/A for RPC-005; exact RPC-006 changes | Existing `docs/architecture/effect-services.md` already owns checked-content and safe-diagnostic policy. RPC-006 changes `docs/architecture/calculators.md`, `docs/architecture/api-and-sdk.md` and `docs/standards/versioning.md`. `docs/references/**` and `docs/documentation-audit/**` own no affected contract. |
| Root and relevant package/app/skill READMEs | N/A for RPC-005; exact RPC-006 changes | Root and skill READMEs expose no changed command. RPC-006 changes `packages/core/README.md`, both affected AU rule READMEs, `packages/calculators/README.md`, `packages/sdk/typescript/README.md` and `apps/api/CHANGELOG.md`; other app/package READMEs remain N/A. |
| Lint, rules, fixtures, tests, root scripts and CI | N/A for RPC-005; exact RPC-006 changes | This decision slice changes no executable policy. RPC-006's task `resolvedScope` names every focused test and command; `knip.json` changes only to admit the new core owner test. `oxlint.config.ts`, custom rules/fixtures, root scripts and `.github/workflows/quality.yml` remain unchanged because existing root gates inherit package work. |
| Skills, AGENTS, instruction symlinks and metadata | N/A | `.agents/skills/prd-implementer`, `.agents/skills/prd-writer`, `.agents/skills/effect-client-wrapper`, their `agents/openai.yaml` metadata, root `AGENTS.md` and instruction links own implementation process rather than these product contracts. Concurrent approved governance edits are preserved. |
| Config, manifests, exports, Schemas, generators, tests, examples, migrations and Changesets | N/A for RPC-005; exact RPC-006 changes | No package/config mutation occurs here. RPC-006 changes the core and two report Schemas, focused tests, core test manifest/lock/Knip wiring, `.changeset/config.json`, generated OpenAPI snapshot and exact package Changesets. Public exports stay on current paths; examples and migrations are N/A. |
| API, SDK, HTTP, storage, file, command, observability, deployment and operator surfaces | N/A for RPC-005; exact RPC-006 changes | RPC-006 changes calculator diagnostic projection, SDK plain-error projection, HTTP/SDK/packed-consumer proof, API smoke and app changelog. Storage, files, commands, providers, telemetry, deployment, rollback and operator runbooks receive no data or call-graph change. |
| React route/container/leaf, accessibility and browser surfaces | N/A | `apps/docs/**`, `apps/web/**`, React composition, accessibility and browser proof remain excluded; no corrected owner is a website or React boundary. |

### RPC-006 implementation impact ledger

| Surface | Decision | Path evidence and final consequence |
| --- | --- | --- |
| SPEC, tasks, index and completed plan | Change required | This implemented SPEC, `repository-portability-and-production-contracts.tasks.json`, `docs/product-specs/index.md` and `docs/exec-plans/completed/repository-portability-and-production-contracts.md` record final scope, evidence, call graphs, audits and parent acceptance. |
| Canonical docs, standards, references and documentation audit | Change required / N/A | `docs/architecture/calculators.md`, `docs/architecture/api-and-sdk.md` and `docs/standards/versioning.md` now own independent ruleset, safe diagnostic and nine-package fixed-train policy. `docs/references/**` and `docs/documentation-audit/**` catalogue no changed runtime contract and remain N/A. |
| Root and relevant package/app/skill READMEs | Change required / N/A | `packages/core/README.md`, both affected AU rule READMEs, `packages/calculators/README.md` and `packages/sdk/typescript/README.md` describe their corrected contracts; `apps/api/CHANGELOG.md` records HTTP-visible changes. Root and other app/package/skill READMEs expose no changed command or owner and remain N/A. |
| Lint, rules, fixtures, tests, root scripts and CI | Change required / N/A | Focused owner, calculator, HTTP, SDK, app-smoke and strict-downstream tests prove the corrections; `packages/core/vitest.config.ts`, its package test command and `knip.json` admit the new core suite. No lint policy changed, so `oxlint.config.ts`, custom rules/fixtures, root scripts and `.github/workflows/quality.yml` remain unchanged; CI inherits package tests through existing root gates. |
| Skills, AGENTS, instruction symlinks and metadata | N/A | `.agents/**`, root `AGENTS.md`, instruction links, bundled resources and `agents/openai.yaml` own implementation process, not the corrected contracts. Their concurrent governance edits are preserved and excluded from this slice. |
| Config, manifests, exports, Schemas, generators, tests, examples, migrations and Changesets | Change required / N/A | Core and both report owner Schemas, core test manifest/lock wiring, `.changeset/config.json`, the generated OpenAPI snapshot and `.changeset/bright-dates-report.md` change. Existing public export paths already expose the owning report/core Schemas; no new export, generic version module, example or migration is needed. |
| API, SDK, HTTP, storage, file, command, observability, deployment and operator surfaces | Change required / N/A | The existing calculator projection sanitizes issue messages; HTTP, Effect/plain/AU SDK, packed downstream and API smoke paths prove safe/exact egress. Storage, files, commands, providers, telemetry, deployment, rollback and operator runbooks have no changed edge. |
| React route/container/leaf, accessibility and browser surfaces | N/A | `apps/docs/**`, `apps/web/**`, React composition, accessibility and browser proof remain excluded and consume none of the corrected in-process owners. |

## Tests and Verification

- Each implementation slice must run `bun run verification` plus its focused
  package, lint or Knip gates.
- The path checker needs deterministic accepted/rejected fixtures and tests for
  Markdown, JSON, YAML, source and extensionless files, line reporting, binary
  detection, stable safe rendering, typed command/read failures, exact
  exclusions and a zero-findings repository run that includes the checker and
  its tests.
- String-contract changes need owning-package type checks and tests, plus an
  audit proving canonical schema/type reuse, one-time boundary decoding,
  explicit egress encoding and no unsafe construction.
- Every enabled portable lint rule needs visitor tests and real Oxlint binary
  fixtures for accepted, rejected, aliased and unrelated-shadow cases.
- The production Knip command must pass independently and as part of root
  verification without relying on test or development entrypoints.
- Substantial slices require three documented improvement audits covering
  call graphs, ownership, Effect-native control flow, canonical contracts,
  unsafe casts, DTO mirrors, stringly branching and helper sprawl.
- No browser verification is required because current website applications are
  explicitly outside this spec.

## Risks and Tradeoffs

- A path rule can reject legitimate prose if its pattern is too broad. Exact
  fixtures and tracked-text policy are required before enabling it globally.
- String-contract audits can create noisy nominal types. The taxonomy requires
  a concrete mixing risk or boundary contract and explicitly rejects branding
  by default.
- Over-broad linting creates suppression culture. Rules without reliable
  static evidence remain documented review guidance.
- A production Knip graph can miss framework-discovered entrypoints or flag
  legitimate conditional exports. Every exception must be exact and tied to a
  real runtime owner.
- The current website apps remain outside the production graph and will need a
  separate decision if either implementation survives future replacement.

## Versioning and Changelog Impact

Path checking, lint tooling, root verification and production Knip
configuration are repository-internal and do not require Changesets unless
their implementation changes a publishable package contract or behavior.

String-contract corrections that alter package-facing schemas, exports,
accepted inputs, encoded outputs or observable errors require package-owned
Changesets even while packages remain private. Internal-only type tightening
or documentation updates must record an explicit no-Changeset rationale. An
HTTP/deployment-facing API app change also updates `apps/api/CHANGELOG.md`.

Do not run `bun run version-repo` as part of this work.

## Acceptance Criteria

- Canonical root verification reports zero tracked machine-local checkout
  references and prevents their recurrence.
- The current 39-reference baseline is removed without deleting useful
  repository-relative history.
- Canonical architecture or standards guidance defines the six string-contract
  categories and current package-facing/config/persistence contracts have been
  audited against them.
- The `IsoDate` runtime-validation contract, calculators fixed-group
  membership and public rule-pack-version semantics are recorded before
  package-facing string corrections.
- Every correction approved by those decisions is completed through RPC-006
  with focused compatibility proof and the required Changeset, changelog or
  explicit N/A artifact.
- Consumers reuse owner-named schemas and derived types; the final diff contains
  no generic brand factory, mirrored DTOs, repeated internal decoding or unsafe
  brand casts.
- Every newly enabled portable Effect rule has an exact scope, binding-aware
  tests and accepted/rejected real-binary evidence.
- Existing decoder, route-transport, tax-specific and browser/server import
  boundaries remain at least as strict as before.
- `bun run knip` and `bun run knip:production` both pass, and the production
  graph covers the eight code-bearing members of the nine-package artifact
  closure, `@taxkit/scripts` commands and `apps/api` without test or
  development reachability. The JSON-only `@taxkit/tsconfig` package has a
  recorded source-graph N/A and retains strict downstream tarball proof.
- `bun run verification`, `bun run test` and `bun run build` pass after all
  slices. `release:check` is deliberately excluded because its canonical graph
  includes website browser proof.
- Each task's Changeset or no-Changeset decision is reviewed before commit.
- The final implementation and architecture docs still match the target call
  graphs in this spec.

## Review Evidence

The 2026-07-18 review inventoried 117 readable text files under `docs`, 17
README files outside `docs`, the four repository skills, every workspace
manifest, root static-analysis configuration, the quality workflow and the
current portable-rule implementation. Eight PNG browser-evidence files were
recorded and excluded from text review as binary artifacts.

Upstream behavior was checked through DeepWiki for `Effect-TS/effect-smol`,
`webpro-nl/knip` and `oxc-project/oxc`, then reconciled with the installed
repository versions. Local `effect@4.0.0-beta.98`, `knip@6.14.2` and
`oxlint@1.66.0` source/configuration are authoritative for implementation.
This is why the plan uses owner-named Effect Schemas, Knip production-marked
patterns and real installed-Oxlint fixtures rather than relying on generic or
newer upstream examples.

## References

- [Repository foundation hardening](./repository-foundation-hardening.md)
- [Boundary-only decoding](./boundary-only-decoding.md)
- [Effect services](../architecture/effect-services.md)
- [Package ownership](../architecture/package-ownership.md)
- [Configuration](../architecture/configuration.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Code patterns](../standards/code-patterns.md)
- [Tooling](../standards/tooling.md)
- [Abstraction admission](../design-docs/abstraction-admission.md)
