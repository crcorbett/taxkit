# Packed consumer check

Run this when `taxkit` exports, packed files or supported dependencies
change. It packs the SDK locally and installs it in a fresh consumer; it does
not touch npm.

The SDK archive includes its private TaxKit modules. Only Effect remains an
external runtime dependency; the consumer installs no other TaxKit archive.
The first command checks every path in the package's `exports` map; the
[SDK guide](../../packages/sdk/typescript/README.md#public-paths) lists them.
SDK 5 removed every former path and alias, and Node resolves no path outside
that map.

1. `bun run sdk:check-packed-artifact` builds the SDK, packs it and checks the
   declared files and export paths in the tarball.
2. `bun run sdk:validate-downstream` installs that tarball in a temporary
   consumer, type-checks it and runs its public imports.

Both commands remove their temporary directories. A failure names the step that
failed. Packing should change no tracked file; if it does, inspect the diff
before removing anything.

A passing run shows that the local package works for a fresh consumer. It does
not show that npm holds the package or that a published version was installed.

The downstream fixture retains its original saved hashes. Its narrowly scoped
history comparison restores approved Medicare fragments and the pay ruleset
edition/exact decimal trace for the unchanged $3,462 fortnightly example.
Unrelated values remain byte-sensitive. New rounding and salary-sacrifice
results are qualified by the rule packages' regression tests; do not regenerate
historical hashes to accept a calculator correction.
