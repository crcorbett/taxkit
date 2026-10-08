import { nativeAppsSecrets } from "@taxkit/infrastructure/apps-secrets";
import { declareNativeAppsStack } from "@taxkit/infrastructure/apps-stack";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";

// Reviewable native app graph only. Current Docs operations still select
// alchemy.run.ts; no provider operation is authorised by this declaration.
export default Alchemy.Stack(
  "TaxKitAppsCloudflare",
  {
    providers: Cloudflare.providers(),
    secrets: nativeAppsSecrets,
    state: Cloudflare.state(),
  },
  declareNativeAppsStack
);
