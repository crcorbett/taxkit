# Product

<!-- impeccable:product-schema 1 -->

This is the shared product record for the TaxKit monorepo. `apps/web` and
`apps/docs` inherit it. It records confirmed product truth only; visual
direction belongs to DESIGN.md and surface briefs, which do not exist yet.

## Platform

web

## Users

Primary: a TypeScript developer integrating tax calculations into their own
application. They arrive evaluating whether TaxKit can run the calculation
they need, want to run one quickly, and then decide between the SDK and the
HTTP API. Confirmed by Cooper on 2026-10-07.

Secondary audiences, each already named in the documentation journey index
(`docs/standards/documentation-user-journeys.md`):

- Application integrator choosing and wiring an integration surface.
- Type-safety focused developer who wants compile-time guarantees and
  runtime schema decoding explained.
- API consumer calling TaxKit over HTTP from a browser or another language.
- New contributor proposing a tax behaviour change.
- Correctness reviewer checking source evidence, tests and compatibility.
- AI agents (remote MCP, browser WebMCP) that need the same documented
  calculation operations as code callers (rebuild spec Q5, CSF-005).

A person running a calculation in the browser is a supported visitor, not the
primary one. The calculator-first homepage agreed in rebuild Q12 exists to
show developers the engine working, with clear developer and agent routes
beside it.

## Product Purpose

TaxKit is an open-source tax engine, HTTP API, TypeScript SDK and
documentation site. It answers defined tax questions from explicit facts and
supported rules and returns a report with its trace. Success is a developer
who runs their first calculation, trusts the result enough to ship it, and
can see exactly which year, rule and parameter produced it.

## Positioning

Typed and deterministic: schema-typed facts, branded identities, integer-cent
money and deterministic Effect rule layers give correctness by construction.
The same calculator-owned schemas validate input and shape errors across SDK,
HTTP and in-process callers, so a type that compiles is a request that the
engine accepts. Confirmed by Cooper on 2026-10-07 as the lead claim.

Supporting facts that reinforce it, not replace it:

- Every rule package cites its official Australian Taxation Office source
  and ships golden tests.
- Reports carry a trace, the supported tax year and a rule pack version
  (for example `rules-au-income-tax/1.0.0`).
- Unsupported years fail explicitly rather than falling back to another year.
- One calculation owner serves people, code, HTTP and agents.

## Operating Context

- Developers meet TaxKit through the public docs, the TypeScript SDK (plain,
  safe-result and Effect entrypoints) and the HTTP/OpenAPI API. The SDK is
  implemented and validated downstream but not yet published.
- Calculation vocabulary is fixed in `CONTEXT.md`: calculator, fact, input
  fact, derived fact, rule, parameter, scenario, report, trace. Avoid "mode",
  "formula", "tax return" and "personal tax advice".
- The repository is public and so are its AI work-history transcripts
  (Entire). Maintainer docs under `docs/` are a governed lifecycle with
  SPECs, execution plans, runbooks and evidence receipts.
- Current apps: `apps/web` is the native TanStack Start Website candidate. It
  serves the three calculators over native Effect RPC and reads all accepted
  documentation pages. Tax calculation stays in the separate `apps/api`.
  `apps/docs` is a retirement tombstone. The clean-slate rebuild
  (`docs/product-specs/clean-slate-foundation.md`) is in progress; that SPEC
  owns what is accepted and deployed.
- Production addresses are agreed as `taxkit.dev` and `api.taxkit.dev` on
  Cloudflare via Alchemy. Check the SPEC and `docs/evidence/` for what is
  actually deployed before claiming it.

## Capabilities and Constraints

Confirmed capabilities:

- Three calculators, all targeting the Australian 2025–26 year: take-home pay
  (PAYG only), pay withholdings (PAYG only) and annual income tax (income tax,
  LITO, Medicare levy). STSL (study and training support loan) rules exist as
  a package. No other jurisdictions or years.
- Public API routes for calculator metadata, graph and calculate, with
  generated OpenAPI reference.
- Schema-guided expected errors with stable message text, descriptor-backed
  help and no echo of rejected values.

Agreed product constraints from the rebuild spec:

- Explicit Calculate action; editing inputs invalidates the previous answer.
- Result shows the main answer with an expandable breakdown, assumptions,
  supported year and rule sources.
- Calculations are temporary: no saved calculations, no tax figures in URLs,
  no calculation logs, no personalised share images.
- Anonymous access with request limits; no accounts or payments.
- Analytics are page views and calculator names only, with no consent dialog
  and no calculation details.
- Public Markdown covers accepted docs and reference pages only; no personal
  report downloads.
- The browser never runs a second tax engine.

Licence: MIT (`LICENSE`, every package declares `"license": "MIT"`),
chosen by Cooper on 2026-10-10. Copyright stays with Cooper Corbett. The MIT
text says nothing about patents, so surfaces must not claim a patent grant.

Explicitly undecided or absent:

- Search for docs is deferred.

## Brand Commitments

- Name: TaxKit, written as one word with capital T and K.
- Ownership: Cooper Corbett's personal open-source project under the GitHub
  account `crcorbett`. No Tilt Legal branding or attribution anywhere.
  Confirmed 2026-10-07.
- Not tax advice: results are calculations from stated facts. Surfaces must
  say so where a person could mistake a report for advice and must never
  imply personal advice. Confirmed 2026-10-07.
- Voice as practised in the docs: plain, direct, source-cited, no marketing
  superlatives. Australian English in maintainer docs.
- Visual identity (confirmed 2026-10-09) lives in the Paper file "TaxKit —
  Identity": the Stand mark, a T whose crossbar is a balance beam, drawn on a
  9 × 9 module square; the lockup in Onest SemiBold; and Palette D, black and
  white with four colours that only ever mean a tax rate. The master SVG path
  is `M0 0H9V1H5V5A3 3 0 0 0 8 8V9H1V8A3 3 0 0 0 4 5V1H0Z` on a `0 0 9 9`
  viewBox. No brand asset files are in the repository yet.
- Trademarks: Cooper Corbett keeps the TaxKit name, the Stand mark and the
  lockup, which are unregistered. `TRADEMARKS.md` sets out permitted use;
  forks need their own name. Confirmed 2026-10-10.
- Brand line: "Tax rules that compile." Chosen by Cooper on 2026-10-10. It
  restates the typed-and-deterministic positioning; keep it beside the lockup
  and do not stretch it into a claim about tax outcomes.

## Evidence on Hand

- Official source citations inside rule packages, for example the ATO
  Schedule 1 withholding formulas, Schedule 8 STSL formulas, resident tax
  rates, LITO and Medicare levy reduction pages.
- Golden tests in `packages/rules/au/*/test` and known-result contracts the
  rebuild must preserve (CSF-001).
- 62 published MDX pages in `packages/docs-content/content` with a reader
  persona per page in `packages/docs-content/navigation.json`.
- Generated OpenAPI snapshot and route fixtures under `packages/api/http`.
- Deployment and verification receipts under `docs/evidence/`.

Absences future work must not fabricate: no customers, testimonials, case
studies, usage numbers, press, pricing, published package, or production
deployment.

## Product Principles

1. Correctness is visible. Show the year, rule pack, parameters and trace
   behind every number; never show a figure the engine cannot justify.
2. One owner per contract. Schemas, errors and operations live with the
   calculator and are reused unchanged by SDK, HTTP, RPC and agent surfaces.
3. Fail explicitly. Unsupported years, invalid facts and overloaded requests
   return typed, documented failures rather than approximations.
4. Keep nothing personal. Facts travel in a bounded request and die with it.
5. Say what exists. Scope is three Australian calculators for one year;
   surfaces state limits plainly instead of implying coverage.

## Accessibility & Inclusion

Keyboard, focus management, loading, error and cancellation states are
acceptance criteria for the calculator surface (CSF-004), and the docs app
already ships a skip link, focus-visible outlines and heading focus after
navigation. The built-docs proof includes representative accessibility checks.
The target is WCAG 2.2 AA, chosen by Cooper on 2026-10-10. No audit has
confirmed conformance yet, so surfaces must not claim it.
