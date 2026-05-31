---
status: canonical
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# Documentation templates

Use this index to choose the right page template before writing or reviewing a
WhatTax documentation page. Each template lives in its own file so agents can
load only the structure they need.

Every public MDX page should include frontmatter:

```yaml
title: "Run your first calculation"
description: "Install the SDK and run a calculation with canonical input values."
```

Every page should answer:

- What is this page for?
- When should you use it?
- What should you do next?
- Which page owns deeper detail?

## Template index

| Page type | Use when | Template |
| --- | --- | --- |
| Quickstart | The reader needs the first successful path through a product or API. | [Quickstart](./documentation-templates/quickstart.md) |
| Concept | The reader needs a mental model or term explained. | [Concept](./documentation-templates/concept.md) |
| Guide | The reader needs to complete a multi-step task. | [Guide](./documentation-templates/guide.md) |
| Decision page | The reader needs to choose between surfaces or paths. | [Decision page](./documentation-templates/decision-page.md) |
| API reference overview | The reader needs narrative context before generated API reference. | [API reference overview](./documentation-templates/api-reference-overview.md) |
| Contribution guide | The reader needs to propose or implement a repo contribution. | [Contribution guide](./documentation-templates/contribution-guide.md) |
| Reference | The reader needs stable field, schema, API or SDK facts. | [Reference](./documentation-templates/reference.md) |
| Section index | The reader needs to understand what a docs section contains and where to go next. | [Section index](./documentation-templates/section-index.md) |
| Troubleshooting | The reader has a known failure mode. | [Troubleshooting](./documentation-templates/troubleshooting.md) |
| Changelog or release note | The reader needs release impact and migration notes. | [Changelog or release note](./documentation-templates/changelog-or-release-note.md) |

## Adding a template

Add a new template when a page structure will repeat. The new template should
live in `docs/standards/documentation-templates/<template-name>.md` and this
index must link to it.

Do not create many pages with a new structure before recording the template.
