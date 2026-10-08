# Lint, Review, and Migration

## Contents

- [Establish the boundary](#establish-the-boundary)
- [Static restrictions](#static-restrictions)
- [Portable Oxlint rules](#portable-oxlint-rules)
- [Structural tests](#structural-tests)
- [Review sequence](#review-sequence)
- [Migration inventory](#migration-inventory)
- [Recommended migration order](#recommended-migration-order)
- [Incremental strictness](#incremental-strictness)
- [Review blockers](#review-blockers)
- [Completion evidence](#completion-evidence)

## Establish the boundary

Define owned TypeScript paths and exact exceptions:

- application/package source: strict;
- tests: strict, with deterministic test APIs;
- host adapters: narrow allowed bridge;
- generated/vendor: excluded by exact path;
- configuration files: classify individually;
- migrations: strict for I/O and errors even if historical data shapes are plain.

Do not disable a rule repository-wide for one host constraint.
After moving code, run the actual Oxlint command on negative fixtures under the
new packages, apps, tools and test paths. Include a valid fixture so the check
also proves the intended native Effect code is accepted. A rule configured only
for the former app path can silently leave the new package unprotected.

## Static restrictions

Use lint/architecture tests to forbid or restrict:

- `async` functions and `new Promise`;
- raw `fetch`;
- direct environment access;
- `console.*`;
- ambient time/random/timers;
- unchecked JSON;
- `any` and unsafe assertions;
- `Effect.run*` outside runtime files;
- provider SDK imports outside approved live adapters;
- generic raw client exports;
- mutable globals;
- native Map/Set in domain paths;
- package imports of application runtimes.

Rules should report the approved alternative and exact adapter path policy.

## Portable Oxlint rules

The canonical [Effect policy asset](../../assets/oxlint/effect-policy.ts) carries
the checks adapted from DAW's owned rules at `e47ecfb` and its qualified portable
extensions. Load this one owner
rather than combining unchanged plugins from several repositories. It uses
Effect and `@oxlint/plugins`; select exact compatible versions and qualify the
asset with the receiving repository's actual Oxlint command before enabling it.
Installed skill copies are distribution outputs, not editing surfaces.

For a repo with this skill copied under `.agents/skills/strict-effect-ts`, add
that asset to the existing config's `jsPlugins` and choose these rules:

```ts
plugins: ["typescript"],
jsPlugins: ["./.agents/skills/strict-effect-ts/assets/oxlint/effect-policy.ts"],
rules: {
  "strict-effect/no-unchecked-index": "error",
  "strict-effect/no-native-at": "error",
  "strict-effect/runtime-file-convention": ["error", {
    webSourceRoots: ["apps/web/src"],
  }],
  "strict-effect/tagged-error-name": "error",
  "strict-effect/error-constructor-new": "error",
  "strict-effect/no-promise-workflow": ["error", { allowedFiles: [
    "apps/web/src/lib/api/binding.adapter.layer.ts",
  ] }],
  "strict-effect/no-unsafe-option-unwrap": "error",
  "strict-effect/no-unchecked-json": "error",
  "strict-effect/no-runtime-outside-boundary": ["error", {
    allowedFiles: ["apps/web/src/lib/runtime.server.ts"],
  }],
  "strict-effect/no-native-work": "error",
  "strict-effect/no-imperative-collections": "error",
  "typescript/no-explicit-any": "error",
  "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
  "no-restricted-globals": ["error", {
    globals: ["fetch", "setTimeout", "setInterval", "Map", "Set"],
    checkGlobalObject: true,
  }],
  "no-restricted-properties": ["error",
    { object: "process", property: "env" },
    { object: "Bun", property: "env" },
    { object: "Date", property: "now" },
    { object: "Math", property: "random" },
  ],
},
```

Apply the checks to all owned TypeScript, including tests, tools, config and
infrastructure. Boundary paths are exact relative paths from Oxlint's working
directory; wildcards and parent paths do not grant an exception. Promise adapters
may declare a Promise return and use Promise.resolve; async/await, construction
and chains remain forbidden. The rule permits Effect's own catch operation.

`no-unsafe-option-unwrap` follows Effect imports, including aliases, to reject
Option.getOrThrow. `no-unchecked-json` rejects JSON.parse/stringify, their globalThis spellings and
raw web `.json()` calls. Use checked Schema codecs for both directions.
`no-runtime-outside-boundary` rejects ManagedRuntime.make and execution calls
outside approved files. Execution method names are reserved syntactically; do
not use runPromise or runSync as unrelated service method names. Import analysis
uses top-level bindings, not TypeScript's type checker; it does not prove that
aliased global JSON/Promise objects are safe. Keep code review and the other
strict checks alongside these rules. Actual negative and positive CLI fixtures
must prove the receiving config enables every promised rule.

The generated repository configuration also supplies actionable messages for
those standard restrictions. `no-native-work` rejects throws, try/catch, direct
environment reads, native current-time reads and ambient randomness. A Date
constructed from an explicit checked timestamp is a pure conversion and remains
allowed. The rule recognises direct and globalThis/window spellings; it does
not resolve arbitrary aliases, shadowing or dynamically computed names. Keep
review for those cases. It grants no whole-file host exception.

The receiving repository owns its workspace import rule and generated export
inventory. Enforce imports, re-exports and literal dynamic imports: packages
cannot depend on apps, and frontend code may import domain contracts and
transport clients rather than backend handlers, source loaders or live domain
implementations. Derive public export facts from manifests and keep a separate
explicit frontend policy. A successful typecheck alone cannot prove this
direction: a forbidden app export can still be valid TypeScript.

Merge these entries into the existing config; do not replace its other checks.
When replacing `unicorn/throw-new-error`, turn off only that overlapping rule
and record why. Keep prohibitions on throwing enabled.

| Check                     | Policy and limits                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no-unchecked-index`      | Rejects all computed member reads, including literal keys. Use Effect Array/Record lookup and handle absence. Adopt this stricter policy deliberately; an unavoidable host access needs an exact exception.              |
| `no-native-at`            | Rejects reads/calls/aliases of `.at`; computed spellings are caught by the lookup rule. It matches the property name, not the receiver's inferred type.                                                                  |
| `runtime-file-convention` | Rejects unqualified/reversed runtime filenames under configured source roots. Use `runtime.server.ts` and `runtime.client.ts`. A production browser build separately checks imports.                                     |
| `tagged-error-name`       | Requires the class, self type and literal tag to agree. Recognises the current Schema.TaggedError factory through named/aliased/namespace/root imports.                                                                  |
| `error-constructor-new`   | Requires `new` for `*Error` constructors, while allowing imported `Schema.TaggedError`, `Schema.Error` and `Data.TaggedError` class factories. Type-only imports and local functions do not grant the factory exception. |

The import resolver follows top-level imports and static member paths. It is
not a complete scope/type analyser or arbitrary local-alias resolver. Keep
shadowing prohibited/reviewed; do not claim this syntactic check proves every
possible call. A rule that only matches a removed API can stay configured yet
do nothing. Verify installed exports and exercise the current spelling.

Extend the existing fixture suite with invalid _and valid_ cases for imports,
aliases, factory calls and configured runtime paths. Require the actual
Oxlint command to examine the intended file, return a failing exit with the
expected rule for a negative case, and return cleanly for the valid case.
Regex-only tests do not prove that the plugin is loaded. Keep imported snapshots
unchanged with their revision/hash and disposition; edit owned portable rules
at their canonical owner. Document exact adapter exceptions and false positives,
such as `Output.map` being mistaken for an array method.

## Structural tests

Add tests that inspect:

- package exports;
- forbidden dependency direction;
- service operation error/requirement shape where TypeScript assertions are practical;
- runtime file locations;
- receipt Schemas;
- provider client privacy;
- application Layer ownership.

Prefer enforcement that fails with a semantic message over a fragile snapshot.
Use the existing lint, render and contract checks before adding another suite.
Do not pin a file count that changes whenever a legitimate guide is added;
check required owners, inventory consistency and distribution limits instead.
Cached checks must include files they read outside their workspace, including
shared configs, templates and copied skill assets. Re-run fresh when correcting
cache inputs; a replayed passing result does not verify changed input.

## Review sequence

Review changed code in this order:

1. external Schemas and brands;
2. error vocabulary;
3. service contract;
4. live/test Layers;
5. runtime boundary;
6. concurrency/lifetime;
7. observability;
8. tests;
9. exports and file ownership.

This catches architectural leaks before line-level style.

## Migration inventory

Search and classify:

- Promise/async chains;
- throws and catch-all handling;
- raw environment/config;
- raw JSON and assertions;
- raw HTTP/SDK clients;
- nullable domain values;
- mutable collections/state;
- timer/retry/polling loops;
- event callbacks;
- console logging;
- repeated runtime execution.

Build a table:

| Operation | Current behaviour | Target Effect owner | Error/Schema | Test | Risk |
| --------- | ----------------- | ------------------- | ------------ | ---- | ---- |

Migrate one coherent operation and its real inputs/outputs at a time.

## Recommended migration order

1. Add Schemas/brands at ingress.
2. Define tagged errors.
3. Define service contract.
4. Wrap live transport/SDK in a Layer.
5. Add memory/test Layer and contract tests.
6. Move orchestration into a flat Effect program.
7. move execution to one application boundary;
8. replace time/state/concurrency primitives;
9. add structured observability;
10. restrict old escape hatches;
11. remove deprecated exports.

Keep compatibility adapters temporary, private, and tracked for removal. Do not publish both a strict service and a permanent raw client.

## Incremental strictness

For a large codebase:

- make changed packages strict first;
- forbid new violations on the diff;
- add architecture checks around new boundaries;
- convert call sites in coherent slices;
- keep a counted debt list with owner/removal condition;
- prevent the compatibility surface from expanding.

Do not claim the repository is fully strict while unclassified escape hatches remain.

## Review blockers

Block the change when:

- expected failure is thrown or converted to defect;
- external data is asserted rather than decoded;
- SDK/raw client crosses the service boundary;
- public operations have accidental requirements;
- package owns a runtime;
- time/concurrency/resource lifetime is unmanaged;
- secrets can reach logs/errors/receipts;
- success-only tests omit material failure/interruption;
- a broad exception weakens unrelated code.

## Completion evidence

Report:

- changed owned paths;
- strict searches and classified exceptions;
- typecheck/lint/test results;
- Layer/contract tests;
- runtime boundary;
- skipped live integration;
- remaining debt and non-claims.

## Immutable collection enforcement

`no-imperative-collections` rejects loops, let/var, assignments, updates, delete,
native array traversal/mutation/constructors, mutable/transient Effect collection
methods, switch and manual `_tag` equality decisions. It accepts actual imported
Effect functional operations (including aliases) and native Alchemy Output
transformations. A similarly named import from another library grants no allowance.
It is a syntax/import check, not a type checker: arbitrary local aliases, computed access and indirect mutation still require
the other rules and review. Collection namespace allowances check lexical scope
so a shadowed name does not inherit its import's permission. A
readonly return type proves neither immutable construction nor Schema ownership.

Where a host must write one property, options can name `allowedAssignments` with
`file` and `target`, for example the exact native-entry test and its
`globalThis.__ALCHEMY_RUNTIME__` flag restored by acquire/use/release. A genuine
provider method sharing an array method name can use `allowedMethods` with an
exact `file`, `receiver` and `method`. Parent paths and globs grant neither
allowance. Nearby mutations, other files and loops remain forbidden. Qualify the
allowed operation and its cleanup before adding the entry.

Actual CLI fixtures must cover apps, packages, tests, tools and configuration;
assert file count, exit code and rule name and include valid native operations.
Generated repositories keep these fixtures in their normal verification command.
Offline render tests also reject a removed/disabled rule and broadened host
allowance. Static checks cannot prove duplicate Schema ownership, repeated trusted
decodes, source encoding or cache equality/cancellation. Review those contracts
and test meaningful malformed ingress, old bytes/hashes and full address sharing.
