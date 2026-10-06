import { RetiredDocsStack } from "@taxkit/infrastructure/stack";

export default new RetiredDocsStack({
  reason: "The old docs app and its default Stack are retired.",
  recoveryRecord:
    "docs/documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json",
});
