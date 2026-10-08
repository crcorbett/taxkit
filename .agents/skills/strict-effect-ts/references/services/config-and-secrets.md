# Config and Secrets

## Contents

- [Acquire configuration through Effect](#acquire-configuration-through-effect)
- [Root host adapter](#root-host-adapter)
- [Refine primitive values](#refine-primitive-values)
- [Secrets](#secrets)
- [Secret JSON bindings](#secret-json-bindings)
- [Configuration ownership](#configuration-ownership)
- [Reloading](#reloading)
- [Tests](#tests)

## Acquire configuration through Effect

Use Config for values supplied by the host:

- environment variables;
- platform bindings;
- file/config providers;
- test configuration;
- provider endpoints and safe IDs;
- timeouts, retry counts, and feature policy.

Do not read `process.env`, `Bun.env`, `import.meta.env`, or Cloudflare bindings throughout domain code.

## Root host adapter

If a platform cannot provide an Effect ConfigProvider directly:

1. read the host environment at the application boundary;
2. select only owned keys;
3. construct a ConfigProvider or typed adapter;
4. decode/refine values;
5. provide it to the runtime;
6. keep the raw environment object private.

Tests supply a deterministic provider rather than mutating ambient environment.

## Refine primitive values

Do not stop at `Config.string`.

Refine with Schema/domain constructors:

- URL;
- port;
- positive duration;
- stage literal;
- account/project ID;
- bounded concurrency;
- source revision;
- JSON object;
- comma-separated list.

Map invalid configuration to a typed startup/config error with key name and safe constraint, never value.

## Secrets

Acquire secrets as Redacted values or the installed equivalent. Unwrap only inside the smallest provider request boundary.

Rules:

- never convert a secret to a normal string for convenience;
- never include secret values in error fields;
- never interpolate secrets into logs, spans, metrics, or receipts;
- never place a secret in a service's public success type;
- never persist it in test snapshots;
- prefer provider/OIDC secret references over copied long-lived values.

## Secret JSON bindings

When a platform binding contains JSON:

1. obtain it as redacted;
2. expose/unredact only inside a boundary Effect;
3. decode JSON using an owned Schema;
4. construct a private credentials value;
5. discard the plaintext as soon as possible;
6. log only credential class and safe scope.

Do not use unchecked `JSON.parse`.

## Configuration ownership

Keep domain Config near the live Layer that owns it. A shared application config module may compose domain Config values but should not become an untyped registry of every environment key.

Name keys consistently and document:

- owner;
- environment/stage scope;
- secret status;
- default;
- validation;
- rotation/reload behaviour.

Avoid defaults for Production-critical identity and credentials. Missing should fail at startup.

## Reloading

Most application identity/config should be immutable for a runtime. If dynamic reload is required:

- model it as a service or subscription;
- decode every new value;
- define consistency and failure behaviour;
- avoid partially updated configuration;
- instrument safe version/change identity.

Do not poll raw environment variables on each operation.

## Tests

Test:

- valid Config construction;
- missing required keys;
- refinement failure;
- default policy;
- redaction in logs/errors/inspection;
- test provider isolation;
- stage-specific key separation;
- no ambient environment dependence.
