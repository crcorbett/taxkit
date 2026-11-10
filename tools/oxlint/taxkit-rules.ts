// Repository-specific syntax policy. Each rule lives in its own file under rules/.
import { noDateConstruction } from "./rules/no-date-construction.ts";
import { noInventedTaxContext } from "./rules/no-invented-tax-context.ts";
import { noNativeArrayMethods } from "./rules/no-native-array-methods.ts";
import { noNestedWrapperCalls } from "./rules/no-nested-wrapper-calls.ts";
import { noObjectWrites } from "./rules/no-object-writes.ts";

export default {
  meta: { name: "taxkit" },
  rules: {
    "no-date-construction": noDateConstruction,
    "no-invented-tax-context": noInventedTaxContext,
    "no-native-array-methods": noNativeArrayMethods,
    "no-nested-wrapper-calls": noNestedWrapperCalls,
    "no-object-writes": noObjectWrites,
  },
};
