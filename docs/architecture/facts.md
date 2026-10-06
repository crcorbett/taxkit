---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-facts-owner
last_reviewed: 2026-10-06
review_trigger: fact Schema, identity, descriptor, authority or question metadata change
---

# Facts

A fact is a named value required or produced by a calculation. Its owning rule
package defines the value Schema, the Effect service identity and the descriptor
used to check the calculation graph. Consumers reuse those definitions.

## Fact pattern

The current [pay facts](../../packages/rules/au/pay/src/facts/pay.ts) define
`GrossPay`, `PayPeriod`, `GrossPayFact` and `GrossPayDescriptor` together.
`GrossPay` contains canonical `Money` and a checked pay period. The service
uses the installed Effect 4 form:

```ts
export class GrossPayFact extends Context.Service<GrossPayFact, GrossPay>()(
  "taxkit/rules-au-pay/fact/GrossPay"
) {}
```

This is an excerpt from the owning module; its imports and value Schema belong
there. Keep the service identity stable. Another value with similar fields
cannot supply a different fact service.

## Descriptors and authority

Import `FactDescriptor` and `makeFactDescriptor` from `@taxkit/core`; do not
copy their fields into a second interface. The [descriptor owner](../../packages/core/src/facts/descriptor.ts)
keeps the value Schema and `Context.Key<Self, Value>` tied to the same value
type. Its readonly fields include a branded fact ID, title, authority and
`Option<FactQuestion>`. Ordinary fields derive from one private Schema; only
the actual generic value Schema and service relation are annotated. This generic relation supports graph tools while
Effect's dependency type still decides what execution needs.

`FactAuthority` admits three values:

- `input`: the caller supplies a typed input accepted by the calculator.
- `derived`: a rule produces the fact from other facts or parameters.
- `parameter`: a service supplies a tax-year table, rate or constant.

Callers must construct the selected calculator's canonical input facts before
running it. Metadata does not supply missing values.

## Dates, money and rounding

Reuse the [core date primitives](../../packages/core/src/primitives/date.ts)
and the selected calculator's input Schema. Keep calculation dates, payment
dates and tax years distinct where that calculator supports them. FBT and
other proposed date dimensions do not establish an implemented calculator
contract; add them at their owning Schema when that work is accepted.

[Money](../../packages/core/src/primitives/money.ts) uses integer cents. Its
number representation is checked by the owning Schema; a bare number is not
canonical money. Keep final amounts in that representation rather than using
floating-point dollar arithmetic.

Reuse [RoundingMode](../../packages/core/src/primitives/rounding.ts) and the
owning rounding operations. The closed modes are `none`,
`round-to-nearest-cent`, `floor-cent`, `ceil-cent`, `floor-dollar`,
`ceil-dollar` and `ato-withholding-rounding`, defined by `Schema.Literals`.
Record the chosen policy in calculation trace output.

Do not invent defaults that materially change tax results, such as whether a
person has study debt, claims the tax-free threshold or has health insurance.
A supported default must belong to the input Schema or an explicit rule.

## Question metadata

`FactQuestion` is the [core-owned Schema class](../../packages/core/src/facts/descriptor.ts).
It carries a branded `FactQuestionId`, `prompt`, nested Option `helpText` and an
`inputKind` of `money`, `boolean` or `selection`. Reuse this class and the
fact descriptor's question rather than introducing a competing question type.
Help text keeps missing, present undefined and present string keys through its
owning codec. The descriptor constructor's historically equivalent missing and
undefined questions both become None; a checked question becomes Some.

Question metadata describes supported input collection. It does not prove that
a UI or CLI can automatically collect every missing fact; that behaviour needs
its own application implementation and tests.
