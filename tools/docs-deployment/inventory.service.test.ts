import { describe, expect, it as test } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";

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
  Schema.decodeUnknownEffect(DocsDeploymentInventoryReport)(input);

describe("docs deployment state/provider inventory", () => {
  test.effect(
    "accepts the exact TaxKit stack when state and provider agree",
    () =>
      Effect.gen(function* () {
        const report = yield* decodeReport(rawReport);
        expect(
          yield* requireDocsDeploymentInventoryAgreement(
            report.stages,
            report.providerWorkers
          )
        ).toBeUndefined();
      })
  );

  test.effect("rejects state and provider Worker disagreement", () =>
    Effect.gen(function* () {
      const report = yield* decodeReport(rawReport);
      const contaminated = yield* decodeReport({
        ...rawReport,
        providerWorkers: [
          {
            logicalId: "DocsWebsite",
            stage: "prod",
            workerName: "taxkitdocscloudflare-docswebsite-prod-provider-only",
          },
        ],
      });
      const result = yield* requireDocsDeploymentInventoryAgreement(
        report.stages,
        contaminated.providerWorkers
      ).pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      Result.match(result, {
        onFailure: (error) =>
          expect(error._tag).toBe("DocsDeploymentInventoryDisagreementError"),
        onSuccess: () =>
          expect.fail("Mismatched Workers must remain a failure."),
      });
    })
  );
});
