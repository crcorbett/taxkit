# Schemas and Brands

## Contents

- [Decode once](#decode-once)
- [Encode owned output](#encode-owned-output)
- [Domain brands](#domain-brands)
- [Exact structures](#exact-structures)
- [Transformations](#transformations)
- [Versioned durable data](#versioned-durable-data)
- [Provider responses](#provider-responses)
- [Schema-tagged errors](#schema-tagged-errors)
- [Tests](#tests)

## Decode once

Treat all external values as `unknown` until Schema decodes them:

- environment and platform bindings;
- HTTP/RPC/queue input;
- provider SDK responses;
- database rows;
- JSON files;
- Alchemy state and outputs;
- workflow payloads;
- browser storage;
- durable receipts.

Decode at the first trusted boundary. Do not pass `unknown` inward for a later caller to handle.
Keep the decoded value typed inside the program. Do not decode the same stage
again or round-trip an internally constructed record just to establish its
type. Pure construction uses the owning types and checked constructors;
additional external input still needs its own boundary check. Encode when the
value crosses an outward contract.

## Encode owned output

Use Schema encoding for:

- provider requests owned by the application;
- HTTP/RPC responses;
- persisted state;
- externally persisted cache entries (an in-memory Effect cache is already typed);
- messages/events;
- workflow outputs;
- receipts.

Encoding proves the outbound contract and prevents accidental runtime objects, Causes, secrets, or non-serialisable values from leaking.

## Domain brands

Brand values that are semantically distinct despite sharing a primitive:

- account/project/tenant IDs;
- email address;
- absolute URL and redirect URI;
- dataset/dashboard ID;
- stage;
- source revision;
- money/currency;
- bounded count;
- timestamp and duration.

Do not accept arbitrary strings and rely on parameter names to protect identity.

Brand at decode/construction. Avoid a public `as Brand` escape hatch.

## Exact structures

Use exact object Schemas where unknown keys indicate drift or unsafe input. Decide deliberately whether unknown keys are rejected, stripped, or preserved; do not accept the library default without considering the boundary.

Represent closed alternatives as:

- literal unions;
- tagged unions;
- nullable/optional input that decodes into Option when absence is semantic.

Use a discriminant field for plans, receipts, messages, and errors.

## Transformations

Use Schema transformations when encoded and domain representations differ:

- ISO timestamp ↔ domain instant;
- redacted encoded secret ↔ Redacted value;
- string identifier ↔ brand;
- nullable input ↔ Option;
- provider enum ↔ domain tagged union.

Keep transformations total in each declared direction or expose decode failure explicitly.

## Versioned durable data

Include an explicit schema version in persisted state, events, and receipts. Define migrations as decoded transformations:

```text
unknown
  -> version discriminator
  -> old Schema decode
  -> migration Effect
  -> current domain
  -> current Schema encode
```

Do not mutate historical evidence to resemble the new version.

## Provider responses

Provider SDK typings are not runtime validation.

1. call the private SDK/HttpClient;
2. treat response as untrusted;
3. select the minimal fields;
4. decode through an owned Schema;
5. map codec failure to a tagged provider-payload error;
6. return domain values only.

This protects against SDK looseness and provider drift.

## Schema-tagged errors

Use the installed Effect version's Schema-tagged error class when errors cross serialisation boundaries. Keep fields bounded and safe. For purely internal errors, a non-Schema tagged data class may be sufficient.

Do not serialise arbitrary `Error`, stack traces, SDK errors, or Causes.

## Tests

For each material Schema, test:

- representative valid decode;
- every refinement failure;
- unknown/missing field policy;
- encode/decode round-trip where applicable;
- redaction;
- old-version migration;
- provider drift;
- maximum sizes and bounded collections.

Use property-based testing for identifiers, codecs, and round-trips where valuable.

## One Schema owner and checked construction

Infer data types from `typeof Owner.Type` and encoded types from `typeof Owner.Encoded`.
Service inputs, results, provider codecs, persisted records and test Layers reuse
that owner. Do not maintain a second readonly interface with the same fields.
Recursive codecs may need one local recursive annotation; infer their other
fields from a shared Struct and keep the annotation beside the codec.

Reuse child Schemas instead of repeating their string patterns or number bounds.
An ID, source revision, URL, date, offset, span or meaningful bounded text field
needs its owning refinement and brand. Branded strings remain literal source
text: do not trim, case-fold or normalise legal labels as part of branding.
When two fields have an ordering or length relationship, keep one shared
whole-record check. `Schema.Struct({ ...Owner.fields })` copies fields only;
attach the owning record check explicitly to each derived ingress codec.

Separate three operations:

- Decode unknown external data at its first real boundary.
- Construct a new constrained value using its owner's `makeEffect` (or the
  installed equivalent). In qualified v4, this checks the type side and fails
  with `SchemaIssue.Issue`, not `SchemaError`; map it to the operation's safe
  named error. Check child brands before constructing a containing record.
- Assemble unchanged records directly from already checked fields. Retain
  business checks such as expected identity, completeness and allowed ranges.

A typed service input is not fresh unknown data. Do not decode it again to
restore confidence, encode it and decode it to get a type, or copy a codec
locally. New external input still needs checking. Native HTTP/RPC codecs can
own ingress and egress without a second decoder in the semantic service.

## Optional historical source data

Domain readers use Option. The source codec owns the saved representation.
For a record key whose source can be omitted or null, v4 supports
`Schema.OptionFromOptionalKey(Schema.OptionFromNullOr(Value))`. The outer Option
preserves omission; the inner Option preserves a present null. A consumer can
flatten these when both mean absence, while encoding can reproduce the source.
If the source does not distinguish those cases, use its simpler matching codec.

Check known attributes with owning Schemas. Preserve extra JSON only as bounded,
checked source evidence; do not interpret its raw values in a renderer or service.
Check dictionary/rest-field codec behaviour against the installed version rather
than assuming an optional-key codec also works for a Record index.

Before changing an existing codec, reproduce representative old bytes, encoded
field order, nulls/omissions, literal labels, saved version and cryptographic
hashes. Whole-source and important subsection tests protect different claims.
Effect's ordinary Hash is for collection lookup, not durable source evidence.
