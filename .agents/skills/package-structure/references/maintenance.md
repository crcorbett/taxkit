# Maintenance

Canonical ownership:

- `assets/<variant>` owns generated files.
- `references/variants.md` owns human variant selection.
- `scripts/render_package.py` owns rendering and write safety.
- `scripts/validate_package.py` owns structural/semantic package checks.
- `scripts/validate_ecosystem.py` owns scoped stale-pattern checks.
- the repository-local package profile owns only local package facts;
- the repository-local docs-maintainer profile owns local documentation,
  lifecycle, runbook, proof, authority, archive, checks, and mirror facts.

The docs-maintainer profile routes the docs index, architecture, runbooks,
proof, critical journeys, authority, evidence/archive, README rules, exact
checks, generated owners, and mirror policy. Do not copy those local facts into
this global skill or the package profile.

When Effect or transport APIs change:

1. research the upstream library through DeepWiki/official versioned sources;
2. update the appropriate canonical asset and reference;
   remove outdated examples and compatibility branches rather than retaining
   several API generations;
3. render every variant from a provisional snapshot;
4. install, resolve exports, typecheck, test, and build all variants;
5. replace the snapshot only after compatibility passes;
6. rerun structural validation and fresh-context scenarios.

Use the existing renderers and contract checks for this qualification. Compile
generated code, not only the asset text. Exercise representative success and
typed absence/failure through the same service contract and keep the same
public trace names in live/test implementations. Do not add a suite for every
template token, constant or deterministic forwarding method. Describe which
API/version combinations were actually checked and retain unqualified limits.

Do not copy templates into repository-local overlays. Update a local profile
only when that repository's facts changed.
