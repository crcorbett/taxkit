# Effect-native SDK contracts and checked money

Status: Accepted for SDK 5.0.0. Implemented as one hard cutover; publication
remains subject to the repository release gates.

TaxKit will use one Schema-owned domain model and native Effect execution for
money, facts, rules and calculators. Both the Effect and vanilla TypeScript
interfaces will preserve the same checked values and inferred reports. The
implementation replaces the existing contract and deletes all superseded code
in the same merge. The release ships only the new contract. There is no
deprecation period, staged rollout or follow-up cleanup phase.

## Context and evidence

The [domain glossary](../../CONTEXT.md) distinguishes facts, scenarios, rule
packs, calculators and runs. Current implementation ownership is documented in
[API and SDK](../architecture/api-and-sdk.md), [facts](../architecture/facts.md)
and [rules and parameters](../architecture/rules-and-parameters.md).

The reviewed code uses Effect 4.0.7. Its existing integer-cent Money, nominal
fact classes, static rule Layers and client lifetimes provide the foundation.
The following gaps motivate a breaking contract change:

- [SDK descriptors](../../packages/sdk/typescript/src/types.ts) accept unrelated
  calculator IDs and input/output Schemas. A stricter descriptor input check
  can reject a value while the SDK executes it successfully: execution uses
  the catalogue's independently selected Schema.
- [Catalogue ingress](../../packages/calculators/src/catalog.ts) silently strips
  extra inputs. A supplied salary-sacrifice field can disappear from a base-pay
  calculation.
- [The dollar codec](../../packages/core/src/primitives/dollars.ts) encodes
  negative Money as text which its own decoder rejects.
- [Pay report fields](../../packages/rules/au/pay/src/calculator/schemas.ts)
  validate independently. A constructed report can validate while its net pay
  disagrees with its withholding amounts.
- [Safe result values](../../packages/sdk/typescript/src/errors.ts) are custom
  Data classes, although public documentation calls them Schemas. Core's
  [CalculationError](../../packages/core/src/errors/calculation-error.ts) also
  permits opaque diagnostic payloads which the plain error adapter preserves.
- [Module arguments](../../packages/sdk/typescript/src/client.runtime.ts)
  restrict types but do not select executable registrations. Several native
  rule and fact exports available internally are absent from the SDK.
- The dedicated SDK `test-types` command is outside normal `check-types` and
  therefore outside the standard verification path.

These claims were checked against source and isolated runtime/type probes.
They are design evidence, not implementation acceptance.

## One domain, two execution interfaces

Effect owns all fallible orchestration, dependencies, lifetime and failure
semantics. Domain Schemas, error Schemas, brands, native `Result` and native
`Option` are identical objects/types across both interfaces.

| Operation | Vanilla interface | Effect interface |
| --- | --- | --- |
| Money parsing and checked arithmetic | Synchronous `Result<A, MoneyError>` | `Effect<A, MoneyError>` |
| Calculation returning a report | `Promise<Report>` | `Effect<Report, E, R>` |
| Calculation returning a full run | `Promise<Run<Report>>` | `Effect<Run<Report>, E, R>` |
| Expected calculation failures as data | `Promise<Result<A, E>>` | Native `Effect.result` |
| Formatting already checked money | Pure function | Same pure function |

Synchronous value operations use native Schema parsing and Result combinators;
their Effect forms lift the same operation lazily into Effect. They do not
create a runtime. Pure operations remain independent of services and I/O.
Schema codecs used by these synchronous operations require no decoding or
encoding services. An effectful calculator preserves its real service
requirements rather than hiding them in `unknown` or executing them during
definition.

The exact Promise host remains private to the vanilla facade. It provides the
same native calculator operations, scopes one-shot calls, and owns one lazy
ManagedRuntime per reusable client. `dispose()` and `[Symbol.asyncDispose]`
share cleanup and interrupt pending work. Public Promise declarations use
`Promise<T>` directly. Normal rejection methods and safe-result methods have
the same checked expected-error vocabulary; Promise rejection types cannot be
expressed by TypeScript, so safe methods are the exhaustive handling path.

Effect consumers provide static Layers and keep their application runtime.
Export the ready-composed `TaxKitLive` and the actual calculator service tag.
Tests substitute that contract with native `Layer.mock` or replacement Layers.
The existing HTTP client remains the native generated `HttpApiClient`; this
decision adds no transport wrapper or arbitrary execution callback.

## Money and refinements

Core owns a single nominal `Money` Schema with branded safe integer `Cents`
and literal currency `AUD`. Effect 4.0.7's `Schema.Int` already checks the safe
integer range. Keep the existing exact cent representation. A bare number or
object literal does not establish Money, and Money does not implicitly coerce
to a number. Additional currencies require their own supported domain decision.

Add `NonNegativeMoney` as a checked, separately branded refinement of Money.
Use it for gross pay, salary sacrifice and annual taxable-income scenario inputs
and their native input facts.
Signed Money remains valid for adjustments, intermediate liabilities and
arithmetic. Existing negative scenario acceptance is intentionally tightened;
this does not add a model of loss carry-forwards. Refined amounts can flow into
ordinary Money operations, but the reverse assignment requires validation.

The money modules expose `fromCents`, `fromDecimal`, `add`, `subtract`, `round`
and `format`, plus checked construction for the non-negative refinement. Constructors
name their units; calculator inputs accept checked values. Native Schema
constructors remain available for trusted constants. No convenience constructor
silently casts an unchecked value into a brand.

`fromDecimal` accepts exact decimal-dollar text with an optional leading minus
and at most two fractional digits. It trims surrounding whitespace, rejects
grouping, currency symbols, exponent notation, non-finite values and out-of-range
amounts, and converts exactly to cents. Formatting emits two fractional digits;
zero has one canonical form. Non-negative parsing uses the corresponding target
Schema. More than two fractional digits fail rather than being silently rounded.

Replace the asymmetric dollar codec with `MoneyFromDecimalString` and
`NonNegativeMoneyFromDecimalString`. For every admitted target value,
`decode(encode(value))` must be equivalent to that value. Text round trips may
normalize whitespace and redundant zeroes. Representation and Type are distinct
and both are derived from the owning codec.

Remove numeric-dollar `audDollars` from the replacement API. Exact intermediate
formula evaluation continues to use Effect BigDecimal and the existing named
rounding policies at the statutory step. `round` requires an explicit policy.
This decision changes input ergonomics,
not rounding law. `add` and `subtract` check overflow and return signed Money;
they do not promise that subtraction preserves non-negativity. MoneyError is a
closed Schema-tagged failure with safe reason codes for format, fractional cents,
non-finite input, range, negative input and arithmetic overflow as applicable.

## Calculator identity, facts and rules

Each owning rule package defines its calculator once: exact branded ID,
jurisdiction/year literals, scenario codec, report codec, expected-error Schema
and typed execution using its native program and rule-pack Layer. The execution
input and output must satisfy those codecs' Types. Codecs retain Encoded types
and their service requirements through `Schema.Codec` constraints.

The SDK descriptors, catalogue, scenario/run unions and documentation derive
from those definitions. A public descriptor cannot independently replace the
input/output Schema of a registered calculator. Custom refinements belong to a
caller's checked ingress or a genuinely new calculator definition and executor.
They cannot masquerade as an override of an existing registered definition.

Preserve exact ID/context literals during construction and lookup; avoid
widening a selected ID to the complete pay-ID union. Lookup checks the complete
ID, jurisdiction and year, with duplicate identities rejected. Context supplied
by an explicitly versioned descriptor determines execution. An optional caller
context must match it; metadata and execution cannot select different editions.

Use one inferred calculator type at public call sites, with `NoInfer` where
needed to prevent input inference from widening the selected calculator.
For a dynamic selection, keep calculator and input correlated in a discriminated
request union; callers narrow it before obtaining a specific report type.
Transport discriminator Schemas derive literal Types with `Schema.toEncoded`
from the owning ID Schemas. Definitions and catalogue metadata keep their branded
identities. Effect 4.0.7's tagged-union helpers do not enforce exhaustive handler
keys for branded literal discriminators. The literal view preserves standard
TypeScript narrowing and native exhaustive matching; negative compiler examples
qualify both request and response unions.

Scenario Schemas own the required facts for each supported rule pack. A pay
scenario supplies its period once; conversion creates the distinct GrossPay,
SalarySacrifice and other fact values with that period. A sacrifice-aware
scenario requires its amount. STSL-aware scenarios require an explicit debt
choice. Do not default tax-significant facts or admit optional inputs that the
selected pack ignores. Standalone fact composition still checks period agreement
where independently supplied facts meet.

Publish actual fact Schemas, service tags, rule descriptors, rule Layers and
rule-pack Layers through the AU schema and Effect entrypoints. Retain their
nominal fact identities and exact `Layer<ROut, E, RIn>` relations. Missing facts
or parameters remain in `R` until supplied; execution requires a closed program.
The vanilla facade derives required object properties from the same scenario
Schema and executes the same program. Native graph validation still checks
dynamic conflicts, sources and effective periods that types alone cannot prove.

Remove the SDK's selector-only module model. Built-in calculators are selected
by their checked descriptors; custom rule composition uses native Layers and
the owning typed definition mechanism. A reusable plain client's role is
lifetime management. It does not advertise module arguments which are ignored
by execution, and this ADR introduces no mutable plugin registry.

## Strict boundaries and usable errors

Separate unknown/encoded ingress from operations over checked values. Decode
once with the selected calculator's owning codec using fixed
`onExcessProperty: "error"` and `errors: "all"`, including nested scenario
fields. Strictly validated raw inputs and safe scalar/record constructors
produce the same nominal scenario type. Typed execution retains that evidence.
Output construction and external decoding use the owning report Schema;
checked internal results need no repeated output decoder.

Derive correlated request and response variants from the same definitions for
transport. Do not decode a broad unrelated fact union, strip fields and then
decode the narrowed shape again: that loses the evidence needed to reject an
ignored salary-sacrifice input. Native HttpApi codecs own transport parsing;
the selected variant must be tied to the checked request identity.

Calculator HTTP v2 accepts the same correlated envelope as MCP: `calculatorId`,
and `payload` containing the checked `facts` plus optional context.
The path and body identities must agree. Native MCP registration
adds an object-root check to the same union; its native JSON Schema view keeps
the correlated variants and meets MCP’s object-root requirement. Responses carry the discriminating
`calculatorId` alongside matching report and catalogue metadata. Native HttpApi
`PayloadParseOptions` enforces strict nested decoding; safe input issue projection
is shared with SDK ingress. The superseded input-error DTO/projection is deleted.

Service request objects use a single `Option<A>` when absence has one semantic
meaning. Plain request options may have optional keys; ingress converts them.
Delete nested Options introduced solely to preserve an own key whose value is
undefined. Meaningful distinctions in legal source evidence belong to its
canonical artifact Schema, separately from the everyday request interface.
Preserve the evidence without retaining a legacy SDK codec or decoder.

Public failures use Schema-tagged errors and a closed union. Keep stable reason
codes, calculator identity and bounded field paths/messages. Diagnostic projection
must not contain rejected amounts, opaque `unknown`, raw Cause, stack or private
paths. Bound the projected issue list and indicate truncation when needed.
Remove `CalculationError.cause` from the new public contract. Distinguish invalid
input, unsupported context, output invariant failure and operational failure.
HTTP admission errors remain owned by the host policy and are not invented by
local money or rule operations.

Native `Result<A, E>` replaces `TaxKitSuccess`, `TaxKitFailure` and
`TaxKitSafeResult`. Result serialization derives from `Schema.Result` with the
owning success and error Schemas, through `Schema.toCodecJson` at JSON boundaries.
Vanilla consumers can narrow `_tag` and read `success` or `failure` directly,
without creating an Effect runtime or learning Layer composition. Expected
failures use `Effect.result`; defects and interruption retain native semantics
inside Effect. Only the Promise host projects unexpected defects and client
closure into safe host-owned errors while preserving cleanup.

## Reports and Schema integrations

Schema checks include aggregate accounting relationships, with overflow-safe
validation and one owner for each relationship. The base pay equation is
`gross = cash net + withholdings`; the salary-sacrifice equation additionally
includes sacrifice. A sacrifice-aware report must carry the applied amount in
its checked fields so a restored report can validate independently of trace
text. Use a distinct report variant when required fields differ.

Ledger totals agree with contributing components, relevant component identities
are unique, and period-based fields agree. Annual liability agrees with the
documented flooring of raw liability. Reuse these checks in derived Type and explicit owning encoded codecs. Effect
4.0.7 can discard whole-record checks during bare `Schema.toEncoded` extraction;
export checked `*Encoded` Schemas for encoded-only validation and test them.
Spreading fields does not retain aggregate checks. Legal formulas, parameter values and historical source
checksums remain independently verified.

Export native scenario and report Schemas for consumers. Derive Standard Schema
integration with `Schema.toStandardSchemaV1` and JSON Schema documents with
`Schema.toJsonSchemaDocument` paired with the matching JSON codec. These are
derived views; Effect decoding remains authoritative where JSON Schema cannot
fully express a check. Form adapters retain safe issue formatting. Schema
identifiers, descriptions and examples describe units and supported contexts.

Use native `Arbitrary.schema` and `Arbitrary.checkEffect` for reproducible
property checks where they add proof, including codec laws and ledger arithmetic.
They are unstable in Effect 4.0.7: pin and qualify them in test tooling, without
exporting them as an SDK contract. Use constructive bounded generators for
correlated reports; arbitrary independent fields are not valid accounting data.
`Schema.toEquivalence` supplies the appropriate comparison for round trips.

## Public surface and mandatory removals

Keep the published distribution as one `taxkit` package with Effect as its
external runtime dependency. Schema and HTTP entrypoints remain independent of
live calculation implementations. The focused public owners are:

| Entrypoint | Responsibility |
| --- | --- |
| `taxkit` | Named plain calculation functions and caller-owned clients |
| `taxkit/effect` | Effect report/run functions, the service tag and static `TaxKitLive` |
| `taxkit/money` and `taxkit/money/effect` | Result/Effect money operations over the same Schemas |
| `taxkit/au` | Versioned calculator descriptors and plain named conveniences |
| `taxkit/au/schemas` | AU scenario, fact, parameter and report Schemas |
| `taxkit/au/effect` | Native AU calculator programs, fact services and rule-pack Layers |
| `taxkit/schemas` | Shared public request, result and error contracts |
| `taxkit/core` | Engine and fact/rule definition contracts |
| `taxkit/http` | Native HTTP contracts for the generated client |
| `taxkit/testing` | Checked fixtures and native Layer substitution examples/support |

The implementation must remove the following items and migrate every owned
caller, example, fixture and packed consumer in the same replacement work:

| Current item | Replacement and deletion requirement |
| --- | --- |
| `SdkCalculationDefinition`, `defineSdkCalculation`, independently authored SDK descriptors and public `decodeOutput` callbacks | Derive descriptors from the owning complete calculator definition; delete the old factory and callback path. |
| `TaxKitModule`, `AnyTaxKitModule`, `defineTaxKitModule`, `ModuleCalculation`, `AuPay2025_26Module`, `AuIncomeTax2025_26Module` and module-selecting client overloads | Checked calculator descriptors plus native Layer composition; delete selector-only values, ignored arguments and associated generics. |
| `TaxKitSuccess`, `TaxKitFailure`, `TaxKitSafeResult` and their custom-tag encoders/matchers | Native Result and `Schema.Result`; delete both implementations and old public exports. |
| `TaxKitCalculationError` wrapping all failures, its detail/alias types and first-failure Cause conversion | Closed domain failure union plus narrowly owned Promise-host failures; delete the blanket nesting and obsolete aliases. |
| `CalculationError.cause` and generic schema-error message collapsing | Safe tagged reasons and field issues; remove opaque public diagnostic storage and its compatibility encoders. |
| `aud`, `audFromCents`, `audDollars`, `moneyFromDollarsText`, `dollarsTextFromMoney`, `MoneyFromDollarsString`, `moneyAdd`, `moneySub` and `roundMoney` entry aliases | Canonical money-module operations and symmetric codecs; migrate their implementations/callers, then delete old names and re-exports. Keep independently useful exact-decimal formula primitives. |
| `calculateReportRequest`, `calculateRunRequest` and transport-shaped SDK request aliases | One calculator-first report operation and one full-run operation with checked options; transports use their owning contracts directly. |
| `TaxKit` / `auEffect` object wrappers and duplicate nested descriptor/client namespaces | Named functions, descriptors and native Layer exports; keep one canonical import for each operation per interface. |
| Nested Option request/help/context forms kept only for missing-versus-undefined identity | Single semantic Option and ordinary boundary optional keys; remove request compatibility branches and obsolete byte-shape expectations. |
| `/testing` as a descriptor-only re-export, broad legacy barrels, stale examples and permissive schema fallbacks | Migrate imports to the focused public owners and delete forwarding-only modules/fallbacks after their final caller moves. |

The hard cutover applies to repository source and generated artifacts as well
as public exports. Delete superseded implementations, private or dormant legacy
paths, compatibility aliases, adapter shims, fallback decoders, duplicate
clients, old routes and dependencies used only by removed code. Feature flags,
dual reads/writes and old/new execution switches are not permitted. Hiding an
old implementation behind the new API does not satisfy this decision.

Extend the existing export-boundary, packed-consumer and Knip checks to prove
removal. Tests of removed APIs become negative public-import/type tests where
useful; remove tests whose sole purpose was preserving the superseded interface.
Old API names may appear in this decision, the written upgrade guide and removal
assertions; those references must not carry executable compatibility code.

Supported historical tax-year packs must use the same new contracts. Preserve
their statutory parameters, rounding fixtures, official source artifacts and
independent tax-result evidence while migrating their implementations. Historical
tax support is not an exception allowing legacy code to remain.

## Alternatives challenged

| Concrete challenge | Decision and trade-off |
| --- | --- |
| A familiar plain `{ cents, currency }` object is easy to pass but can be fabricated unchecked. | Nominal Schema values require construction once and give downstream evidence. No handwritten duplicate DTO model. |
| `fromCents(1.5)` is a valid TypeScript call because its argument is a number. | Return a typed runtime failure. Avoid brittle literal-number type programming; compile-time tests cover brands and relationships. |
| `1.005` numeric dollars depends on binary floating-point and rounding. | Exact decimal text for public construction; statutory rounding stays explicit in formulas. Numeric-dollar convenience is removed. |
| A custom SDK result object looks simpler but requires its own combinators, codecs and adapters. | Native Result keeps one result vocabulary; vanilla users learn its two discriminants and payload fields. |
| A generic `Money<Currency, Period, Role, Year>` could encode more dimensions but makes basic arithmetic and errors difficult to use. | AUD Money plus narrow refinements; facts carry roles, scenarios carry periods and calculator definitions carry editions. |
| One universal report invariant is simpler but fails on salary sacrifice. | Validate the owning report variant, with explicit accounting inputs. This may add report fields and is a versioned change. |
| Adding another decoder would enforce custom descriptors but duplicate boundary work. | One complete calculator definition and one ingress decode; checked execution preserves the relationship. |
| Keeping old names would ease upgrading but perpetuate two contracts and ambiguous examples. | One hard cutover: replace every owned caller and delete the old implementation in the same merge. External consumers upgrade explicitly. |

## Hard cutover and acceptance

Implement as one coordinated breaking change with a major `taxkit` Changeset.
The implementation is not mergeable until all owned consumers use the new
contract and all superseded code is deleted. New APIs and legacy removal ship
together; cleanup cannot be deferred. Generate a written upgrade guide from
the removal map without shipping executable migration adapters. External
consumers must update their code to use the new release. This ADR does not
authorize publication or deployment.

Shared calculator changes also affect HTTP/MCP schemas and the Website. Breaking
calculator input/report/error representations, including strict rejection policy,
must ship in a new calculator contract version with corresponding native client,
OpenAPI, MCP and Website updates. Remove superseded calculation adapters/routes
in that same cutover; do not serve both calculator contract versions or redirect
old requests into compatibility handlers. The docs-content API has its own
version and is outside this change. Operational rollback restores the previous
release as a whole, rather than retaining an old execution path in the new one.

Acceptance is exercised from the installed SDK archive in both consumer styles:

- Compiler failures for raw money, wrong nominal fact, missing pack-specific
  input, invalid period literal, mismatched ID/context/schema/executor, a wrong
  report field and execution with an unprovided fact or parameter. Include
  predeclared variables and dynamic selections, not only excess-property checks
  on inline object literals. Use strict supported TypeScript compiler settings.
- Runtime rejection of fractional/non-finite/unsafe cents, malformed decimals,
  negative refined input, overflow, extra nested input keys, contradictory
  contexts and inconsistent restored reports. Verify safe paths/reason codes.
- Money and native Result codec round trips, schema-generated contracts,
  Standard Schema validation, deterministic rule results and both pay equations.
- Identical calculation results through plain and Effect interfaces; public
  imports of actual rules/parameters; caller-provided services; interruption,
  startup/disposal races, async disposal and safe cleanup failures.
- No superseded implementation, old public export, compatibility shim, fallback,
  legacy execution flag, implicit raw-input acceptance, custom result ADT, module-only
  type restriction or duplicate runtime/decoder survives. Inspect repository
  source, dependencies, route registrations, generated declarations, packed
  files and browser import boundaries. All owned callers and supported tax-year
  packs use the new contract before merge.

Add the existing `test-types` command to SDK `check-types` so normal verification
checks its negative examples. Update the owning architecture docs, package
READMEs, public SDK examples and affected HTTP contract snapshots. Run
`bun run verification`, `bun run sdk:check-packed-artifact` and
`bun run sdk:validate-downstream` for implementation acceptance; publication
continues to require the existing release checks and explicit instruction.

Design qualification used the installed Effect 4.0.7 source for Schema brands,
Result codecs, `Effect.fromResult`, native service/Layer requirements, Standard
Schema and JSON Schema derivation. Isolated probes confirmed non-negative
refinement rejection, native Result encoding/restoration, nominal fact rejection
and the remaining salary-sacrifice requirement. The implementation exports these entrypoints and qualifies the shared contracts
through repository and installed-archive checks.
