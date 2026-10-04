import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Console,
  Effect,
  HashMap,
  Match,
  Option,
} from "effect";
import type { Schema } from "effect";
import type * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { inspectDeploymentAutomationRegisters } from "./automation.policy.js";
import {
  DeploymentAutomationInputError,
  DeploymentAutomationPolicyError,
  DeploymentAutomationRegister,
  DeploymentControlRegister,
} from "./automation.schemas.js";
import { readDeploymentJson, readDeploymentSha256 } from "./input.boundary.js";
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

const readAutomationJson = <A>(
  repositoryRoot: string,
  target: string,
  schema: Schema.ConstraintDecoder<A>
) =>
  readDeploymentJson(repositoryRoot, target, schema).pipe(
    Effect.mapError(() => new DeploymentAutomationInputError({ target }))
  );

export const checkDocsDeploymentAutomation = (repositoryRoot: string) =>
  Effect.gen(function* checkDocsDeploymentAutomationProgram() {
    const [automations, controls] = yield* Effect.all([
      readAutomationJson(
        repositoryRoot,
        "tools/docs-deployment/automation-register.json",
        DeploymentAutomationRegister
      ),
      readAutomationJson(
        repositoryRoot,
        "tools/docs-deployment/controls.json",
        DeploymentControlRegister
      ),
    ]);
    const entries = yield* Effect.forEach(automations, (automation) => {
      const receiptPath = automation.externalState.receipt;
      if (
        automation.externalState.status !== "established" ||
        receiptPath === null
      ) {
        return Effect.succeed(Option.none());
      }
      return Effect.gen(function* () {
        const receipt = yield* readAutomationJson(
          repositoryRoot,
          receiptPath,
          DeploymentWorkflowExternalReceipt
        );
        const plan =
          receipt.planPath === null
            ? null
            : yield* readAutomationJson(
                repositoryRoot,
                receipt.planPath,
                DeploymentPlanReceipt
              );
        const provider = yield* Option.fromNullishOr(
          receipt.providerReadbackPath
        ).pipe(
          Option.match({
            onNone: () => Effect.succeed(null),
            onSome: (
              providerPath
            ): Effect.Effect<
              DeploymentWorkflowExternalEvidence["provider"],
              DeploymentAutomationInputError,
              FileSystem.FileSystem | Path.Path
            > => {
              if (automation.id === "docs-preview-teardown") {
                return readAutomationJson(
                  repositoryRoot,
                  providerPath,
                  DeploymentWorkflowTeardownReadback
                );
              }
              return readAutomationJson(
                repositoryRoot,
                providerPath,
                DeploymentWorkflowProviderReadback
              );
            },
          })
        );
        const hosted =
          receipt.hostedProofPath === null
            ? null
            : yield* readAutomationJson(
                repositoryRoot,
                receipt.hostedProofPath,
                DeploymentWorkflowHostedProbe
              );
        if (hosted !== null) {
          yield* Effect.forEach(hosted.screenshots, (screenshot) =>
            readDeploymentSha256(repositoryRoot, screenshot.path).pipe(
              Effect.mapError(
                () =>
                  new DeploymentAutomationInputError({
                    target: screenshot.path,
                  })
              ),
              Effect.flatMap((digest) =>
                digest === screenshot.sha256
                  ? Effect.void
                  : Effect.fail(
                      new DeploymentAutomationInputError({
                        target: `${receipt.hostedProofPath}:${screenshot.path}:sha256`,
                      })
                    )
              )
            )
          );
        }
        const workflowRun = yield* readAutomationJson(
          repositoryRoot,
          receipt.workflowRunPath,
          DeploymentWorkflowRunReadback
        );
        const workflowInput = yield* readAutomationJson(
          repositoryRoot,
          receipt.workflowInputPath,
          DeploymentWorkflowInputReadback
        );
        return Option.some([
          automation.id,
          receipt,
          { hosted, plan, provider, receipt, workflowInput, workflowRun },
        ] as const);
      });
    });
    const externalReceipts = HashMap.fromIterable(
      EffectArray.flatMap(entries, (entry) =>
        Option.match(entry, {
          onNone: () => [],
          onSome: ([id, receipt]) => [[id, receipt] as const],
        })
      )
    );
    const externalEvidence = HashMap.fromIterable(
      EffectArray.flatMap(entries, (entry) =>
        Option.match(entry, {
          onNone: () => [],
          onSome: ([id, _receipt, evidence]) => [[id, evidence] as const],
        })
      )
    );
    const findings = yield* inspectDeploymentAutomationRegisters(
      automations,
      controls,
      externalReceipts,
      externalEvidence
    );
    if (EffectArray.isReadonlyArrayNonEmpty(findings)) {
      return yield* new DeploymentAutomationPolicyError({ findings });
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
  Match.when(true, () =>
    BunRuntime.runMain(program, { disableErrorReporting: true })
  ),
  Match.orElse(() => false)
);
