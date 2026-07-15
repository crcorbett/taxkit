---
status: canonical
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# Documentation user journeys

Use this index to choose the primary reader before writing or reviewing a
TaxKit documentation page. Each journey lives in its own file so agents can
load the relevant reader model without reading every journey.

Each page should serve one primary reader and one primary need.

## Journey index

| Reader | Need | Journey |
| --- | --- | --- |
| SDK evaluator | Run one calculation and decide whether the SDK fits. | [SDK evaluator](./documentation-user-journeys/sdk-evaluator.md) |
| Application integrator | Choose and wire the right integration surface. | [Application integrator](./documentation-user-journeys/application-integrator.md) |
| Type-safety focused developer | Understand compile-time guarantees and runtime schema decoding. | [Type-safety focused developer](./documentation-user-journeys/type-safety-focused-developer.md) |
| API consumer | Call TaxKit over HTTP and understand endpoint behaviour. | [API consumer](./documentation-user-journeys/api-consumer.md) |
| New contributor | Propose a tax behaviour change and prepare a reviewable PR. | [New contributor](./documentation-user-journeys/new-contributor.md) |
| Correctness reviewer | Review source evidence, tests and compatibility impact. | [Correctness reviewer](./documentation-user-journeys/correctness-reviewer.md) |
| Documentation contributor | Write or update docs using TaxKit standards. | [Documentation contributor](./documentation-user-journeys/documentation-contributor.md) |

## Page planning prompt

Before writing a page, answer:

```txt
Primary reader:
Primary need:
Page type:
Template:
What the reader already knows:
What the reader should do next:
Canonical source of truth:
Required examples:
Required diagrams:
Validation:
```

If you cannot answer these fields, do not write the page yet. Split the page
or clarify the reader need first.
