// Repository-specific Effect policy. Each rule lives in its own file under rules/.
import { inlineTryPromiseCallbacks } from "./rules/inline-try-promise-callbacks.ts";

export default {
  meta: { name: "effect" },
  rules: {
    "inline-try-promise-callbacks": inlineTryPromiseCallbacks,
  },
};
