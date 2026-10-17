# Vendored strict Effect policy

`effect-policy.ts` is based on the copy of the portable Oxlint asset published
in Commonplace `development-workflows` 0.7.1
(`skills/strict-effect-ts/assets/oxlint/effect-policy.ts`, SHA-256
`73dc457b8fb48be09e79d619620f9c7227181b0095384897b25066bfbc601ff0`).

Two local corrections qualify this asset against installed Effect 4.0.2:

- AST traversal cycle guards use reference identity. Effect structural equality
  recursively hashes cyclic host nodes; profiling the native-pair fixture found
  this dominated runtime and caused full lint to exhaust memory.
- Static-Layer detection follows exhaustive Match pipelines to their branch
  values, so wrapping a Layer factory in Match cannot bypass the rule.

When updating the upstream asset, preserve these corrections until the selected
release includes them, update this provenance, and run `bun run test:tools` and
`bun run lint`. The actual CLI fixture in `native-request-rules.test.ts` covers
Match factories and permits native inline composition callbacks.
`oxlint.config.ts` chooses the rules and TaxKit's own paths; the actual-Oxlint
fixtures under `tools/oxlint` show which forms each enabled rule accepts and
rejects.
