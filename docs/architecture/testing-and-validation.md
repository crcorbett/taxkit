# Rule and calculation tests

A wrong answer is the most serious failure TaxKit can have. These tests run in
`bun run test`; [testing and quality](./testing-and-quality.md) describes the
other checks.

## Rule packages

Each package under `packages/rules/au/*` keeps three kinds of test in `test/`:

- **Calculator tests** (`take-home-pay.test.ts`, `annual-tax.test.ts`,
  `take-home-pay-stsl.test.ts`) run complete scenarios through the rule-pack
  Layer. They include golden cases from official ATO examples and known
  results (for example Schedule 8 example 3, and annual incomes of $30,000,
  $50,000 and $80,000), thresholds such as the tax-free threshold and the
  nil-rate band, scale selection, pay periods, rejection of malformed or
  negative input, and the previous year's pack where one exists. A
  determinism test runs the same scenario twice and compares the traces, and
  trace tests pin the tree shape and the ledger explanation order.
- **Parameter table tests** (`parameter-tables.test.ts`) check each official
  table's owned relationships: malformed rows, gaps, overlaps and open middle
  bounds are rejected both on construction and in the saved representation.
- **Rule graph tests** (`rule-graph.test.ts`) validate each rule pack's graph,
  pin its published rule inventory and each rule's descriptor and official
  parameters, and check that missing input facts, parameter source drift and
  overlapping effective periods are reported.

A change to a rule, parameter or year updates the golden cases and pins in the
same package. Keep historical fixtures; do not regenerate them to accept a
calculator change.

## Engine and contracts

- `packages/core/test` covers money, decimal dollars and dates. `money-laws`
  is a property test: generated cents must round-trip through formatting and
  `fromDecimal`.
- `packages/calculators/test` covers the catalogue summaries, the public
  calculator service, admission, the shared work pool and the browser form.
- `packages/sdk/typescript/test` covers the plain, Effect and AU entry points,
  client lifetime, and parity between HTTP fixtures and SDK full runs.
  `bun run release:check` adds the packed-archive checks.

## Placement and imports

Tests live in each workspace's `test/` directory, outside `src`. Black-box
tests import the package's public paths:

```ts
import { AuTakeHomePay2025_26_Live } from "@taxkit/rules-au-pay";
import { AtoSchedule1TableDescriptor } from "@taxkit/rules-au-pay/parameters";
```

Use relative `../src/...` imports only for deliberate white-box tests of
private modules that are not part of the package API.
