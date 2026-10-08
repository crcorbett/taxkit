---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-tooling-owner
last_reviewed: 2026-08-31
review_trigger: anti-slop plugin, Oxlint version, lint scope, local rule, or verification-graph change
successor: null
tombstone: false
---

# Oxlint Policy Refresh

## Outcome

TaxKit runs the current compatible Oxlint plugin runtime with the full
generic anti-slop ruleset, the opt-in Effect service-constructor rule, and the
applicable shared repository safeguards. Existing TaxKit rules, exact boundary
allowlists and narrow generated-file ignores remain in force.

## Purpose

Reject unsafe type widening, unchecked dictionary shapes, module mocking,
runtime reflection, unexplained assertions, imported Effect service
constructors and shared mutable test state through the ordinary root lint
command. The change must fix genuine findings in owned source without reducing
severity or hiding source behind broad ignores.

## Scope

This slice changes the root lint dependencies and configuration, vendors the
generic anti-slop plugin, adds focused executable policy tests, fixes resulting
owned findings, and updates the canonical tooling and quality documentation.
The structural fixes rename vague exported service contract types, rename
`SourceExtract.shape` to `rowContract`, restrict public trace values to JSON,
and introduce preferred `create*` constructors with deprecated `make*`
aliases where the old name can safely remain. A Changeset records those
package-facing changes. Calculator results and rule formulas do not change.
The slice performs no deployment, credential, provider, publication or release
operation.

## Policy ownership

```text
root lint command
  -> Oxlint configuration and exact file scopes
    -> vendored anti-slop rules
    -> portable Effect and Bun rules
    -> TaxKit-specific boundary and calculator rules
  -> focused real-binary fixtures
```

The vendored anti-slop folder contains only portable generic and Effect
constructor-import rules. TaxKit-specific policy remains in the existing local
plugins and root configuration.

## Acceptance

- Oxlint and `@oxlint/plugins` use the same current compatible version.
- Every generic anti-slop rule and the Effect constructor-import rule run at
  error severity through `bun run lint`.
- TypeScript value/type declarations avoid JavaScript's duplicate-declaration
  false positives while JavaScript keeps its own rule.
- Module-level mutable state in tests is rejected by the portable Effect
  plugin with accepted and rejected real-binary fixtures.
- Agent folders, generated output and the vendored plugin use narrow ignores;
  owned source remains linted.
- Focused Oxlint tests, lint, type checks, documentation checks and
  `bun run verification` pass before the pull request is merged.
- Package-facing contract corrections have a Changeset, updated canonical
  ownership notes and compatibility aliases where those aliases do not violate
  the new policy.

## Impact ledger

| Surface | Decision | Owner and reason |
| --- | --- | --- |
| Root dependencies, lint configuration and lockfile | Change required | `package.json`, `bun.lock`, `oxlint.config.ts` and `oxfmt.config.ts` own the executable toolchain, scopes and ignores. |
| Generic anti-slop plugin | Change required | `tools/oxlint/anti-slop/**` owns the portable vendored rules and stays separate from TaxKit policy. |
| Portable Effect rule and lint fixtures | Change required | `tools/oxlint/effect-rules.js` and `tools/oxlint/**` own the shared mutable-test-state rule and real-binary proof. |
| Standards, testing and tooling ownership | Change required | `docs/standards/tooling.md`, `docs/architecture/testing-and-quality.md` and `docs/architecture/package-ownership.md` own current policy and proof. |
| SPEC, task and plan lifecycle | Change required | This SPEC, its task list, the product-spec index and active/completed plan own implementation intent and closeout. |
| Package contracts and exports | Change required | Core, calculator, docs service and rule packages own renamed contracts; API and scripts own preferred `create*` exports and deprecated `make*` aliases. |
| Root, package and app READMEs | Preserve | No setup command or documented usage changes; canonical architecture owners record the contract naming policy. |
| Public docs, generated references and critical journeys | Preserve | No authored product content, generated API reference or calculator journey behaviour changes. |
| Runbooks, authority and external evidence | N/A | The work is repository-local and performs no provider, deployment, credential, release or publication operation. |
| Repository skills and agent instructions | Preserve | The existing skills direct this work; their contracts do not change. |
| Changeset | Change required | Package-facing type, field and constructor names must remain visible to the local release train. |

## Verification and limits

Focused proof was `bun run test:oxlint`, `bun run lint`, `bun run check-types`,
`bun run check:docs`, `bun run check:runbooks`, `bun run check:repository-paths`, `git diff --check` and
`bun run verification`. Candidate `48384d5da44c25894612c7253003adc677f601dd`
passed hosted Quality run `33375644482`; [pull request
#76](https://github.com/crcorbett/taxkit/pull/76) merged it as
`1a0b180326bb93eecee373c57503880b44754506`, which was read back as the exact
`origin/main` commit. Main Quality run `33376169245` passed on that exact merge.
These checks prove this repository revision only; they do not prove a package
publication, deployment, provider state or external consumer result.

Rollback is a revert of the merged repository commit.
