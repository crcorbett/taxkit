// Repository-specific Effect policy. Each rule lives in its own file under rules/.
import { noBareEffectTryPromise } from "./rules/no-bare-effect-try-promise.ts";
import { noConsoleOutsideRuntime } from "./rules/no-console-outside-runtime.ts";
import { noEffectTestGlobalMix } from "./rules/no-effect-test-global-mix.ts";
import { noHostImportsInContracts } from "./rules/no-host-imports-in-contracts.ts";
import { noLayerExportsInServiceFiles } from "./rules/no-layer-exports-in-service-files.ts";
import { noModuleLevelMutableTestState } from "./rules/no-module-level-mutable-test-state.ts";
import { noProcessOutsideBoundaries } from "./rules/no-process-outside-boundaries.ts";
import { noRuntimeExecutionOutsideBoundaries } from "./rules/no-runtime-execution-outside-boundaries.ts";
import { noRuntimeReferencesOutsideBoundaries } from "./rules/no-runtime-references-outside-boundaries.ts";
import { noSchemaEncoderOutsideEgress } from "./rules/no-schema-encoder-outside-egress.ts";
import { noSwitch } from "./rules/no-switch.ts";
import { noUnknownServiceContract } from "./rules/no-unknown-service-contract.ts";
import { noUnknownTaggedErrorCause } from "./rules/no-unknown-tagged-error-cause.ts";

export default {
  meta: { name: "effect" },
  rules: {
    "no-bare-effect-try-promise": noBareEffectTryPromise,
    "no-console-outside-runtime": noConsoleOutsideRuntime,
    "no-effect-test-global-mix": noEffectTestGlobalMix,
    "no-host-imports-in-contracts": noHostImportsInContracts,
    "no-layer-exports-in-service-files": noLayerExportsInServiceFiles,
    "no-module-level-mutable-test-state": noModuleLevelMutableTestState,
    "no-process-outside-boundaries": noProcessOutsideBoundaries,
    "no-runtime-execution-outside-boundaries":
      noRuntimeExecutionOutsideBoundaries,
    "no-runtime-references-outside-boundaries":
      noRuntimeReferencesOutsideBoundaries,
    "no-schema-encoder-outside-egress": noSchemaEncoderOutsideEgress,
    "no-switch": noSwitch,
    "no-unknown-service-contract": noUnknownServiceContract,
    "no-unknown-tagged-error-cause": noUnknownTaggedErrorCause,
  },
};
