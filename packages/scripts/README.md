---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: package-readme
confidence: high
---

# Scripts

`@taxkit/scripts` owns cross-cutting repository command orchestration. Its
implemented release-readiness command runs the existing verification and
package-owned release gates as one ordered, typed Effect program.

## Ownership

This package owns:

- schema-backed release check definitions, command outcomes and the final
  readiness report
- the `ReleaseCommandRunner` service contract
- the Effect Platform child-process live layer and deterministic test layer
- the release-readiness program, rendering policy and Bun runtime entrypoint
- the narrow `@taxkit/scripts/release-readiness` source/types/default export
  for the HGI-203 proof packet, accepted-summary and journey-inventory Schemas

It does not own the validators it invokes. SDK packing and downstream checks
stay in `packages/sdk/typescript`, docs validation and browser proof stay with
the docs packages/app, API smoke stays in `apps/api`, and Changesets, Turbo,
lint, tests and builds remain behind their canonical root or package commands.

## Command

From the repository root, run:

```sh
bun run release:check
```

The command runs these checks sequentially and stops after the first typed
failure:

1. `bun run verification`
2. `bun run test`
3. `bun run build`
4. `bun run docs:validate`
5. `bun run --filter=@taxkit/sdk check-packed-artifact`
6. `bun run --filter=@taxkit/sdk validate:downstream`
7. `bun run --filter=api smoke`
8. `bun run --filter=docs test:browser`
9. `bun run changeset status --verbose`

Each invocation records its exact executable, arguments and true exit code in a
schema-backed outcome. Complete stdout and stderr are streamed through a
cross-chunk redactor into unique ignored files under `tmp/release-readiness`;
the default receipt includes only bounded excerpts, repository-relative paths
and SHA-256 digests. Absolute macOS and Linux home-directory prefixes, Windows
drive-user-home paths and UNC user-home paths, credential fields, bearer values
and common token prefixes are removed before any byte reaches retained detail.
The same rule covers file URLs and diagnostic field prefixes without treating
ordinary relative paths as host disclosure.

One run has one `release-<millisecond>` identity and one immutable JSON attempt
receipt. The receipt binds the base commit and changed-content manifest digest
that the runtime verified before starting. Verification hashes every sorted,
unique, safe path recorded in that content manifest and rejects any undeclared
evidence-ledger exclusion. The receipt then records the terminal state,
observed exit or `null`, last successful check, exact target, detail artifacts,
provenance, postcondition, recovery, safe resume trigger, rollback, limitation
and non-claim. Presentation reads and verifies that receipt plus every retained
detail; it never reruns completed work merely to recover output.
Non-zero exits and process, interruption, early-pipe, missing-detail,
corrupt-detail or false-success states remain distinct typed failures.

To reconstruct bounded terminal output from an existing attempt without
executing any release check again, pass its repository-relative immutable
receipt path and digest:

```sh
RELEASE_ATTEMPT_PATH=tmp/release-readiness/release-123.json \
RELEASE_ATTEMPT_SHA256=sha256:<64-hex-digest> \
bun run release:present
```

`release:present` Schema-decodes both configuration values, verifies the
receipt and every referenced detail digest, and writes or reuses one immutable
presentation sidecar. A missing/corrupt detail or conflicting sidecar fails
closed.

Complete command details remain transient and ignored. While a proof packet is
`candidate`, its accepted-attempt verifier requires the local immutable receipt
and every detail file. After independent acceptance changes the packet lifecycle
to `accepted`, clean clones verify the bounded committed summary without
requiring prohibited raw logs. `release:check` then refuses to start another
attempt until a maintainer prepares a new `candidate` packet and exact content
manifest. The runtime compares that candidate's base commit, manifest path and
manifest digest with the accepted summary and rejects an exact reuse even if
someone changes the packet lifecycle back to `candidate`; it never silently
binds a new run to an old candidate identity.

## Runtime Shape

```text
root release:check
  -> package release:check
  -> BunRuntime entrypoint
  -> BunServices.layer
     -> Path.fromFileUrl -> workspace root
     -> ReleaseCommandRunnerLive -> ChildProcessSpawner
  -> runReleaseReadiness -> ReleaseCommandRunner
  -> ChildProcess Command
  -> existing root and package-owned commands
```

`runReleaseReadiness` is the primary linear Effect program. The service
contract and live layer depend only on the Effect `ChildProcessSpawner`
capability. The Bun runtime entrypoint resolves the repository root with
`Path.fromFileUrl`, composes `BunServices.layer`, and is the only place that
provides the host implementation or executes the completed Effect.

## Testing

```sh
bun run --filter=@taxkit/scripts test
bun run --filter=@taxkit/scripts check-types
bun run --filter=@taxkit/scripts build
```

The deterministic layer uses `HashMap` and `Ref` to record invocations without
starting processes. Tests prove command order, exact arguments and working
directory, schema-backed outcomes, non-zero failure policy, process failures,
fail-fast behavior, success/failure rendering, large-output redaction and
bounded receipt presentation. Live-layer coverage starts a real child process
and reads back its complete sanitized stdout/stderr artifacts. Boundary fixtures
reject malformed journeys, incomplete packets, escaping paths, missing files
and mismatched candidate/detail digests. Run the focused route with `bun run
test:release-readiness`.

The production Knip profile has exact `exports` exceptions only for
`evidence.boundary.ts` and `live.layer.ts`: their exported decoder, verifier and
stream-redactor seams are executed by production code and directly exercised by
the focused tests, but are intentionally absent from the package public export
map. The normal Knip graph, package index and focused tests remain the owners for
all other unused exports.

The package root does not expose proof internals or a generic digest helper.
Repository tooling that must validate the accepted HGI-203 handoff imports only
the three Schemas from `@taxkit/scripts/release-readiness`; hashing remains at
the consuming filesystem boundary. The subpath carries `bun` and `source`
live-source conditions plus `types` and `default` build conditions, so
repository tooling and direct Bun tests resolve live source while built
consumers resolve declarations and JavaScript.

## Local proof boundary

[`../../docs/verification/critical-journeys.json`](../../docs/verification/critical-journeys.json)
owns exactly five consumer-visible journeys: calculator direct use, packed SDK,
HTTP API, docs runtime and release closure. The initial retained packet is
[`../../docs/evidence/releases/HGI-203-local.json`](../../docs/evidence/releases/HGI-203-local.json).
Both are local evidence only: they do not prove npm publication, a tag, a
release, deployment, provider state, deployed SSR/hydration or public
availability.
[`../../docs/evidence/releases/HGI-203-failed-attempts.json`](../../docs/evidence/releases/HGI-203-failed-attempts.json)
preserves bounded provenance for superseded failures without placing raw
experiments in the default documentation route.

## Guardrails

- Add orchestration only when a workflow genuinely crosses package owners.
- Record the abstraction-admission evidence for each new cross-owner workflow:
  owner, semantic policy, consumers or substitution, simpler graph and focused
  tests.
- Invoke canonical commands; do not copy their validation logic into this
  package.
- Keep one primary linear Effect program and one runtime execution boundary.
- Keep command failures tagged and outcomes schema-backed.
- Add a Changeset for package-facing command or contract changes.
- Do not import this package into browser-safe SDK, calculator, rule or engine
  entrypoints.

## Related Docs

- `docs/architecture/package-ownership.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/testing-and-quality.md`
- `docs/design-docs/abstraction-admission.md`
- `docs/standards/versioning.md`
