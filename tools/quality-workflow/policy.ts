import ts from "@typescript/typescript6";
import { Effect, Schema } from "effect";
import { parseDocument } from "yaml";

import {
  QualityWorkflowDocument,
  QualityWorkflowFinding,
  QualityWorkflowYamlError,
} from "./schemas.js";
import type {
  AutomationRegisterEntry,
  ControlRegisterEntry,
  ReleaseBoundaryFixture,
} from "./schemas.js";

const actionPin = /^[^\s@]+@[a-f0-9]{40}$/u;
const expectedActionPinOwner = "taxkit-ci-release-maintainer";
const workflowExpressionPrefix = "$";
const expectedConcurrencyGroup = [
  "quality-",
  `${workflowExpressionPrefix}{{ github.workflow }}-`,
  `${workflowExpressionPrefix}{{ github.ref }}`,
].join("");
const trustedEventCondition =
  "github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository";
const forkEventCondition =
  "github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository";
const trustedTurboCache = "local:rw,remote:rw";
const forkTurboCache = "local:rw";
const dopplerActionSha = "451892f16195f9ac360e1a5bcbf0b5fd0e957534";
const dopplerAction = `dopplerhq/secrets-fetch-action@${dopplerActionSha}`;
const dopplerToken = [
  workflowExpressionPrefix,
  "{{ secrets.DOPPLER_CI_TOKEN }}",
].join("");
const dopplerProjectOutput = [
  workflowExpressionPrefix,
  "{{ steps.doppler-ci.outputs.DOPPLER_PROJECT }}",
].join("");
const dopplerConfigOutput = [
  workflowExpressionPrefix,
  "{{ steps.doppler-ci.outputs.DOPPLER_CONFIG }}",
].join("");
const turboTeamOutput = [
  workflowExpressionPrefix,
  "{{ steps.doppler-ci.outputs.TURBO_TEAM }}",
].join("");
const turboTokenOutput = [
  workflowExpressionPrefix,
  "{{ steps.doppler-ci.outputs.TURBO_TOKEN }}",
].join("");
const dopplerIdentityCommand =
  'test "$DOPPLER_PROJECT" = "taxkit" && test "$DOPPLER_CONFIG" = "ci"';
const checkoutActionSha = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const checkoutAction = `actions/checkout@${checkoutActionSha}`;
const cacheActionSha = "55cc8345863c7cc4c66a329aec7e433d2d1c52a9";
const cacheRestoreAction = `actions/cache/restore@${cacheActionSha}`;
const cacheSaveAction = `actions/cache/save@${cacheActionSha}`;
const bunCachePathCommand = 'echo "path=$(bun pm cache)" >> "$GITHUB_OUTPUT"';
const playwrightCachePathCommand =
  'echo "PLAYWRIGHT_BROWSERS_PATH=$RUNNER_TEMP/ms-playwright" >> "$GITHUB_ENV"';
const playwrightIdentityCommand =
  'echo "version=$(apps/docs/node_modules/.bin/playwright --version | cut -d\' \' -f2)" >> "$GITHUB_OUTPUT"';
const expectedBunCachePath = [
  workflowExpressionPrefix,
  "{{ steps.bun-cache-path.outputs.path }}",
].join("");
const expectedBunCacheKey = [
  "bun-packages-",
  workflowExpressionPrefix,
  "{{ runner.os }}-",
  workflowExpressionPrefix,
  "{{ runner.arch }}-",
  workflowExpressionPrefix,
  "{{ hashFiles('.bun-version') }}-",
  workflowExpressionPrefix,
  "{{ hashFiles('bun.lock') }}",
].join("");
const expectedPlaywrightCachePath = [
  workflowExpressionPrefix,
  "{{ env.PLAYWRIGHT_BROWSERS_PATH }}",
].join("");
const expectedPlaywrightCacheKey = [
  "playwright-chromium-",
  workflowExpressionPrefix,
  "{{ runner.os }}-",
  workflowExpressionPrefix,
  "{{ runner.arch }}-",
  workflowExpressionPrefix,
  "{{ steps.playwright-identity.outputs.version }}-",
  workflowExpressionPrefix,
  "{{ hashFiles('bun.lock') }}",
].join("");
const expectedBunSaveKey = [
  workflowExpressionPrefix,
  "{{ steps.bun-cache-restore.outputs.cache-primary-key }}",
].join("");
const expectedPlaywrightSaveKey = [
  workflowExpressionPrefix,
  "{{ steps.playwright-cache-restore.outputs.cache-primary-key }}",
].join("");
const expectedRunSteps: readonly string[] = [
  "git show-ref --verify --quiet refs/heads/main || git branch --track main origin/main",
  bunCachePathCommand,
  "bun install --frozen-lockfile",
  playwrightCachePathCommand,
  playwrightIdentityCommand,
  "apps/docs/node_modules/.bin/playwright install --with-deps chromium",
  "bun run check:quality-workflow",
  dopplerIdentityCommand,
  "bun run release:check -- --ci",
  "bun run release:check -- --ci",
];
const expectedActionSteps = [
  checkoutAction,
  "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6",
  cacheRestoreAction,
  cacheSaveAction,
  cacheRestoreAction,
  cacheSaveAction,
  dopplerAction,
];
const UnknownRecord = Schema.Record(Schema.String, Schema.Unknown);
type UntrustedWorkflowValue = typeof Schema.Unknown.Type;
type WorkflowRecord = typeof UnknownRecord.Type;

const finding = (
  invariant: (typeof QualityWorkflowFinding.Type)["invariant"],
  target: string,
  recovery: string
) => new QualityWorkflowFinding({ invariant, recovery, target });

const asRecord = (value: UntrustedWorkflowValue): WorkflowRecord | null =>
  Schema.is(UnknownRecord)(value) ? value : null;

const hasOnly = (record: WorkflowRecord, expected: string[]) =>
  Reflect.ownKeys(record).length === expected.length &&
  expected.every((key) => key in record);

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  return expression;
};

const callIdentity = (expression: ts.Expression): string | null => {
  const unwrapped = unwrapExpression(expression);
  if (ts.isIdentifier(unwrapped)) {
    return unwrapped.text;
  }
  if (
    ts.isPropertyAccessExpression(unwrapped) &&
    ts.isIdentifier(unwrapped.expression)
  ) {
    return `${unwrapped.expression.text}.${unwrapped.name.text}`;
  }
  return null;
};

const callExpressions = (node: ts.Node) => {
  const calls: ts.CallExpression[] = [];
  const visit = (child: ts.Node) => {
    if (ts.isCallExpression(child)) {
      calls.push(child);
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return calls;
};

const hasNamedImport = (
  file: ts.SourceFile,
  moduleName: string,
  importedName: string
) =>
  file.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) =>
          element.name.text === importedName &&
          (element.propertyName?.text ?? element.name.text) === importedName
      )
  );

const hasShadowedReservedCallBinding = (file: ts.SourceFile) => {
  const reserved = new Set([
    "Console",
    "createReleaseReadinessPlan",
    "runCiReleaseReadiness",
  ]);
  let shadowed = false;
  const visit = (node: ts.Node) => {
    const namedDeclaration =
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node);
    if (
      namedDeclaration &&
      node.name !== undefined &&
      ts.isIdentifier(node.name) &&
      reserved.has(node.name.text)
    ) {
      shadowed = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return shadowed;
};

// oxlint-disable-next-line complexity -- every trigger key and path-filter variant is checked independently so CI cannot skip a boundary.
const inspectTrigger = (
  triggers: WorkflowRecord
): readonly QualityWorkflowFinding[] => {
  const pullRequest = triggers.pull_request;
  const pullRequestRecord = asRecord(pullRequest);
  const push = asRecord(triggers.push);
  const branches = Array.isArray(push?.branches) ? push.branches : [];
  const noPathFilters =
    !Object.hasOwn(triggers, "paths") &&
    !Object.hasOwn(triggers, "paths-ignore") &&
    !Object.hasOwn(push ?? {}, "paths") &&
    !Object.hasOwn(push ?? {}, "paths-ignore") &&
    !Object.hasOwn(asRecord(pullRequest) ?? {}, "paths") &&
    !Object.hasOwn(asRecord(pullRequest) ?? {}, "paths-ignore");
  return hasOnly(triggers, ["pull_request", "push"]) &&
    (pullRequest === null ||
      (pullRequestRecord !== null && hasOnly(pullRequestRecord, []))) &&
    push !== null &&
    hasOnly(push, ["branches"]) &&
    branches.length === 1 &&
    branches.includes("main") &&
    noPathFilters
    ? []
    : [
        finding(
          "workflow-triggers",
          ".github/workflows/quality.yml:on",
          "Use only pull_request and the main push trigger; do not add path filters because new or renamed boundaries must fail closed."
        ),
      ];
};

// oxlint-disable-next-line complexity -- each allowed step key and value is checked independently so execution cannot be skipped or tolerated.
const inspectSteps = (
  steps: UntrustedWorkflowValue
): readonly QualityWorkflowFinding[] => {
  if (!Array.isArray(steps)) {
    return [
      finding(
        "workflow-job-shape",
        ".github/workflows/quality.yml:jobs.quality.steps",
        "Define the actual checkout, Bun setup and canonical release-graph steps."
      ),
    ];
  }
  const actionSteps = steps
    .map(asRecord)
    .filter((step): step is WorkflowRecord => step !== null)
    .flatMap((step) =>
      Schema.is(Schema.String)(step.uses) ? [step.uses] : []
    );
  const runSteps = steps
    .map(asRecord)
    .filter((step): step is WorkflowRecord => step !== null)
    .flatMap((step) => (Schema.is(Schema.String)(step.run) ? [step.run] : []));
  const validActionSteps =
    actionSteps.length === expectedActionSteps.length &&
    actionSteps.every(
      (step) => actionPin.test(step) && expectedActionSteps.includes(step)
    ) &&
    expectedActionSteps.every(
      (step) =>
        actionSteps.filter((actual) => actual === step).length ===
        expectedActionSteps.filter((expected) => expected === step).length
    );
  const validRunSteps =
    runSteps.length === expectedRunSteps.length &&
    runSteps.every((step) => expectedRunSteps.includes(step)) &&
    expectedRunSteps.every(
      (step) =>
        runSteps.filter((actual) => actual === step).length ===
        expectedRunSteps.filter((expected) => expected === step).length
    );
  const checkoutStep = asRecord(steps[0]);
  const checkoutWith = asRecord(checkoutStep?.with);
  const historyStep = asRecord(steps[1]);
  const setupStep = asRecord(steps[2]);
  const setupWith = asRecord(setupStep?.with);
  const bunCachePathStep = asRecord(steps[3]);
  const bunCacheRestoreStep = asRecord(steps[4]);
  const bunCacheRestoreWith = asRecord(bunCacheRestoreStep?.with);
  const installStep = asRecord(steps[5]);
  const bunCacheSaveStep = asRecord(steps[6]);
  const bunCacheSaveWith = asRecord(bunCacheSaveStep?.with);
  const playwrightCachePathStep = asRecord(steps[7]);
  const playwrightIdentityStep = asRecord(steps[8]);
  const playwrightCacheRestoreStep = asRecord(steps[9]);
  const playwrightCacheRestoreWith = asRecord(playwrightCacheRestoreStep?.with);
  const browserStep = asRecord(steps[10]);
  const playwrightCacheSaveStep = asRecord(steps[11]);
  const playwrightCacheSaveWith = asRecord(playwrightCacheSaveStep?.with);
  const policyStep = asRecord(steps[12]);
  const dopplerStep = asRecord(steps[13]);
  const dopplerWith = asRecord(dopplerStep?.with);
  const identityStep = asRecord(steps[14]);
  const identityEnv = asRecord(identityStep?.env);
  const trustedReleaseStep = asRecord(steps[15]);
  const trustedReleaseEnv = asRecord(trustedReleaseStep?.env);
  const forkReleaseStep = asRecord(steps[16]);
  const forkReleaseEnv = asRecord(forkReleaseStep?.env);
  const exactSteps =
    steps.length === 17 &&
    checkoutStep !== null &&
    hasOnly(checkoutStep, ["uses", "with"]) &&
    checkoutStep.uses === checkoutAction &&
    checkoutWith !== null &&
    hasOnly(checkoutWith, ["fetch-depth"]) &&
    checkoutWith["fetch-depth"] === 0 &&
    historyStep !== null &&
    hasOnly(historyStep, ["run"]) &&
    historyStep.run ===
      "git show-ref --verify --quiet refs/heads/main || git branch --track main origin/main" &&
    setupStep !== null &&
    hasOnly(setupStep, ["uses", "with"]) &&
    setupStep.uses ===
      "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6" &&
    setupWith !== null &&
    hasOnly(setupWith, ["bun-version-file"]) &&
    setupWith["bun-version-file"] === ".bun-version" &&
    bunCachePathStep !== null &&
    hasOnly(bunCachePathStep, ["id", "run"]) &&
    bunCachePathStep.id === "bun-cache-path" &&
    bunCachePathStep.run === bunCachePathCommand &&
    bunCacheRestoreStep !== null &&
    hasOnly(bunCacheRestoreStep, ["id", "uses", "continue-on-error", "with"]) &&
    bunCacheRestoreStep.id === "bun-cache-restore" &&
    bunCacheRestoreStep.uses === cacheRestoreAction &&
    bunCacheRestoreStep["continue-on-error"] === true &&
    bunCacheRestoreWith !== null &&
    hasOnly(bunCacheRestoreWith, ["path", "key"]) &&
    bunCacheRestoreWith.path === expectedBunCachePath &&
    bunCacheRestoreWith.key === expectedBunCacheKey &&
    installStep !== null &&
    hasOnly(installStep, ["run"]) &&
    installStep.run === "bun install --frozen-lockfile" &&
    bunCacheSaveStep !== null &&
    hasOnly(bunCacheSaveStep, ["uses", "if", "continue-on-error", "with"]) &&
    bunCacheSaveStep.uses === cacheSaveAction &&
    bunCacheSaveStep.if ===
      "steps.bun-cache-restore.outputs.cache-hit != 'true'" &&
    bunCacheSaveStep["continue-on-error"] === true &&
    bunCacheSaveWith !== null &&
    hasOnly(bunCacheSaveWith, ["path", "key"]) &&
    bunCacheSaveWith.path === expectedBunCachePath &&
    bunCacheSaveWith.key === expectedBunSaveKey &&
    playwrightCachePathStep !== null &&
    hasOnly(playwrightCachePathStep, ["run"]) &&
    playwrightCachePathStep.run === playwrightCachePathCommand &&
    playwrightIdentityStep !== null &&
    hasOnly(playwrightIdentityStep, ["id", "run"]) &&
    playwrightIdentityStep.id === "playwright-identity" &&
    playwrightIdentityStep.run === playwrightIdentityCommand &&
    playwrightCacheRestoreStep !== null &&
    hasOnly(playwrightCacheRestoreStep, [
      "id",
      "uses",
      "continue-on-error",
      "with",
    ]) &&
    playwrightCacheRestoreStep.id === "playwright-cache-restore" &&
    playwrightCacheRestoreStep.uses === cacheRestoreAction &&
    playwrightCacheRestoreStep["continue-on-error"] === true &&
    playwrightCacheRestoreWith !== null &&
    hasOnly(playwrightCacheRestoreWith, ["path", "key"]) &&
    playwrightCacheRestoreWith.path === expectedPlaywrightCachePath &&
    playwrightCacheRestoreWith.key === expectedPlaywrightCacheKey &&
    browserStep !== null &&
    hasOnly(browserStep, ["run"]) &&
    browserStep.run ===
      "apps/docs/node_modules/.bin/playwright install --with-deps chromium" &&
    playwrightCacheSaveStep !== null &&
    hasOnly(playwrightCacheSaveStep, [
      "uses",
      "if",
      "continue-on-error",
      "with",
    ]) &&
    playwrightCacheSaveStep.uses === cacheSaveAction &&
    playwrightCacheSaveStep.if ===
      "steps.playwright-cache-restore.outputs.cache-hit != 'true'" &&
    playwrightCacheSaveStep["continue-on-error"] === true &&
    playwrightCacheSaveWith !== null &&
    hasOnly(playwrightCacheSaveWith, ["path", "key"]) &&
    playwrightCacheSaveWith.path === expectedPlaywrightCachePath &&
    playwrightCacheSaveWith.key === expectedPlaywrightSaveKey &&
    policyStep !== null &&
    hasOnly(policyStep, ["run"]) &&
    policyStep.run === "bun run check:quality-workflow" &&
    dopplerStep !== null &&
    hasOnly(dopplerStep, ["name", "id", "if", "uses", "with"]) &&
    dopplerStep.name === "Fetch trusted CI configuration" &&
    dopplerStep.id === "doppler-ci" &&
    dopplerStep.if === trustedEventCondition &&
    dopplerStep.uses === dopplerAction &&
    dopplerWith !== null &&
    hasOnly(dopplerWith, ["doppler-token"]) &&
    dopplerWith["doppler-token"] === dopplerToken &&
    identityStep !== null &&
    hasOnly(identityStep, ["name", "if", "env", "run"]) &&
    identityStep.name === "Check trusted CI configuration identity" &&
    identityStep.if === trustedEventCondition &&
    identityEnv !== null &&
    hasOnly(identityEnv, ["DOPPLER_CONFIG", "DOPPLER_PROJECT"]) &&
    identityEnv.DOPPLER_CONFIG === dopplerConfigOutput &&
    identityEnv.DOPPLER_PROJECT === dopplerProjectOutput &&
    identityStep.run === dopplerIdentityCommand &&
    trustedReleaseStep !== null &&
    hasOnly(trustedReleaseStep, ["name", "if", "env", "run"]) &&
    trustedReleaseStep.name === "Run trusted Quality with remote cache" &&
    trustedReleaseStep.if === trustedEventCondition &&
    trustedReleaseEnv !== null &&
    hasOnly(trustedReleaseEnv, ["TURBO_CACHE", "TURBO_TEAM", "TURBO_TOKEN"]) &&
    trustedReleaseEnv.TURBO_CACHE === trustedTurboCache &&
    trustedReleaseEnv.TURBO_TEAM === turboTeamOutput &&
    trustedReleaseEnv.TURBO_TOKEN === turboTokenOutput &&
    trustedReleaseStep.run === "bun run release:check -- --ci" &&
    forkReleaseStep !== null &&
    hasOnly(forkReleaseStep, ["name", "if", "env", "run"]) &&
    forkReleaseStep.name === "Run fork Quality without credentials" &&
    forkReleaseStep.if === forkEventCondition &&
    forkReleaseEnv !== null &&
    hasOnly(forkReleaseEnv, ["TURBO_CACHE"]) &&
    forkReleaseEnv.TURBO_CACHE === forkTurboCache &&
    forkReleaseStep.run === "bun run release:check -- --ci";
  return [
    ...(validActionSteps
      ? []
      : [
          finding(
            "workflow-action-pin",
            ".github/workflows/quality.yml:jobs.quality.steps[*].uses",
            "Pin each actual action step to the approved full forty-hex SHA."
          ),
        ]),
    ...(runSteps.includes("bun run release:check -- --ci")
      ? []
      : [
          finding(
            "canonical-release-graph",
            ".github/workflows/quality.yml:jobs.quality.steps[*].run",
            "Invoke bun run release:check -- --ci from the quality job."
          ),
        ]),
    ...(validRunSteps && exactSteps
      ? []
      : [
          finding(
            "workflow-mutation-step",
            ".github/workflows/quality.yml:jobs.quality.steps",
            "Retain only the exact runner bootstrap steps and canonical release graph owned by this policy."
          ),
        ]),
  ];
};

export const decodeQualityWorkflow = (text: string) => {
  const document = parseDocument(text, { prettyErrors: false, version: "1.2" });
  return document.errors.length === 0
    ? Schema.decodeUnknownEffect(QualityWorkflowDocument, {
        onExcessProperty: "error",
      })(document.toJS())
    : Effect.fail(
        new QualityWorkflowYamlError({
          target: ".github/workflows/quality.yml",
        })
      );
};

const hasExactWorkflowCredentialPolicy = (
  workflow: QualityWorkflowDocument,
  quality: WorkflowRecord | null
) => {
  const steps = Array.isArray(quality?.steps) ? quality.steps : [];
  const stepEnvironments = steps.flatMap((step) => {
    const record = asRecord(step);
    const environment = asRecord(record?.env);
    return environment === null ? [] : [environment];
  });
  return (
    workflow.env !== undefined &&
    hasOnly(workflow.env, ["TAXKIT_ACTION_PIN_UPDATE_OWNER"]) &&
    stepEnvironments.length === 3 &&
    stepEnvironments.every(
      (environment) =>
        !Reflect.has(environment, "DOPPLER_CI_TOKEN") &&
        !Reflect.has(environment, "CLOUDFLARE_API_TOKEN") &&
        !Reflect.has(environment, "CLOUDFLARE_ACCOUNT_ID")
    )
  );
};

export const inspectQualityWorkflow = (workflow: QualityWorkflowDocument) => {
  const { concurrency, jobs, permissions } = workflow;
  const quality = asRecord(jobs.quality);
  const credentialPolicyIsExact = hasExactWorkflowCredentialPolicy(
    workflow,
    quality
  );
  const findings = [
    ...inspectTrigger(workflow.on),
    ...(hasOnly(permissions, ["contents"]) && permissions.contents === "read"
      ? []
      : [
          finding(
            "workflow-permissions",
            ".github/workflows/quality.yml:permissions",
            "Set one explicit repository permission: contents: read."
          ),
        ]),
    ...(hasOnly(concurrency, ["group", "cancel-in-progress"]) &&
    concurrency.group === expectedConcurrencyGroup &&
    concurrency["cancel-in-progress"] === true
      ? []
      : [
          finding(
            "workflow-concurrency",
            ".github/workflows/quality.yml:concurrency",
            "Use the explicit quality workflow/ref group with cancellation enabled."
          ),
        ]),
    ...(hasOnly(jobs, ["quality"]) &&
    quality !== null &&
    hasOnly(quality, ["runs-on", "timeout-minutes", "steps"])
      ? []
      : [
          finding(
            "workflow-job-shape",
            ".github/workflows/quality.yml:jobs",
            "Keep one quality job so another job cannot spoof or bypass the release graph."
          ),
        ]),
    ...(quality !== null && !Reflect.has(quality, "permissions")
      ? []
      : [
          finding(
            "workflow-permissions",
            ".github/workflows/quality.yml:jobs.quality.permissions",
            "Remove job-level permission overrides; the sole workflow-level contents: read grant owns authority."
          ),
        ]),
    ...(quality?.["runs-on"] === "ubuntu-latest" &&
    quality["timeout-minutes"] === 30
      ? []
      : [
          finding(
            "workflow-timeout",
            ".github/workflows/quality.yml:jobs.quality.timeout-minutes",
            "Use the bounded 30-minute timeout on the actual quality job."
          ),
        ]),
    ...(workflow.env?.TAXKIT_ACTION_PIN_UPDATE_OWNER === expectedActionPinOwner
      ? []
      : [
          finding(
            "workflow-pin-update-owner",
            ".github/workflows/quality.yml:env.TAXKIT_ACTION_PIN_UPDATE_OWNER",
            "Name taxkit-ci-release-maintainer as the action-pin update owner."
          ),
        ]),
    ...(credentialPolicyIsExact
      ? []
      : [
          finding(
            "workflow-cache-policy",
            ".github/workflows/quality.yml:env",
            "Keep the bridge token on the fixed fetch action, bind named Turbo outputs only to the trusted release step, and keep the fork release step local-cache-only."
          ),
        ]),
    ...inspectSteps(quality?.steps),
  ];
  return findings.toSorted((left, right) =>
    left.invariant.localeCompare(right.invariant)
  );
};

export const inspectReleaseRuntime = (source: string) => {
  const file = ts.createSourceFile(
    "release-readiness.runtime.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  let ciBranch: ts.IfStatement | undefined;
  const findCiBranch = (node: ts.Node) => {
    if (
      ts.isIfStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind ===
        ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isPropertyAccessExpression(node.expression.left) &&
      ts.isIdentifier(node.expression.left.expression) &&
      node.expression.left.expression.text === "cli" &&
      node.expression.left.name.text === "mode" &&
      ts.isStringLiteral(node.expression.right) &&
      node.expression.right.text === "ci"
    ) {
      ciBranch = node;
    }
    ts.forEachChild(node, findCiBranch);
  };
  findCiBranch(file);
  const calls =
    ciBranch === undefined ? [] : callExpressions(ciBranch.thenStatement);
  const identities = calls.map((call) => callIdentity(call.expression));
  const releaseCall = calls.find(
    (call) => callIdentity(call.expression) === "runCiReleaseReadiness"
  );
  const releasePlanArgument = releaseCall?.arguments[0];
  const unwrappedReleasePlanArgument =
    releasePlanArgument === undefined
      ? undefined
      : unwrapExpression(releasePlanArgument);
  const exactReleasePlan =
    releaseCall?.arguments.length === 1 &&
    unwrappedReleasePlanArgument !== undefined &&
    ts.isCallExpression(unwrappedReleasePlanArgument) &&
    callIdentity(unwrappedReleasePlanArgument.expression) ===
      "createReleaseReadinessPlan";
  const exactBindings =
    hasNamedImport(file, "effect", "Console") &&
    hasNamedImport(file, "./program.js", "runCiReleaseReadiness") &&
    hasNamedImport(file, "./schemas.js", "createReleaseReadinessPlan") &&
    !hasShadowedReservedCallBinding(file);
  return ciBranch !== undefined &&
    identities.length === 3 &&
    identities.filter((identity) => identity === "runCiReleaseReadiness")
      .length === 1 &&
    identities.filter((identity) => identity === "createReleaseReadinessPlan")
      .length === 1 &&
    identities.filter((identity) => identity === "Console.info").length === 1 &&
    exactReleasePlan &&
    exactBindings
    ? []
    : [
        finding(
          "release-runtime-boundary",
          "packages/scripts/src/release-readiness/release-readiness.runtime.ts:ci",
          "Keep CI report-only: run the canonical graph before any candidate evidence read or attempt receipt write."
        ),
      ];
};

export const inspectReleaseBoundaryFixtures = (
  fixtures: readonly ReleaseBoundaryFixture[]
) => {
  const expected = [
    "public-export",
    "packed-sdk",
    "api-contract",
    "public-docs-manifest",
    "workflow-semantics",
    "release-script",
  ] as const;
  return expected.flatMap((id) =>
    fixtures.filter((fixture) => fixture.id === id).length === 1
      ? []
      : [
          finding(
            "release-boundary-corpus",
            "tools/quality-workflow/fixtures/release-boundary-defects.json",
            `Keep one Schema-decoded executable fixture for ${id}.`
          ),
        ]
  );
};

const expectedControls = {
  "canonical-release-graph": {
    evidence: "bun run release:check -- --ci",
    fixture: "packages/scripts/src/release-readiness/program.test.ts",
    owner: "@taxkit/scripts release-readiness",
    preventedFailure:
      "A partial workflow graph claims release-readiness while skipping an owning boundary command.",
    recovery:
      "Repair the named failed check and preserve CI report-only semantics.",
    retirementCondition:
      "A stronger canonical graph replaces all nine ordered checks.",
    reviewTrigger:
      "Release check order, owning command, package graph or public boundary change.",
    signal:
      "Any public export, packed SDK, API, public docs/manifest, workflow or release-script source changes.",
  },
  "context-candidate-admission": {
    evidence: "bun run check:quality-workflow",
    fixture: "tools/quality-workflow/automation-register.json",
    owner: "taxkit-documentation-owner",
    preventedFailure:
      "Untrusted generated output edits canonical context, self-trains or claims publication.",
    recovery:
      "Quarantine the candidate and use separately authorized publication recovery.",
    retirementCondition:
      "A separately accepted canonical context-governance owner replaces this register.",
    reviewTrigger:
      "Candidate source, retrieval, reviewer, publisher, retention or recovery contract change.",
    signal:
      "A proposal adds recurring documentation or context freshness work.",
  },
  "quality-dependency-cache-boundary": {
    evidence: "bun run check:quality-workflow",
    fixture: "tools/quality-workflow/policy.test.ts",
    owner: "taxkit-ci-release-maintainer",
    preventedFailure:
      "CI caches node_modules, reuses an incompatible browser binary, skips frozen or system installation, or turns cache failure into Quality failure.",
    recovery:
      "Remove the dependency-cache restore/save steps while preserving frozen Bun install, Chromium system dependencies, browser proof and the full Quality graph.",
    retirementCondition:
      "A stronger content-addressed dependency-cache control replaces this contract.",
    reviewTrigger:
      "Bun version, lockfile, Playwright version, runner platform, cache action, key, path, event scope or install command change.",
    signal:
      "A Bun package or Playwright Chromium cache path, key, action, event scope or install order changes.",
  },
  "quality-workflow-semantics": {
    evidence: "bun run check:quality-workflow",
    fixture: "tools/quality-workflow/policy.test.ts",
    owner: "taxkit-ci-release-maintainer",
    preventedFailure:
      "A comment, another job, mutable action pin, permission expansion, timeout omission or extra release/mutation step falsely appears compliant.",
    recovery:
      "Repair the exact tagged finding in .github/workflows/quality.yml.",
    retirementCondition:
      "A stronger schema-decoded CI workflow owner replaces this contract.",
    reviewTrigger:
      "Workflow, trigger, job, action, permission, timeout, concurrency or release graph change.",
    signal: "A quality workflow or action pin changes.",
  },
  "turbo-remote-cache-boundary": {
    evidence: "bun run check:quality-workflow",
    fixture: "tools/quality-workflow/policy.test.ts",
    owner: "taxkit-ci-release-maintainer",
    preventedFailure:
      "A fork or pull_request_target run receives the Doppler bridge or remote-cache credential, the wrong config is accepted, a secret fetch precedes a cache save, a missing cache blocks the full graph, or a cache hit is treated as release proof.",
    recovery:
      "Remove the Doppler and remote-cache bindings while preserving every local-cache-only Quality command and true exit status.",
    retirementCondition:
      "A stronger token-bearing cache authority and fallback control replaces this contract.",
    reviewTrigger:
      "Doppler project/config/action, Turbo config, root task, credential, event, cache mode, task input/output or fallback change.",
    signal:
      "A Turbo task, cache credential binding, cache mode or Quality event changes.",
  },
} as const;
const expectedControlIds = [
  "canonical-release-graph",
  "context-candidate-admission",
  "quality-dependency-cache-boundary",
  "quality-workflow-semantics",
  "turbo-remote-cache-boundary",
] as const;

const matchesControlContract = (
  control: ControlRegisterEntry,
  expected: (typeof expectedControls)[keyof typeof expectedControls]
) =>
  control.owner === expected.owner &&
  control.signal === expected.signal &&
  control.preventedFailure === expected.preventedFailure &&
  control.fixture === expected.fixture &&
  control.evidence === expected.evidence &&
  control.recovery === expected.recovery &&
  control.reviewTrigger === expected.reviewTrigger &&
  control.retirementCondition === expected.retirementCondition;

const inspectControls = (controls: readonly ControlRegisterEntry[]) => [
  ...(controls.length === expectedControlIds.length
    ? []
    : [
        finding(
          "control-register",
          "tools/quality-workflow/controls.json",
          "Keep exactly the five registered controls; reject unowned additions."
        ),
      ]),
  ...expectedControlIds.flatMap((id) => {
    const expected = expectedControls[id];
    const matches = controls.filter((control) => control.id === id);
    return matches.length === 1 &&
      matches[0] !== undefined &&
      matchesControlContract(matches[0], expected)
      ? []
      : [
          finding(
            "control-register",
            `tools/quality-workflow/controls.json#${id}`,
            "Restore the exact control identity, signal, prevented failure, owner, routes, recovery, review trigger and retirement condition."
          ),
        ];
  }),
];

const hasExactMembers = (
  actual: readonly string[],
  expected: readonly string[]
) =>
  actual.length === expected.length &&
  expected.every((item) => actual.includes(item));

const deniedExternalMutation = [
  "credential-write",
  "deployment",
  "external-state-recovery",
  "provider-write",
  "publication",
  "registry-write",
  "release",
] as const;

const qualityNonClaims = [
  "tag",
  "registry publication",
  "deployment",
  "provider state",
  "public availability",
] as const;

const contextNonClaims = [
  "canonical edit",
  "publication",
  "provider state",
  "external availability",
] as const;

const hasAutomationRelations = (automation: AutomationRegisterEntry) =>
  automation.signal.revisionSource === automation.durableState.revisionSource &&
  automation.authority.principal === automation.owner &&
  automation.authority.resource === automation.resource.id &&
  automation.authority.environment === automation.environment.id &&
  automation.stopAndEscalation.escalationOwner === automation.owner &&
  automation.recovery.owner === automation.owner &&
  automation.retirementCondition.approvalOwner === automation.owner &&
  hasExactMembers(
    automation.proof.nonClaims,
    automation.externalState.nonClaims
  );

const inspectAutomationIds = (
  automations: readonly AutomationRegisterEntry[]
) => {
  const automationIds = automations.map((automation) => automation.id);
  return automationIds.length !== 2 ||
    !automationIds.includes("quality-ci") ||
    !automationIds.includes("documentation-context-freshness")
    ? [
        finding(
          "automation-register",
          "tools/quality-workflow/automation-register.json",
          "Keep exactly the quality-ci and documentation-context-freshness automation decisions."
        ),
      ]
    : [];
};

// oxlint-disable-next-line complexity -- every structured context-governance field is an independently fail-closed contract.
const inspectContextAutomation = (
  automations: readonly AutomationRegisterEntry[]
) => {
  const context = automations.find(
    (automation) => automation.id === "documentation-context-freshness"
  );
  const candidate = context?.candidate;
  return context?.owner !== "taxkit-documentation-owner" ||
    context.signal.kind !== "foreground-maintainer-request" ||
    context.signal.revisionSource !==
      "foreground-maintainer-supplied-immutable-revision" ||
    context.durableState.kind !== "report-only-context-candidate" ||
    context.durableState.location !== "tmp/context-candidates/" ||
    context.authority.principal !== "taxkit-documentation-owner" ||
    context.authority.resource !== "explicit-source-set-and-candidate" ||
    context.authority.environment !== "local-report-only" ||
    context.authority.grants.length !== 0 ||
    !hasExactMembers(context.authority.denied, [
      "canonical-repository-edit",
      ...deniedExternalMutation.slice(1),
    ]) ||
    !hasExactMembers(context.resource.scope, [
      "foreground maintainer source set",
      "untrusted candidate file",
    ]) ||
    context.environment.trigger !== "foreground-maintainer-only" ||
    context.proof.command !== "bun run check:quality-workflow" ||
    context.proof.failureIdentity !==
      "Schema path and rejected candidate contract" ||
    context.proof.successPostcondition !==
      "report-only candidate envelope is decoded and remains outside canonical retrieval" ||
    !hasExactMembers(context.proof.nonClaims, contextNonClaims) ||
    context.stopAndEscalation.mode !== "fail-closed" ||
    !hasExactMembers(context.stopAndEscalation.stopConditions, [
      "unknown source or exclusion",
      "unknown reviewer or publisher",
      "unknown recovery identity",
    ]) ||
    context.rollback.action !== "quarantine the untrusted candidate" ||
    context.rollback.authorityRequired !==
      "separately named publication authority" ||
    context.recovery.action !==
      "restore the recorded last-known-good revision after separately authorized publication readback" ||
    context.recovery.verificationCommand !== "bun run check:quality-workflow" ||
    context.retirementCondition.condition !==
      "a separately accepted canonical context-governance owner replaces the report-only contract" ||
    context.externalState.status !== "not-established" ||
    !hasExactMembers(context.externalState.nonClaims, contextNonClaims) ||
    !hasAutomationRelations(context) ||
    candidate === undefined ||
    candidate.candidatePath !== context.durableState.location ||
    candidate.targetRevision !==
      "immutable repository revision supplied by the foreground maintainer" ||
    candidate.responsibleReviewer !== context.owner ||
    candidate.responsibleReviewer === candidate.publisher ||
    candidate.publisher !== context.rollback.authorityRequired ||
    !hasExactMembers(candidate.selfFeedbackExclusions, [
      "all prior candidate reports",
      "the current candidate report",
    ]) ||
    !hasExactMembers(candidate.generatedEvidenceExclusions, [
      "tmp/**",
      "generated receipts",
      "mutable CI output",
    ]) ||
    candidate.publicationStatus !== "not-published" ||
    candidate.recovery !==
      "quarantine candidate and route publication recovery to the named publisher" ||
    candidate.lastKnownGoodRecovery !==
      "recorded accepted repository revision after separately authorized publication readback"
    ? [
        finding(
          "automation-register",
          "tools/quality-workflow/automation-register.json#documentation-context-freshness",
          "Keep candidates under ignored tmp/context-candidates, separate reviewer and publisher identities, self/generated-evidence exclusions, no publication, and explicit last-known-good recovery."
        ),
      ]
    : [];
};

// oxlint-disable-next-line complexity -- every structured CI-governance field is an independently fail-closed contract.
const inspectQualityAutomation = (
  automations: readonly AutomationRegisterEntry[]
) => {
  const quality = automations.find(
    (automation) => automation.id === "quality-ci"
  );
  return quality?.owner !== "taxkit-ci-release-maintainer" ||
    quality.signal.kind !== "pull-request-or-push" ||
    quality.signal.revisionSource !== "github.sha" ||
    quality.durableState.kind !== "immutable-revision-validation" ||
    quality.durableState.location !== "checked-out-repository-revision" ||
    quality.authority.principal !== "taxkit-ci-release-maintainer" ||
    quality.authority.resource !== "taxkit-repository-runner-and-ci-caches" ||
    quality.authority.environment !== "github-actions-ci" ||
    !hasExactMembers(quality.authority.grants, [
      "contents:read",
      "dependency-cache:read",
      "dependency-cache:write-ref-scoped",
      "doppler-config:read-ci-trusted-events",
      "remote-cache:read",
      "remote-cache:write-on-token-bearing-events",
    ]) ||
    !hasExactMembers(quality.authority.denied, deniedExternalMutation) ||
    !hasExactMembers(quality.resource.scope, [
      "immutable repository revision",
      "configured Actions runner",
      "read-only taxkit/ci Doppler config through the repository bridge on trusted events",
      "Vercel team remote-cache task artifacts and logs",
      "content-addressed ref-scoped GitHub Bun package cache",
      "content-addressed ref-scoped GitHub Playwright Chromium cache",
    ]) ||
    quality.environment.trigger !== "configured-pull-request-or-push" ||
    quality.proof.command !== "bun run release:check -- --ci" ||
    quality.proof.failureIdentity !== "first failed ordered check and target" ||
    quality.proof.successPostcondition !==
      "all nine ordered repository checks passed for the immutable revision regardless of cache hit, miss or fallback" ||
    !hasExactMembers(quality.proof.nonClaims, qualityNonClaims) ||
    quality.stopAndEscalation.mode !== "fail-closed" ||
    !hasExactMembers(quality.stopAndEscalation.stopConditions, [
      "first tagged check failure",
      "unknown workflow shape",
      "missing or wrong taxkit/ci metadata or named Turbo output",
      "Doppler fetch occurs before the final cache save",
      "fork pull request receives Doppler bridge or remote-cache credential",
      "dependency cache key or path contains secret or mutable installed state",
      "dependency cache skips frozen install or Chromium system dependencies",
      "cache-only success or missing uncached fallback",
    ]) ||
    quality.rollback.action !==
      "remove the Doppler bridge plus Turbo and dependency-cache bindings while preserving frozen installs and the complete local-cache-only Quality graph" ||
    quality.rollback.authorityRequired !== "taxkit-ci-release-maintainer" ||
    quality.recovery.action !==
      "repair the named Doppler source or cache boundary, remove the bridge and dependency-cache restore/save when needed, and run frozen installs plus the local-cache-only canonical graph on a new revision" ||
    quality.recovery.verificationCommand !== "bun run release:check -- --ci" ||
    quality.retirementCondition.condition !==
      "a stronger canonical CI owner replaces the quality workflow" ||
    quality.externalState.status !== "not-established" ||
    !hasExactMembers(quality.externalState.nonClaims, qualityNonClaims) ||
    quality.candidate !== undefined ||
    !hasAutomationRelations(quality)
    ? [
        finding(
          "automation-register",
          "tools/quality-workflow/automation-register.json#quality-ci",
          "Restore read-only CI authority, bounded failed-target proof and the desired-versus-external-state nonclaim."
        ),
      ]
    : [];
};

const inspectAutomations = (
  automations: readonly AutomationRegisterEntry[]
) => [
  ...inspectAutomationIds(automations),
  ...inspectContextAutomation(automations),
  ...inspectQualityAutomation(automations),
];

export const inspectGovernanceRegisters = (
  controls: readonly ControlRegisterEntry[],
  automations: readonly AutomationRegisterEntry[]
) => [...inspectControls(controls), ...inspectAutomations(automations)];

export const renderQualityWorkflowReport = (
  findings: readonly QualityWorkflowFinding[]
): string =>
  findings.length === 0
    ? "Quality workflow policy passed: decoded immutable, bounded, content-addressed ref-scoped cache and canonical release graph."
    : [
        `Quality workflow policy failed with ${findings.length} finding(s):`,
        ...findings
          .slice(0, 12)
          .map(
            (item) =>
              `${item.invariant}; target=${item.target}; recovery=${item.recovery}`
          ),
        `omitted=${Math.max(0, findings.length - 12)}; detail=.github/workflows/quality.yml.`,
      ].join("\n");
