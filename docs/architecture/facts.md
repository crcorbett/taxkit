---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# Facts

Facts are the typed dependency units of the calculation engine. A fact is not just an object shape. It has a schema-backed value, a stable identity and an Effect `Context.Tag` provider.

## Fact Pattern

Every official fact should define:

- a schema-backed value class
- a `Context.Tag`
- a descriptor used by graph tooling
- an authority policy
- optional question metadata for data collection

Example:

```ts
export class GrossPay extends Schema.TaggedClass<GrossPay>()("GrossPay", {
  amount: Money,
  period: PayPeriod,
}) {}

export class GrossPayFact extends Context.Tag("taxkit/fact/GrossPay")<
  GrossPayFact,
  GrossPay
>() {}
```

The `_tag` and `Context.Tag` are part of the contract. A structurally similar value does not satisfy a different fact.

## Fact Descriptor

Descriptors are metadata for tools, questions, graph validation and documentation. They do not replace Effect's typed dependency channel.

```ts
export interface FactDescriptor<A, I, R, Tag> {
  readonly id: FactId;
  readonly title: string;
  readonly schema: Schema.Schema<A, I, R>;
  readonly tag: Context.Tag<Tag, A>;
  readonly authority: FactAuthorityPolicy;
  readonly question?: QuestionDescriptor;
}
```

## Authority Levels

Authority must be explicit. TaxKit defines the typed input facts that calculators accept. Callers are responsible for deciding which values to provide to the engine.

```txt
Input fact
  Explicit typed input accepted by a TaxKit calculator.

Derived fact
  Produced by a TaxKit rule layer from other facts or parameter services.

Parameter fact/service
  Provides tax-year tables, rates and constants.
```

Callers must convert the selected application values into TaxKit input facts before invoking the engine.

## Date Dimensions

Scenarios and facts must preserve the relevant date dimensions.

```ts
export interface ScenarioDates {
  readonly calculationDate: LocalDate;
  readonly paymentDate?: LocalDate;
  readonly incomeYear?: IncomeYear;
  readonly fbtYear?: FbtYear;
}
```

PAYG withholding, annual tax, FBT, superannuation and mortgage calculations can all use different effective dates.

## Core Value Rules

Money must use integer minor units or a decimal representation. Do not use JavaScript `number` for final money values.

Rounding must be explicit and traceable:

```ts
export const RoundingMode = Schema.Literal(
  "none",
  "round-to-nearest-cent",
  "floor-cent",
  "ceil-cent",
  "floor-dollar",
  "ceil-dollar",
  "ato-withholding-rounding"
);
```

Facts should avoid default values that materially alter tax outcomes. Do not default whether a person has HELP/STSL debt, claims the tax-free threshold, has health insurance cover or has a work-use percentage.

## Question Metadata

Fact descriptors may include question metadata so the UI and CLI can ask only for missing facts required by a selected goal.

```ts
export class QuestionDescriptor extends Schema.TaggedClass<QuestionDescriptor>()(
  "QuestionDescriptor",
  {
    id: QuestionId,
    label: Schema.String,
    help: Schema.optional(Schema.String),
    requiredWhen: Schema.optional(PredicateSpec),
    inputKind: Schema.Literal(
      "money",
      "boolean",
      "date",
      "select",
      "percentage",
      "text"
    ),
  }
) {}
```
