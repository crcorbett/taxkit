import { deploymentSecrets } from "@taxkit/infrastructure/secrets";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";

import { declareNativeAppsStack } from "./alchemy.apps.js";

// The Website/API pair for `prod` and `pr-<number>` stages. The stack name
// and resource IDs are the existing state identity; do not rename them.
export default Alchemy.Stack(
  "TaxKitAppsCloudflare",
  {
    providers: Cloudflare.providers(),
    secrets: deploymentSecrets,
    state: Cloudflare.state(),
  },
  declareNativeAppsStack
);
