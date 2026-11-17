// Repository-specific syntax policy. Each rule lives in its own file under rules/.
import { noDateConstruction } from "./rules/no-date-construction.ts";
import { noInventedTaxContext } from "./rules/no-invented-tax-context.ts";
import { noNestedWrapperCalls } from "./rules/no-nested-wrapper-calls.ts";
import { noObjectWrites } from "./rules/no-object-writes.ts";
import { protectedRuleDirectives } from "./rules/protected-rule-directives.ts";

export default {
  meta: { name: "taxkit" },
  rules: {
    "no-date-construction": noDateConstruction,
    "no-invented-tax-context": noInventedTaxContext,
    "no-nested-wrapper-calls": noNestedWrapperCalls,
    "no-object-writes": noObjectWrites,
    "protected-rule-directives": protectedRuleDirectives,
  },
};
