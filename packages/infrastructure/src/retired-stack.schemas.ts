import { Schema } from "effect";

// This is data, never an Effect or a Stack. Alchemy must reject it before
// constructing session services, providers or remote state.
export class RetiredDocsStack extends Schema.TaggedClass<RetiredDocsStack>()(
  "RetiredDocsStack",
  {
    reason: Schema.Literal(
      "The old docs app and its default Stack are retired."
    ),
    recoveryRecord: Schema.Literal(
      "docs/documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json"
    ),
  }
) {}
