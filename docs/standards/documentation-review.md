---
status: canonical
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# Documentation review

Use this guide when reviewing, editing or auditing WhatTax documentation.

Review docs in passes. Do not try to catch voice, structure, accuracy and
links in one read.

## Pass 1: reader and purpose

Ask:

- Who is the reader?
- What decision or task brought them here?
- Does the first paragraph tell them what this page is for?
- Does the page assume internal package knowledge too early?
- Does the page end with a useful next step?

The page should name one primary reader and one primary outcome. If it has
several unrelated outcomes, split it or add a clear navigation section.

## Pass 2: structure

Ask:

- Does the page use a documented template from
  [Documentation templates](./documentation-templates.md)?
- If it introduces a repeated structure, has the new template been added?
- Are sections in the order a developer needs them?
- Are prerequisites before commands?
- Are examples before deep explanation?
- Is reference material separated from guide material?

## Pass 3: voice and style

Check:

- second person voice
- Australian spelling
- sentence-case headings
- short paragraphs
- direct verbs
- no marketing language
- no banned hype words from [Documentation style](./documentation-style.md)

Search terms that usually need revision:

```txt
easy|simple|simply|just|seamless|seamlessly|powerful|effortless|beautiful|magical|unlock|leverage|utilise|streamline
```

## Pass 4: technical accuracy

Check:

- current SDK/API names
- canonical schemas, constructors and branded values
- package ownership
- import paths
- examples that match current exports
- route names and endpoint paths
- release or private-package status

For SDK/API docs, search for stale names:

```txt
calculateRequest|createEffectClient|PublicCalculationMetadata|PublicErrorEnvelope|publicCalculationMetadata
```

## Pass 5: diagrams and examples

Check:

- diagrams explain architecture, ownership, runtime flow, contribution flow or
  testing flow
- diagrams are not decorative
- flowcharts are used for branching decisions
- call graphs are used for package/runtime paths
- sequence diagrams are avoided unless they are clearly the best option
- snippets include imports when copyable
- snippets use canonical schema-owned values

## Pass 6: links and source of truth

Check:

- every local link resolves
- reference pages link to generated or canonical sources where possible
- public docs do not duplicate long architecture manuals
- private downstream product names are absent
- package README links are used for package-local details

## Required audit checklist

Use this checklist for public MDX pages and package docs:

- [ ] The target reader is clear.
- [ ] The page has one primary outcome.
- [ ] The page uses a documented template, or adds a new template.
- [ ] Headings are sentence case.
- [ ] Prose uses second person.
- [ ] Australian spelling is consistent.
- [ ] Marketing language is absent.
- [ ] Code examples use current names.
- [ ] Canonical schemas/types/constructors are used.
- [ ] Diagrams are relevant and useful.
- [ ] Links point to the owning source of truth.
- [ ] The page has useful next steps.

## Contribution-doc audit checklist

Use this checklist for contribution docs:

- [ ] The owning package is named.
- [ ] The required source material is named.
- [ ] The page explains what to propose before coding.
- [ ] The page explains required tests.
- [ ] The page requires source citations.
- [ ] The page explains API/SDK compatibility impact.
- [ ] The page explains Changeset or no-changeset expectations.
- [ ] The page does not put tax logic in HTTP, SDK or docs-only examples.

## Task-list audit checklist

Use this checklist for documentation task lists:

- [ ] Each docs-writing task requires reading this standards suite.
- [ ] Each docs-writing task names the expected page type or template.
- [ ] Each task includes `bun run verification` unless it has a narrower
      documented reason.
- [ ] Each task includes MDX validation when MDX exists.
- [ ] Each task includes a link audit or explicit follow-up.
- [ ] Each task includes example validation or explicit follow-up.
- [ ] Each task includes a Changeset or no-changeset rationale.
- [ ] Each task requires parent review for style, structure and accuracy.
