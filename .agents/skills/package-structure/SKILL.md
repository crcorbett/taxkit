---
name: package-structure
description: Create, audit, migrate, or validate TaxKit packages using the repository-owned workspace, namespace, source-condition, Effect boundary, export, exception, and verification contract. Use whenever adding or changing a package or package boundary here.
---

# Repository Package Structure

Use this skill directly. Read the [repository profile](references/repository-profile.md);
repository files and installed types are authoritative. A separately installed
global `package-structure` skill may provide a safe renderer or additional
validation, but this workflow never depends on its filesystem path.

Before editing:

1. read applicable `AGENTS.md`, every relevant `docs/**` and `README*`, root
   and package manifests, TypeScript/lint/test config, and representative
   packages;
2. inspect `git status --short` and preserve unrelated work;
3. name the capability, callers, untrusted boundaries, and runtime owner;
   reject a package for one-use code, pass-through wrappers, or a generic
   helper bucket;
4. apply the profile's namespace, source condition, build/publish exception, and
   forbidden paths;
5. select `effect-service`, `rpc`, or `http-api` from the semantic owner, then
   run the profile's focused and aggregate commands.

## Required separation

The canonical Effect-service package keeps Schemas/brands/types in `schemas.ts`, expected
tagged failures in `errors.ts`, named `Context.Service` operations only in
`service.ts`, production SDK/config/resources in `live.layer.ts`, deterministic
substitution in `test.layer.ts`, reusable fixtures/observations in
`src/__testing__/`, and behavior tests under `test/`. Use a profile-listed
capability-owned filename only where this repository has a deliberate existing
exception. RPC and HTTP API packages
depend inward on the domain service and own transport only; generated or raw
clients never escape their live/test Layers.

Keep Effect programs lazy, flat, composable, readable, and sequential. Keep
one-use mapping, decoding, and error handling beside the operation. Extract
only demonstrated reuse, independently tested policy, real I/O, or resource
lifetime. This no-helper-sprawl rule forbids helper sprawl, pass-through
helpers, and `utils` dumping grounds as design failures, not formatting issues.
Decode unknown values once at ingress and encode only at outward boundaries. Reuse
owning Schemas, schema-derived types, branded identifiers, services, Layers,
and tagged errors.

Reject generic SDK callbacks, raw clients, raw `id: string`, primitive semantic
config, `instanceof` policy, unchecked provider output, package-local runtime
execution, service-aware presentation leaves, and duplicated domain policy.
Use Schema-backed `Config`/`ConfigProvider`, keep secrets redacted until
immediate use, and prove source/types/default plus actual packed exports when a
package is publishable.
