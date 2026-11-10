// Repository-specific Effect policy. Each rule lives in its own file under rules/.
import { inlineTryPromiseCallbacks } from "./rules/inline-try-promise-callbacks.ts";
import { noModuleLevelMutableTestState } from "./rules/no-module-level-mutable-test-state.ts";
import { noSwitch } from "./rules/no-switch.ts";

export default {
  meta: { name: "effect" },
  rules: {
    "inline-try-promise-callbacks": inlineTryPromiseCallbacks,
    "no-module-level-mutable-test-state": noModuleLevelMutableTestState,
    "no-switch": noSwitch,
  },
};
