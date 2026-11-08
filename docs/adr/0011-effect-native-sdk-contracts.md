# Effect-native SDK contracts and checked money

Status: accepted

TaxKit uses one Schema-owned domain model and native Effect execution for money,
facts, rules and calculators. The Effect and plain TypeScript interfaces share
the same checked values and inferred reports. SDK 5.0.0 replaced the previous
contract in one hard cutover: every superseded implementation, alias and
compatibility path was deleted in the same change, with no deprecation period.

## Context

The previous SDK let descriptors pair unrelated calculator ids and Schemas,
silently stripped extra inputs (a salary-sacrifice field could vanish from a
base-pay calculation), encoded negative money as text its own decoder
rejected, validated report fields independently of each other, used custom
result classes instead of Schemas, and accepted module arguments that execution
ignored. Each gap let a caller hold a value the engine did not actually check.

## One domain, two interfaces

Effect owns orchestration, dependencies, lifetime and failure. Domain Schemas,
error Schemas, brands, native `Result` and `Option` are the same objects in both
interfaces:

| Operation | Plain interface | Effect interface |
| --- | --- | --- |
| Money parsing and checked arithmetic | `Result<A, MoneyError>` | `Effect<A, MoneyError>` |
| Calculation | `Promise<Report>` or `Promise<Run<Report>>` | `Effect<Report, E, R>` or `Effect<Run<Report>, E, R>` |
| Expected failures as data | `Promise<Result<A, E>>` | `Effect.result` |

The Promise host stays private to the plain interface: one-shot calls are
scoped, and a reusable client owns one lazy runtime released by `dispose()` or
`[Symbol.asyncDispose]`. Effect consumers provide static Layers in their own
runtime and substitute the calculator service with native test Layers. The
[SDK guide](../../packages/sdk/typescript/README.md#public-paths) lists the
entry points.

## Money

Core owns one nominal `Money` Schema: branded safe-integer cents and the literal
currency `AUD`. A number or object literal is not Money, and Money does not
coerce to a number. `NonNegativeMoney` is a separately branded refinement used
for gross pay, salary sacrifice and annual taxable income; signed Money remains
valid for adjustments and arithmetic. `fromDecimal` accepts exact decimal-dollar
text with at most two fractional digits and never rounds silently. The decimal
codecs round-trip every value they admit. `round` requires an explicit
statutory rounding policy; `add` and `subtract` check overflow.

## Calculators, facts and rules

Each rule package defines its calculator once: branded id, jurisdiction and
year literals, scenario and report codecs, expected-error Schema and typed
execution over its rule-pack Layer. SDK descriptors, the catalogue, request
unions and documentation derive from that definition, so a descriptor cannot
replace a registered calculator's Schemas. Dynamic selection keeps calculator
and input correlated in a discriminated union.

Scenario Schemas require every fact the selected rule pack uses and admit no
input it ignores. Missing facts or parameters remain in the Effect requirements
until supplied. Fact Schemas, services, rule descriptors and rule-pack Layers
are public, so callers compose custom rules with native Layers rather than a
plugin registry.

## Boundaries and errors

Unknown input is decoded once with the selected calculator's codec, rejecting
excess properties at every depth and reporting all issues. Calculator HTTP v2
and MCP accept the same correlated `calculatorId` and `payload` envelope and
return the identity beside the report. Public failures are a closed union of
Schema-tagged errors with stable reason codes, calculator identity and bounded
field paths, and never include rejected amounts, raw causes or stacks. Native
`Result` replaces the former custom result types.

Report Schemas check their accounting relationships: gross equals cash net plus
withholdings (plus sacrifice where applied), ledger totals match their
components, and annual liability matches the documented flooring. Effect 4.1.2
can drop whole-record checks when a bare encoded view is extracted, so each
report exports a checked `*Encoded` Schema for encoded-only validation.

## Alternatives rejected

| Challenge | Decision |
| --- | --- |
| A plain `{ cents, currency }` object is easy to pass but can be fabricated unchecked. | Nominal Schema values are constructed once and carry the evidence downstream. |
| Numeric dollars such as `1.005` depend on binary floating point. | Exact decimal text for construction; statutory rounding stays explicit in formulas. |
| A custom SDK result object needs its own combinators and codecs. | Native `Result`: plain users narrow `_tag` and read `success` or `failure`. |
| `Money<Currency, Period, Role, Year>` encodes more but makes arithmetic and errors hard to use. | AUD Money plus narrow refinements; facts carry roles, scenarios carry periods and definitions carry rule-pack versions. |
| One universal report invariant is simpler but wrong for salary sacrifice. | Each report variant validates its own accounting inputs. |
| Keeping old names eases upgrades but leaves two contracts. | One hard cutover; external consumers upgrade explicitly. |

## Consequences

- A future breaking change to calculator inputs, reports or errors ships in a
  new calculator contract version, with the generated client, OpenAPI, MCP and
  Website updated together. The API never serves two calculator contract
  versions or forwards old requests to compatibility handlers.
- Rollback restores a previous release as a whole; no old execution path is
  kept inside a new one.
- Historical tax-year packs use the same contracts. They are not an exception
  that allows legacy code to remain.
