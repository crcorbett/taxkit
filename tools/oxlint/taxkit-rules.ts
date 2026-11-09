// Repository-specific syntax policy. Each rule lives in its own file under rules/.
import { noContextNullishDefault } from "./rules/no-context-nullish-default.ts";
import { noDateConstruction } from "./rules/no-date-construction.ts";
import { noDecodingOutsideBoundaries } from "./rules/no-decoding-outside-boundaries.ts";
import { noNativeArrayMethods } from "./rules/no-native-array-methods.ts";
import { noNativeCollections } from "./rules/no-native-collections.ts";
import { noNestedWrapperCalls } from "./rules/no-nested-wrapper-calls.ts";
import { noObjectWrites } from "./rules/no-object-writes.ts";

export default {
  meta: { name: "taxkit" },
  rules: {
    "no-context-nullish-default": noContextNullishDefault,
    "no-date-construction": noDateConstruction,
    "no-decoding-outside-boundaries": noDecodingOutsideBoundaries,
    "no-native-array-methods": noNativeArrayMethods,
    "no-native-collections": noNativeCollections,
    "no-nested-wrapper-calls": noNestedWrapperCalls,
    "no-object-writes": noObjectWrites,
  },
};
