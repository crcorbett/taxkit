---
document_type: product-spec-index
lifecycle: current
authority: canonical
owner: taxkit-product-owner
last_reviewed: 2026-08-31
review_trigger: product-spec admission, lifecycle, evidence, or successor change
successor: null
tombstone: false
---

# Product specs

This is the SPEC inventory and admission route. Current implementation intent
requires a genuinely active SPEC/task and an entry in
[`../exec-plans/active/README.md`](../exec-plans/active/README.md). Implemented,
superseded, and historical specs remain reachable for provenance but are not
default current context. See [`../README.md`](../README.md) for lifecycle.

Specs:

| Spec | Status | Notes |
| --- | --- | --- |
| [Alchemy and Doppler modernisation](./alchemy-doppler-modernisation.md) | Current | Active successor implementation intent and [task ledger](./alchemy-doppler-modernisation.tasks.json); current source and provider proof remain separate. |
| [Oxlint policy refresh](./oxlint-policy-refresh.md) | Implemented | The generic and Effect anti-slop policy, portable mutable-test-state rule and structural finding fixes are implemented. Candidate `48384d5` passed hosted Quality run `33375644482`; [PR #76](https://github.com/crcorbett/taxkit/pull/76) merged it as `1a0b180`, and main Quality run `33376169245` passed on that merge. No package publication or deployment was performed. |
| [Doppler configuration governance](./doppler-configuration-governance.md) | Implemented | The reviewed slices, TaxKit-only bootstrap, merged-main Quality and exact absent-stage teardown are proved. The hard cutover removed direct GitHub values and eight old Cloudflare tokens. Hosted fork, served Preview and Production/rollback remain explicit non-claims. |
| [Alchemy deployment structure corrections](./alchemy-deployment-structure-corrections.md) | Implemented | Findings `ALC-AUD-001` through `ALC-AUD-005` and decisions `ALC-AUD-R001` through `ALC-AUD-R003` are closed. [PR #71](https://github.com/crcorbett/taxkit/pull/71) merged the verified candidate as `28ed00f`; the [completed plan](../exec-plans/completed/alchemy-deployment-structure-corrections.md) retains ordered delivery and claim-matched proof. |
| [Native Alchemy docs hard cutover](./native-alchemy-hard-cutover.md) | Implemented | Native-only source/workflow admission, beta.64 sibling memo coverage and the exact Preview/teardown lock are implemented. The separately authorised five-stage Preview state reconciliation and zero-legacy final inventory are recorded in [`legacy-state-cutover.json`](../evidence/deployments/2026-08-21-native-alchemy-hard-cutover/legacy-state-cutover.json); Production was not deployed or cut over by that operation. |
| [Automatic Preview Teardown Admission](./automatic-preview-teardown-admission.md) | Implemented | PR-close teardown now shares the unreviewed Preview credential environment. Corrected run `32367035323` and reconciliation `32367125582` proved the automatic exact-stage no-op path; the old approval environment is removed and Production remains protected. |
| [Shared Dependency Cache and Checkout Upgrade](./shared-dependency-cache-and-checkout.md) | Implemented | PR #59 run `32357219491` passed twice on the same source commit; attempt 2 restored both exact shared keys, kept live installs and completed in 54 seconds with checkout v7.0.1. Cross-ref restore from `main` remains a post-merge proof boundary. |
| [Pull-request Turbo Write-through Cache](./pull-request-turbo-write-through.md) | Implemented | PWC-001 enables Vercel Remote Cache writes for token-bearing same-repository pull requests. Exact run `32351432522` proved a pull-request miss/write and same-commit remote hit; fork fallback and live frozen install remain. |
| [Turbo and CI Cache Efficiency](./ci-cache-efficiency.md) | Implemented | TCC-001 through TCC-005 retain event-safe Vercel task caching plus separate Bun-package and Chromium caches. Same-commit hosted proof records a 79% Turbo worker saving; dependency savings remain step-bounded, and trusted Preview plan-only proof retained live authority boundaries. |
| [Quality Trigger Efficiency](./quality-trigger-efficiency.md) | Implemented | Candidate `1b45489` passed hosted Quality run `32315275636`; feature-branch push duplication is removed while pull-request and main-branch coverage remains. |
| [Native Alchemy docs deployment](./native-alchemy-docs-deployment.md) | Implemented | Candidate `7a23bf3` passed exact Git, Preview, Production, public-journey and named-stage teardown proof; future changes require a successor SPEC. |
| [Native Alchemy docs integration](./native-alchemy-docs-integration.md) | Implemented | The manual docs build/Worker graph is replaced by beta.64's first-class Website.Vite lifecycle; current proof owns one resource and the ephemeral GitHub orphan subprocess helper is retired. |
| [Strict apps and IaC](./strict-apps-and-iac.md) | Implemented | APP-IAC-001 through APP-IAC-005 hardened docs-app runtime proof and Alchemy/Cloudflare verification and inventory boundaries; the terminal audit retains four bounded adapters without changing the deployed resource graph or external state. |
| [Docs Cloudflare and Alchemy deployment](./docs-cloudflare-alchemy-deployment.md) | Implemented | DCD-001 through DCD-005 are accepted at closeout candidate `c0cd1a9`; main-sourced Preview `pr-24`, fixed Production/rollback, report-only and exact Preview teardown absence receipts remain claim-matched (`31338052297`, `31343392260`, `31343236244`, `31344401196`, `31350160353`). The completed plan retains the full history; custom-domain/DNS remains a successor non-goal. |
| [TaxKit docs application architecture](./docs-application-architecture.md) | Implemented | The three-owner docs migration, native route outcomes, production graph and candidate-bound local proof are implemented; search remains deferred. |
| [Harness foundation improvements](./harness-foundation-improvements.md) | Implemented | The portable six-skill baseline, stable TaxKit profile, deterministic governance gate, five retained journeys, and fail-closed epoch `7c8a96e` are implemented and locally verified. |
| [Harness-governance documentation](./harness-governance-documentation.md) | Implemented | HGI-200 through HGI-208 are accepted locally; HGI-206 records the bounded repository epoch and closeout without claiming release, provider, or public actuality. |
| [API compatibility harness](./api-compatibility-harness.md) | Implemented | OpenAPI snapshot, route fixtures and live API app smoke coverage are in place. |
| [API HTTP package topology](./api-http-package-topology.md) | Implemented | The implemented HTTP API package now lives at `packages/api/http` as `@taxkit/api-http`. |
| [Boundary-only decoding](./boundary-only-decoding.md) | Implemented | Exact decoder placement enforcement, typed calculator continuations and pre-render docs route decoding are in place. |
| [Documentation structure and development docs](./documentation-structure-and-development-docs.md) | Implemented | Baseline docs structure is retained as historical implementation intent; current lifecycle routing is owned by the harness-governance SPEC. |
| [Documentation improvement roadmap](./documentation-improvement-roadmap.md) | Implemented | README coverage, root routing and maintenance conventions are in place. |
| [Downstream consumer validation](./downstream-consumer-validation.md) | Implemented | The nine-package closure passes strict tarball, clean-install, public-import, runtime, type and browser validation. |
| [Docs Fumadocs package separation](./docs-fumadocs-package-separation.md) | Implemented | Generic Fumadocs code, TaxKit docs contracts and app rendering are split. |
| [Docs MDX Fumadocs runtime](./docs-mdx-fumadocs-runtime.md) | Implemented | Docs content package, docs app runtime and validation path exist. |
| [Extract API app](./extract-api-app.md) | Implemented | `apps/api` owns the standalone Bun API runtime. |
| [Extract public calculator service](./extract-public-calculator-service.md) | Implemented | `@taxkit/calculators` owns reusable calculator orchestration. |
| [Public calculation API routes](./public-calculation-api-routes.md) | Implemented | Public metadata, graph and calculate routes exist. |
| [Public MDX developer documentation](./public-mdx-developer-docs.md) | Implemented | Public MDX docs content and navigation are in place. |
| [Repository foundation hardening](./repository-foundation-hardening.md) | Implemented | Effect beta.98, CI, deterministic package artifacts, portable linting, release readiness and durable review contracts are implemented and verified; current governance controls are successor work in HGI-205. |
| [Repository portability and production contracts](./repository-portability-and-production-contracts.md) | Implemented | Website-agnostic path hygiene, string contracts, portable Effect linting, production dependency proof and approved package-contract corrections. |
| [SDK-backed HTTP API thin wrapper](./sdk-backed-http-api-thin-wrapper.md) | Implemented | HTTP calculate delegates execution through the SDK Effect facade. |
| [SDK public naming and export contract](./sdk-public-naming-and-export-contract.md) | Implemented | Public SDK names and packed export contract are stabilised. |
| [TanStack Start loader transport boundaries](./tanstack-start-loader-transport-boundaries.md) | Implemented | Schema-encoded Effect outcomes survive initial SSR and client navigation before direct route-root restoration. |
| [TaxKit hard cutover](./taxkit-hard-cutover.md) | Implemented | Repository, package, configuration, GitHub and local-checkout identity cutover completed; the private release train is versioned to `1.0.0`. |
| [TypeScript SDK and publishing](./typescript-sdk-and-publishing.md) | Implemented | SDK implementation and local release-prep evidence are retained; publication remains a separately authorized future operation, with its semantics and evidence route owned by HGI-207, HGI-203, and HGI-204. |

Authoring guides:

- [Writing specs](./writing-specs.md)
- [Writing spec task lists](./writing-task-lists.md)
