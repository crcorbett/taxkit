# Repository harness contract

This compatibility entrypoint routes to the structured, self-contained harness
contract under [`harness/`](harness/contract-map.md). No external methodology
lookup is required.

For material repository work, load:

1. [`contract-map.md`](harness/contract-map.md) for applicability and lifecycle;
2. [`invariant-register.md`](harness/invariant-register.md) for stable rule IDs;
3. [`context-and-ownership.md`](harness/context-and-ownership.md) for truth and
   semantic ownership;
4. [`proof-and-evaluation.md`](harness/proof-and-evaluation.md) for journeys,
   delivery, receipts, evaluation, and terminal states;
5. [`operations-and-authority.md`](harness/operations-and-authority.md) when
   operations, providers, releases, controls, or automation are in scope; and
6. [`repository-variation.md`](harness/repository-variation.md) when creating or
   changing a repository-local profile.

Use the JSON Schemas and templates under `assets/harness/` for repository
profiles, authority envelopes, critical journeys, bounded receipts, and control
records. The global `repo-structure` skill owns structured audit scope,
findings, acceptance crosswalks, and deterministic validation.

The invariant register and artifact field contracts are fixed across
repositories. Only paths, commands, jobs, journeys, environments, providers,
lifecycle facts, and fully qualified exceptions vary through the repository
profile.
