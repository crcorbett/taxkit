---
status: canonical
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# API consumer journey

Reader:
: A developer calling TaxKit from a browser, backend in another language or
  service that cannot import TypeScript packages.

Need:
: Understand endpoint shape, request body, errors and generated reference.

Likely pages:

- API overview
- Calculate endpoint
- Errors
- OpenAPI reference
- Show calculator help to users

Page requirements:

- explain HTTP as a thin transport
- link to OpenAPI reference
- show canonical JSON payloads
- explain `CalculatorApiErrorEnvelope`
- route field-level detail to generated reference
