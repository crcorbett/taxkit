import {
  declarePostHogProjects,
  nativePostHogSecrets,
  PostHogProjectProviderLive,
} from "@taxkit/infrastructure/posthog";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";

// Native CLI owns planning and changes. This declaration grants neither a
// management credential nor a project change; review each exact operation.
export default Alchemy.Stack(
  "TaxKitPostHog",
  {
    providers: PostHogProjectProviderLive,
    secrets: nativePostHogSecrets,
    state: Cloudflare.state(),
  },
  declarePostHogProjects
);
