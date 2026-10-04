import { Effect, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { DocsDeploymentInventoryReport } from "./inventory.schemas.js";
import { requireDocsDeploymentInventoryAgreement } from "./inventory.service.js";

const rawReport = {
  agreement: "state-provider-agree",
  nonClaims: ["local fixture"],
  providerWorkers: [
    {
      logicalId: "DocsWebsite",
      stage: "prod",
      workerName: "taxkitdocscloudflare-docswebsite-prod-example",
    },
  ],
  stack: "TaxKitDocsCloudflare",
  stages: [
    {
      resources: [
        {
          instanceId: "worker-instance",
          logicalId: "DocsWebsite",
          resourceType: "Cloudflare.Worker",
          status: "updated",
          workerName: "taxkitdocscloudflare-docswebsite-prod-example",
          workerUrl:
            "https://taxkitdocscloudflare-docswebsite-prod-example.example.workers.dev",
        },
      ],
      stage: "prod",
    },
  ],
  stateStore: {
    id: "cloudflare-http",
    version: 7,
  },
};

const decodeReport = (input: typeof Schema.Unknown.Type) =>
  Effect.runPromise(
    Schema.decodeUnknownEffect(DocsDeploymentInventoryReport)(input)
  );

describe("docs deployment state/provider inventory", () => {
  test("accepts the exact TaxKit stack when state and provider agree", async () => {
    const report = await decodeReport(rawReport);
    await expect(
      Effect.runPromise(
        requireDocsDeploymentInventoryAgreement(
          report.stages,
          report.providerWorkers
        )
      )
    ).resolves.toBeUndefined();
  });

  test("rejects state and provider Worker disagreement", async () => {
    const report = await decodeReport(rawReport);
    const contaminated = await decodeReport({
      ...rawReport,
      providerWorkers: [
        {
          logicalId: "DocsWebsite",
          stage: "prod",
          workerName: "taxkitdocscloudflare-docswebsite-prod-provider-only",
        },
      ],
    });
    await expect(
      Effect.runPromise(
        requireDocsDeploymentInventoryAgreement(
          report.stages,
          contaminated.providerWorkers
        )
      )
    ).rejects.toHaveProperty(
      "_tag",
      "DocsDeploymentInventoryDisagreementError"
    );
  });
});
