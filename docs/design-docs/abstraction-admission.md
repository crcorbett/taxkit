---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# Abstraction Admission

Shared abstractions are accepted only when they make an owned policy easier to
understand, substitute and prove. Reuse by itself is not enough.

## Admission Contract

A proposed helper, hook, provider, service, layer, component family or package
must record all of the following in its spec, task evidence or review:

| Requirement | Required evidence |
| --- | --- |
| owner | one app, package or module owns the abstraction and its changes |
| semantic weight | it names an invariant, policy, lifecycle or boundary rather than hiding a few expressions |
| second use | at least two real consumers exist, or one production consumer has a genuine substitution point such as live and deterministic test layers |
| simpler graph | the before/after call graph removes repeated policy or dependencies and is easier to trace despite the new indirection |
| focused proof | tests exercise the owned policy, contract or substitution without duplicating the implementation |

If any entry is missing, keep the behavior inline or app-local. Do not create an
abstraction in anticipation of future consumers.

## Rejected Shapes

- one-use Effect runners, decoder wrappers, error mappers or layer factories
- hooks or providers that only move route restoration, fetching or service
  acquisition away from the direct owner
- wrapper components that only rename props or add another JSX level
- helpers that split one readable `pipe` or `Effect.gen` program into
  navigation-heavy fragments
- packages created for planned ownership before a manifest, exports, consumers
  and verification exist

Framework-required entrypoints and colocated private functions do not need a
ledger entry unless they become a shared policy surface. A small function can
still be admitted when it names a real boundary and the remaining requirements
are satisfied; line count is not evidence either way.

## Review

Static lint cannot prove semantic weight or call-graph improvement. Review the
ledger against the final diff and call graph, verify each claimed consumer,
and record boundary-matched evidence for every admission requirement. Reject
speculative reuse or tests that merely call through the abstraction. A fixed
review-pass count is not evidence. Removal is the default when an abstraction
loses its owner, substitution point or simplifying effect.

## Related Docs

- [Effect services](../architecture/effect-services.md)
- [Frontend](../architecture/frontend.md)
- [Testing and quality](../architecture/testing-and-quality.md)
