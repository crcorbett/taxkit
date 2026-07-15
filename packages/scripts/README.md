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

Each invocation records its exact executable, arguments, working directory,
exit code, standard output and standard error in a schema-backed outcome.
Non-zero exits become `ReleaseCheckFailedError`; Effect Platform execution
failures become `ReleaseCommandExecutionError`.

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
fail-fast behavior and success/failure rendering.

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
