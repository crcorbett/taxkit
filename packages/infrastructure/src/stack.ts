import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

import {
  docsWorkerAssetHeaders,
  docsWorkerCompatibilityDate,
  docsWorkerCompatibilityFlags,
  docsWorkerMemo,
  docsWorkerObservability,
  docsWorkerResourceId,
} from "./cloudflare/website.js";
import type { DocsCloudflareStackStage } from "./cloudflare/website.js";

export { docsCloudflareStackName } from "./cloudflare/website.js";

export const declareDocsStack = ({
  stackName,
  stage,
}: {
  readonly stackName: string;
  readonly stage: DocsCloudflareStackStage;
}) =>
  Effect.gen(function* () {
    const worker = yield* Cloudflare.Website.Vite(docsWorkerResourceId, {
      assets: {
        // Website.Vite does not infer the app-owned _headers file when its
        // config is passed through Alchemy.
        headers: docsWorkerAssetHeaders,
        runWorkerFirst: false,
      },
      compatibility: {
        date: docsWorkerCompatibilityDate,
        flags: [...docsWorkerCompatibilityFlags],
      },
      memo: docsWorkerMemo,
      observability: docsWorkerObservability,
      rootDir: "apps/docs",
      url: true,
    });

    return {
      logicalResourceId: docsWorkerResourceId,
      stackName,
      stage,
      workerName: worker.workerName,
      workerUrl: worker.url,
    };
  });
