import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Array as EffectArray, Console, Effect, Match, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { inspectDeploymentAutomationRegisters } from "./automation.policy.js";
import type { DeploymentAutomation } from "./automation.schemas.js";
import {
  DeploymentAutomationInputError,
  DeploymentAutomationPolicyError,
  DeploymentAutomationRegister,
  DeploymentControlRegister,
} from "./automation.schemas.js";
import { DeploymentPlanReceipt } from "./schemas.js";
import {
  DeploymentWorkflowExternalReceipt,
  DeploymentWorkflowHostedProbe,
  DeploymentWorkflowInputReadback,
  DeploymentWorkflowProviderReadback,
  DeploymentWorkflowRunReadback,
  DeploymentWorkflowTeardownReadback,
} from "./workflow-receipts.schemas.js";
import type { DeploymentWorkflowExternalEvidence } from "./workflow-receipts.schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);

const readJson = <A>(
  repositoryRoot: string,
  target: string,
  schema: Schema.ConstraintDecoder<A>
): Effect.Effect<
  A,
  DeploymentAutomationInputError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* readAutomationJson() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const source = yield* fileSystem
      .readFileString(path.join(repositoryRoot, target))
      .pipe(
        Effect.mapError(() => new DeploymentAutomationInputError({ target }))
      );
    return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(schema), {
      onExcessProperty: "error",
    })(source).pipe(
      Effect.mapError(() => new DeploymentAutomationInputError({ target }))
    );
  });

const readSha256 = (
  repositoryRoot: string,
  target: string
): Effect.Effect<
  string,
  DeploymentAutomationInputError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* readDeploymentSha256() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const bytes = yield* fileSystem
      .readFile(path.join(repositoryRoot, target))
      .pipe(
        Effect.mapError(() => new DeploymentAutomationInputError({ target }))
      );
    return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  });

export const checkDocsDeploymentAutomation = (repositoryRoot: string) =>
  Effect.gen(function* checkDocsDeploymentAutomationProgram() {
    const [automations, controls] = yield* Effect.all([
      readJson(
        repositoryRoot,
        "tools/docs-deployment/automation-register.json",
        DeploymentAutomationRegister
      ),
      readJson(
        repositoryRoot,
        "tools/docs-deployment/controls.json",
        DeploymentControlRegister
      ),
    ]);
    const externalReceipts = new Map();
    const externalEvidence = new Map<
      DeploymentAutomation["id"],
      DeploymentWorkflowExternalEvidence
    >();
    for (const automation of automations) {
      if (
        automation.externalState.status === "established" &&
        automation.externalState.receipt !== null
      ) {
        const receipt = yield* readJson(
          repositoryRoot,
          automation.externalState.receipt,
          DeploymentWorkflowExternalReceipt
        );
        const plan =
          receipt.planPath === null
            ? null
            : yield* readJson(
                repositoryRoot,
                receipt.planPath,
                DeploymentPlanReceipt
              );
        let provider: DeploymentWorkflowExternalEvidence["provider"] = null;
        if (receipt.providerReadbackPath !== null) {
          // oxlint-disable-next-line unicorn/prefer-ternary -- decoder selection preserves the distinct teardown absence schema
          if (automation.id === "docs-preview-teardown") {
            provider = yield* readJson(
              repositoryRoot,
              receipt.providerReadbackPath,
              DeploymentWorkflowTeardownReadback
            );
          } else {
            provider = yield* readJson(
              repositoryRoot,
              receipt.providerReadbackPath,
              DeploymentWorkflowProviderReadback
            );
          }
        }
        let hosted: DeploymentWorkflowExternalEvidence["hosted"] = null;
        if (receipt.hostedProofPath !== null) {
          hosted = yield* readJson(
            repositoryRoot,
            receipt.hostedProofPath,
            DeploymentWorkflowHostedProbe
          );
          for (const screenshot of hosted.screenshots) {
            const digest = yield* readSha256(repositoryRoot, screenshot.path);
            if (digest !== screenshot.sha256) {
              return yield* new DeploymentAutomationInputError({
                target: `${receipt.hostedProofPath}:${screenshot.path}:sha256`,
              });
            }
          }
        }
        const workflowRun = yield* readJson(
          repositoryRoot,
          receipt.workflowRunPath,
          DeploymentWorkflowRunReadback
        );
        const workflowInput = yield* readJson(
          repositoryRoot,
          receipt.workflowInputPath,
          DeploymentWorkflowInputReadback
        );
        externalReceipts.set(automation.id, receipt);
        externalEvidence.set(automation.id, {
          hosted,
          plan,
          provider,
          receipt,
          workflowInput,
          workflowRun,
        });
      }
    }
    const findings = inspectDeploymentAutomationRegisters(
      automations,
      controls,
      externalReceipts,
      externalEvidence
    );
    const [firstFinding, ...remainingFindings] = findings;
    if (firstFinding !== undefined) {
      return yield* new DeploymentAutomationPolicyError({
        findings: [firstFinding, ...remainingFindings],
      });
    }
    return {
      automationCount: automations.length,
      controlCount: controls.length,
      externalStateEstablished: EffectArray.filter(
        automations,
        (entry) => entry.externalState.status === "established"
      ).length,
    };
  });

const program = Effect.gen(function* main() {
  const path = yield* Path.Path;
  const repositoryRoot = yield* path.fromFileUrl(repositoryRootUrl);
  const result = yield* checkDocsDeploymentAutomation(repositoryRoot);
  yield* Console.info(
    `Docs deployment automation validation: automations=${result.automationCount}; controls=${result.controlCount}; externalStateEstablished=${result.externalStateEstablished}; violations=0.`
  );
}).pipe(
  Effect.tapErrorTag("DeploymentAutomationInputError", (error) =>
    Console.error(
      `FAIL [automation-input] target=${error.target}; recovery=repair the Schema-decoded deployment automation register.`
    )
  ),
  Effect.tapErrorTag("DeploymentAutomationPolicyError", (error) =>
    Console.error(
      EffectArray.map(
        error.findings,
        (item) =>
          `FAIL [${item.invariant}] target=${item.target}; recovery=${item.recovery}`
      ).join("\n")
    )
  ),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
