// Repository-specific Bun host policy. Each rule lives in its own file under rules/.
import { noHostApiOutsideAdapters } from "./rules/no-host-api-outside-adapters.ts";
import { noRuntimeOutsideEntrypoints } from "./rules/no-runtime-outside-entrypoints.ts";

export default {
  meta: { name: "bun" },
  rules: {
    "no-host-api-outside-adapters": noHostApiOutsideAdapters,
    "no-runtime-outside-entrypoints": noRuntimeOutsideEntrypoints,
  },
};
