import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Console, Effect, Match, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import {
  decodeQualityWorkflow,
  inspectQualityWorkflow,
  inspectGovernanceRegisters,
  inspectReleaseBoundaryFixtures,
  inspectReleaseRuntime,
  renderQualityWorkflowReport,
} from "./policy.js";
import {
  QualityWorkflowInputError,
  QualityWorkflowPolicyError,
  AutomationRegister,
  ControlRegister,
  ReleaseBoundaryFixtureCorpus,
} from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);

export const checkQualityWorkflow = (repositoryRoot: string) =>
  Effect.gen(function* checkQualityWorkflowProgram() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const workflowPath = path.join(
      repositoryRoot,
      ".github/workflows/quality.yml"
    );
    const workflow = yield* fileSystem
      .readFileString(workflowPath)
      .pipe(Effect.flatMap(decodeQualityWorkflow));
    const decodeJson = <A>(target: string, schema: Schema.Schema<A>) =>
      fileSystem.readFileString(path.join(repositoryRoot, target)).pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(Schema.fromJsonString(schema), {
            onExcessProperty: "error",
          })
        ),
        Effect.mapError(() => new QualityWorkflowInputError({ target }))
      );
    const fixtures = yield* decodeJson(
      "tools/quality-workflow/fixtures/release-boundary-defects.json",
      ReleaseBoundaryFixtureCorpus
    );
    const controls = yield* decodeJson(
      "tools/quality-workflow/controls.json",
      ControlRegister
    );
    const automations = yield* decodeJson(
      "tools/quality-workflow/automation-register.json",
      AutomationRegister
    );
    const releaseRuntime = yield* fileSystem.readFileString(
      path.join(
        repositoryRoot,
        "packages/scripts/src/release-readiness/release-readiness.runtime.ts"
      )
    );
    return [
      ...inspectQualityWorkflow(workflow),
      ...inspectReleaseBoundaryFixtures(fixtures),
      ...inspectGovernanceRegisters(controls, automations),
      ...inspectReleaseRuntime(releaseRuntime),
    ];
  });

const program = Effect.gen(function* qualityWorkflowMain() {
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(repositoryRootUrl);
  const findings = yield* checkQualityWorkflow(root);
  yield* Console.info(renderQualityWorkflowReport(findings));
  return yield* Match.value(findings.length).pipe(
    Match.when(0, () => Effect.void),
    Match.orElse(() =>
      Effect.fail(new QualityWorkflowPolicyError({ findings }))
    )
  );
}).pipe(
  Effect.tapErrorTag("QualityWorkflowYamlError", (error) =>
    Console.error(
      `FAIL [workflow-yaml] target=${error.target}; recovery=repair malformed YAML before CI policy inspection.`
    )
  ),
  Effect.tapErrorTag("QualityWorkflowInputError", (error) =>
    Console.error(
      `FAIL [workflow-input] target=${error.target}; recovery=repair the Schema-decoded control corpus before CI policy inspection.`
    )
  ),
  Effect.tapErrorTag("QualityWorkflowPolicyError", (error) =>
    Console.error(renderQualityWorkflowReport(error.findings))
  ),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
