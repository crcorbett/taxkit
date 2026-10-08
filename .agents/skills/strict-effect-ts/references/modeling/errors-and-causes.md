# Errors and Causes

## Contents

- [Closed expected error vocabulary](#closed-expected-error-vocabulary)
- [Expected failure versus defect](#expected-failure-versus-defect)
- [Error fields](#error-fields)
- [Boundary mapping](#boundary-mapping)
- [Recovery](#recovery)
- [Cause handling](#cause-handling)
- [HTTP RPC translation](#httprpc-translation)
- [Tests](#tests)

## Closed expected error vocabulary

Define domain errors in `errors.ts`. Each tag should support a caller decision.

Good tags:

- `AccountNotFound`;
- `InvalidAccountInput`;
- `ProviderUnavailable`;
- `ProviderRejected`;
- `ProviderPayloadInvalid`;
- `PermissionDenied`;
- `Conflict`;
- `OperationTimedOut`;
- `PersistenceFailure`.

Weak tags:

- `SomethingWentWrong`;
- `ApiError`;
- `UnknownError`;
- `OperationFailed` with only a message.

Do not use an error hierarchy merely to mimic exceptions. Prefer a tagged union that callers exhaustively match.

## Expected failure versus defect

Use typed failure for conditions that can occur in correct operation and may be handled, retried, translated, or reported.

Use defects for programmer bugs or impossible invariant violations. Let supervisors/reporting capture them; do not expose them as normal domain errors.

Do not catch all Causes and turn them into one expected error. Preserve interruption and defect semantics.

## Error fields

Include:

- safe operation name;
- bounded resource/provider safe ID;
- retry classification;
- status/code if safe and stable;
- short sanitised detail;
- nested domain cause only when it is a closed safe type.

Exclude:

- credentials;
- headers/cookies;
- full URLs with sensitive query strings;
- raw request/response bodies;
- stack traces in serialised form;
- arbitrary provider error object;
- unbounded messages.

## Boundary mapping

Map low-level errors once:

```text
transport failure
  -> ProviderUnavailable
HTTP 401/403
  -> PermissionDenied
HTTP 409
  -> Conflict
decode failure
  -> ProviderPayloadInvalid
timeout
  -> OperationTimedOut
```

Keep retry policy based on the domain tag, not provider message string matching.

## Recovery

Use exhaustive tag matching at a recovery boundary. Recover only the cases the boundary owns.

- Missing may become Option at a query boundary.
- Conflict may trigger a readback.
- Unavailable may retry under a bounded Schedule.
- PermissionDenied should usually fail immediately.
- PayloadInvalid should fail closed and surface provider drift.

Do not use broad “catch all and log” as normal control flow.

## Cause handling

Causes contain typed failures, defects, and interruption. Use Effect's Cause utilities for diagnostics and supervision, not as a public response type.

When logging:

- log the domain error tag and safe fields for expected failure;
- use a controlled defect reporter for unexpected Causes;
- preserve interruption without reporting it as an application failure unless the domain requires it;
- never stringify an arbitrary Cause into a receipt.

## HTTP/RPC translation

Translate domain errors through an explicit protocol Schema:

- tag to status/code;
- safe client message;
- correlation ID if allowed;
- no internal Cause/provider details.

Keep the domain error independent of HTTP status so the same service works in CLI, queue, test, and RPC contexts.

## Tests

Test:

- every tag is constructible only with valid safe fields;
- low-level errors map to the expected tag;
- retry policy covers only retryable tags;
- interruption is not swallowed;
- public encoding omits secret/internal fields;
- exhaustive matching fails compilation when a tag is added.
