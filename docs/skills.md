---
document_type: repository-skill-router
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-05
review_trigger: plugin source, skill routing, or repository profile change
---

# Development skills

Use the latest published `development-workflows` plugin from the `commonplace`
marketplace. Shared skills must not be copied into this repository or linked
from its agent skill folders to a personal installation.

## Resolve the current plugin before starting work

1. Refresh the marketplace and look up the latest published plugin version.
   The source is [Commonplace Plugins](https://github.com/crcorbett/commonplace-plugins).
   Check the current [plugin manifest](https://github.com/crcorbett/commonplace-plugins/blob/main/plugins/development-workflows/.claude-plugin/plugin.json)
   and its matching published release; do not assume an installed cache is current.
2. Discover the plugin through the current agent's skill list or plugin manager.
   Compare its version with that lookup and update the installation if it is old.
   Load the required `development-workflows:<skill-name>` from that installation.
3. If the latest version cannot be checked or loaded, report that blocker before
   doing work that requires the skill. Do not fall back to a saved copy, an old
   cache, a fixed plugin version, or a hard-coded path on someone's computer.
4. Read the repository profiles below alongside the plugin. They hold local
   paths and commands; the plugin holds the shared instructions. Record the
   version used in the task's evidence when a proof record is required.

This is an agent startup requirement. The old checks for copied shared
skills have been removed. Code, package and documentation checks remain; they
do not prove that an agent refreshed its installation or that an online lookup
succeeded.

## Shared skills

- `development-workflows:alchemy-iac`
- `development-workflows:docs-maintainer`
- `development-workflows:effect-client-wrapper`
- `development-workflows:package-structure`
- `development-workflows:prd-implementer`
- `development-workflows:prd-review`
- `development-workflows:prd-writer`
- `development-workflows:repo-structure`
- `development-workflows:strict-effect-ts`

## Repository profiles

- [Documentation profile](skill-profiles/docs-maintainer.md)
- [Package profile](skill-profiles/package-structure.md)

Other repository-specific or third-party skills remain local where there is no
replacement in this plugin. They must not override the shared skills above.
Historical audit and proof records describe the version used at that time;
they do not select the current plugin version.
