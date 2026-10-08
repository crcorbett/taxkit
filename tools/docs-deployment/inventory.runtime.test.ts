import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import {
  Config,
  ConfigProvider,
  Effect,
  FileSystem,
  Option,
  PlatformError,
  Redacted,
  Result,
  Schema,
} from "effect";

import { encodeDocsDeploymentInventoryReport } from "./inventory.report.egress.js";
import { readInventoryProgram } from "./inventory.runtime.js";
import {
  DocsDeploymentInventoryReport,
  DocsDeploymentInventoryRuntimeConfig,
} from "./inventory.schemas.js";
import { DocsDeploymentInventoryTest } from "./inventory.test.layer.js";

const reportFixture = Schema.decodeUnknownEffect(DocsDeploymentInventoryReport)(
  {
    agreement: "state-provider-agree",
    nonClaims: ["local fixture"],
    providerWorkers: [],
    stack: "TaxKitDocsCloudflare",
    stages: [],
    stateStore: { id: "cloudflare-http", version: 7 },
  }
);
const expectedReport = `{
  "agreement": "state-provider-agree",
  "nonClaims": [
    "local fixture"
  ],
  "providerWorkers": [],
  "stack": "TaxKitDocsCloudflare",
  "stages": [],
  "stateStore": {
    "id": "cloudflare-http",
    "version": 7
  }
}
`;

describe("inventory report output and configuration", () => {
  test.effect("keeps the saved pretty JSON bytes and final newline", () =>
    Effect.gen(function* () {
      const report = yield* reportFixture;
      expect(yield* encodeDocsDeploymentInventoryReport(report)).toBe(
        expectedReport
      );
    })
  );
  test.effect(
    "writes the test service report through the same caller operation",
    () =>
      Effect.gen(function* () {
        const report = yield* reportFixture;
        const fileSystem = yield* FileSystem.FileSystem;
        const directory = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "taxkit-inventory-report-",
        });
        const path = `${directory}/inventory.json`;
        yield* readInventoryProgram(Option.some(path)).pipe(
          Effect.provide(DocsDeploymentInventoryTest(report))
        );
        expect(yield* fileSystem.readFileString(path)).toBe(expectedReport);
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
  test.effect("keeps file write refusal details out of the public error", () =>
    Effect.gen(function* () {
      const report = yield* reportFixture;
      const result = yield* readInventoryProgram(
        Option.some("fixture.json")
      ).pipe(
        Effect.provide(DocsDeploymentInventoryTest(report)),
        Effect.provide(
          FileSystem.layerNoop({
            writeFileString: () =>
              Effect.fail(
                PlatformError.badArgument({
                  description: "TAXKIT_SECRET_SENTINEL",
                  method: "writeFileString",
                  module: "FileSystem",
                })
              ),
          })
        ),
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) => {
          expect(error._tag).toBe("DocsDeploymentInventoryOutputError");
          expect(error).toMatchObject({
            reason: "write",
          });
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.fail("A refused file write must fail"),
      });
    })
  );
  test.effect("owns the profile default and absent optional settings", () =>
    Effect.gen(function* () {
      const config = yield* Config.schema(
        DocsDeploymentInventoryRuntimeConfig
      ).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({ CI: "1" })
        )
      );
      expect(config.ALCHEMY_PROFILE).toBe("default");
      expect(Option.isNone(config.ALCHEMY_STATE_STORE_CREDENTIALS_JSON)).toBe(
        true
      );
      expect(
        Option.isNone(config.TAXKIT_DOCS_DEPLOYMENT_INVENTORY_REPORT)
      ).toBe(true);
    })
  );
  test.effect(
    "preserves explicitly empty settings and redacts the credential source",
    () =>
      Effect.gen(function* () {
        const config = yield* Config.schema(
          DocsDeploymentInventoryRuntimeConfig
        ).pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnvRecord(
              {
                ALCHEMY_PROFILE: "",
                ALCHEMY_STATE_STORE_CREDENTIALS_JSON: "",
                CI: "true",
                TAXKIT_DOCS_DEPLOYMENT_INVENTORY_REPORT: "",
              },
              { preserveEmptyStrings: true }
            )
          )
        );
        expect(config.ALCHEMY_PROFILE).toBe("");
        expect(config.TAXKIT_DOCS_DEPLOYMENT_INVENTORY_REPORT).toEqual(
          Option.some("")
        );
        expect(
          Option.map(
            config.ALCHEMY_STATE_STORE_CREDENTIALS_JSON,
            Redacted.value
          )
        ).toEqual(Option.some(""));
      })
  );
  test.effect.each([undefined, "false", "0"])("rejects CI setting %s", (ci) =>
    Effect.gen(function* () {
      const result = yield* Config.schema(
        DocsDeploymentInventoryRuntimeConfig
      ).pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({ CI: ci })
        ),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
    })
  );
});
