import ts from "@typescript/typescript6";
import {
  Array as EffectArray,
  Effect,
  HashSet,
  Option,
  Order,
  Record,
  Schema,
} from "effect";
import { parseDocument } from "yaml";

import {
  QualityWorkflowDocument,
  QualityWorkflowFinding,
  QualityWorkflowInputError,
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
  'echo "version=$(apps/web/node_modules/.bin/playwright --version | cut -d\' \' -f2)" >> "$GITHUB_OUTPUT"';
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
  "apps/web/node_modules/.bin/playwright install --with-deps chromium",
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
  invariant: QualityWorkflowFinding["invariant"],
  target: string,
  recovery: string
) => new QualityWorkflowFinding({ invariant, recovery, target });

const asRecord = (value: UntrustedWorkflowValue): WorkflowRecord | null =>
  Schema.is(UnknownRecord)(value) ? value : null;

const hasOnly = (record: WorkflowRecord, expected: string[]) =>
  Reflect.ownKeys(record).length === expected.length &&
  EffectArray.every(expected, (key) => key in record);

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

// Syntax children include tokens; filtering by node kind preserves semantic traversal.
const syntaxNodes = (node: ts.Node): readonly ts.Node[] => [
  node,
  ...EffectArray.flatMap(node.getChildren(), syntaxNodes),
];

const callExpressions = (node: ts.Node) =>
  EffectArray.filter(syntaxNodes(node), ts.isCallExpression);

const hasNamedImport = (
  file: ts.SourceFile,
  moduleName: string,
  importedName: string
) =>
  EffectArray.some(
    file.statements,
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      EffectArray.some(
        statement.importClause.namedBindings.elements,
        (element) =>
          element.name.text === importedName &&
          (element.propertyName?.text ?? element.name.text) === importedName
      )
  );

const hasShadowedReservedCallBinding = (file: ts.SourceFile) => {
  const reserved = HashSet.fromIterable([
    "Console",
    "createReleaseReadinessPlan",
    "renderReleaseReadinessReport",
    "runCiReleaseReadiness",
  ]);
  return EffectArray.some(
    syntaxNodes(file),
    (node) =>
      (ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node)) &&
      node.name !== undefined &&
      ts.isIdentifier(node.name) &&
      HashSet.has(reserved, node.name.text)
  );
};

// oxlint-disable-next-line complexity -- every trigger key and path-filter variant is checked independently so CI cannot skip a boundary.
const inspectTrigger = (
  triggers: WorkflowRecord
): readonly QualityWorkflowFinding[] => {
  const pullRequest = Record.get(triggers ?? {}, "pull_request").pipe(
    Option.getOrUndefined
  );
  const pullRequestRecord = asRecord(pullRequest);
  const push = asRecord(
    Record.get(triggers ?? {}, "push").pipe(Option.getOrUndefined)
  );
  const branchValue = Record.get(push ?? {}, "branches").pipe(
    Option.getOrUndefined
  );
  const branches = Schema.is(Schema.Array(Schema.Unknown))(branchValue)
    ? branchValue
    : [];
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
  if (!Schema.is(Schema.Array(Schema.Unknown))(steps)) {
    return [
      finding(
        "workflow-job-shape",
        ".github/workflows/quality.yml:jobs.quality.steps",
        "Define the actual checkout, Bun setup and canonical release-graph steps."
      ),
    ];
  }
  const records: readonly WorkflowRecord[] = EffectArray.filter(
    EffectArray.map(steps, asRecord),
    (step): step is WorkflowRecord => step !== null
  );
  const actionSteps = EffectArray.flatMap(records, (step: WorkflowRecord) => {
    const value = Record.get(step, "uses").pipe(Option.getOrUndefined);
    return Schema.is(Schema.String)(value) ? [value] : [];
  });
  const runSteps = EffectArray.flatMap(records, (step: WorkflowRecord) => {
    const value = Record.get(step, "run").pipe(Option.getOrUndefined);
    return Schema.is(Schema.String)(value) ? [value] : [];
  });
  const validActionSteps =
    actionSteps.length === expectedActionSteps.length &&
    EffectArray.every(
      actionSteps,
      (step) => actionPin.test(step) && expectedActionSteps.includes(step)
    ) &&
    EffectArray.every(
      expectedActionSteps,
      (step) =>
        EffectArray.filter(actionSteps, (actual) => actual === step).length ===
        EffectArray.filter(expectedActionSteps, (expected) => expected === step)
          .length
    );
  const validRunSteps =
    runSteps.length === expectedRunSteps.length &&
    EffectArray.every(runSteps, (step) => expectedRunSteps.includes(step)) &&
    EffectArray.every(
      expectedRunSteps,
      (step) =>
        EffectArray.filter(runSteps, (actual) => actual === step).length ===
        EffectArray.filter(expectedRunSteps, (expected) => expected === step)
          .length
    );
  const checkoutStep = asRecord(
    EffectArray.get(steps, 0).pipe(Option.getOrUndefined)
  );
  const checkoutWith = asRecord(
    Record.get(checkoutStep ?? {}, "with").pipe(Option.getOrUndefined)
  );
  const historyStep = asRecord(
    EffectArray.get(steps, 1).pipe(Option.getOrUndefined)
  );
  const setupStep = asRecord(
    EffectArray.get(steps, 2).pipe(Option.getOrUndefined)
  );
  const setupWith = asRecord(
    Record.get(setupStep ?? {}, "with").pipe(Option.getOrUndefined)
  );
  const bunCachePathStep = asRecord(
    EffectArray.get(steps, 3).pipe(Option.getOrUndefined)
  );
  const bunCacheRestoreStep = asRecord(
    EffectArray.get(steps, 4).pipe(Option.getOrUndefined)
  );
  const bunCacheRestoreWith = asRecord(
    Record.get(bunCacheRestoreStep ?? {}, "with").pipe(Option.getOrUndefined)
  );
  const installStep = asRecord(
    EffectArray.get(steps, 5).pipe(Option.getOrUndefined)
  );
  const bunCacheSaveStep = asRecord(
    EffectArray.get(steps, 6).pipe(Option.getOrUndefined)
  );
  const bunCacheSaveWith = asRecord(
    Record.get(bunCacheSaveStep ?? {}, "with").pipe(Option.getOrUndefined)
  );
  const playwrightCachePathStep = asRecord(
    EffectArray.get(steps, 7).pipe(Option.getOrUndefined)
  );
  const playwrightIdentityStep = asRecord(
    EffectArray.get(steps, 8).pipe(Option.getOrUndefined)
  );
  const playwrightCacheRestoreStep = asRecord(
    EffectArray.get(steps, 9).pipe(Option.getOrUndefined)
  );
  const playwrightCacheRestoreWith = asRecord(
    Record.get(playwrightCacheRestoreStep ?? {}, "with").pipe(
      Option.getOrUndefined
    )
  );
  const browserStep = asRecord(
    EffectArray.get(steps, 10).pipe(Option.getOrUndefined)
  );
  const playwrightCacheSaveStep = asRecord(
    EffectArray.get(steps, 11).pipe(Option.getOrUndefined)
  );
  const playwrightCacheSaveWith = asRecord(
    Record.get(playwrightCacheSaveStep ?? {}, "with").pipe(
      Option.getOrUndefined
    )
  );
  const policyStep = asRecord(
    EffectArray.get(steps, 12).pipe(Option.getOrUndefined)
  );
  const dopplerStep = asRecord(
    EffectArray.get(steps, 13).pipe(Option.getOrUndefined)
  );
  const dopplerWith = asRecord(
    Record.get(dopplerStep ?? {}, "with").pipe(Option.getOrUndefined)
  );
  const identityStep = asRecord(
    EffectArray.get(steps, 14).pipe(Option.getOrUndefined)
  );
  const identityEnv = asRecord(
    Record.get(identityStep ?? {}, "env").pipe(Option.getOrUndefined)
  );
  const trustedReleaseStep = asRecord(
    EffectArray.get(steps, 15).pipe(Option.getOrUndefined)
  );
  const trustedReleaseEnv = asRecord(
    Record.get(trustedReleaseStep ?? {}, "env").pipe(Option.getOrUndefined)
  );
  const forkReleaseStep = asRecord(
    EffectArray.get(steps, 16).pipe(Option.getOrUndefined)
  );
  const forkReleaseEnv = asRecord(
    Record.get(forkReleaseStep ?? {}, "env").pipe(Option.getOrUndefined)
  );
  const exactSteps =
    steps.length === 17 &&
    checkoutStep !== null &&
    hasOnly(checkoutStep, ["uses", "with"]) &&
    Record.get(checkoutStep ?? {}, "uses").pipe(Option.getOrUndefined) ===
      checkoutAction &&
    checkoutWith !== null &&
    hasOnly(checkoutWith, ["fetch-depth"]) &&
    Record.get(checkoutWith, "fetch-depth").pipe(Option.getOrUndefined) === 0 &&
    historyStep !== null &&
    hasOnly(historyStep, ["run"]) &&
    Record.get(historyStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      "git show-ref --verify --quiet refs/heads/main || git branch --track main origin/main" &&
    setupStep !== null &&
    hasOnly(setupStep, ["uses", "with"]) &&
    Record.get(setupStep ?? {}, "uses").pipe(Option.getOrUndefined) ===
      "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6" &&
    setupWith !== null &&
    hasOnly(setupWith, ["bun-version-file"]) &&
    Record.get(setupWith, "bun-version-file").pipe(Option.getOrUndefined) ===
      ".bun-version" &&
    bunCachePathStep !== null &&
    hasOnly(bunCachePathStep, ["id", "run"]) &&
    Record.get(bunCachePathStep ?? {}, "id").pipe(Option.getOrUndefined) ===
      "bun-cache-path" &&
    Record.get(bunCachePathStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      bunCachePathCommand &&
    bunCacheRestoreStep !== null &&
    hasOnly(bunCacheRestoreStep, ["id", "uses", "continue-on-error", "with"]) &&
    Record.get(bunCacheRestoreStep ?? {}, "id").pipe(Option.getOrUndefined) ===
      "bun-cache-restore" &&
    Record.get(bunCacheRestoreStep ?? {}, "uses").pipe(
      Option.getOrUndefined
    ) === cacheRestoreAction &&
    Record.get(bunCacheRestoreStep, "continue-on-error").pipe(
      Option.getOrUndefined
    ) === true &&
    bunCacheRestoreWith !== null &&
    hasOnly(bunCacheRestoreWith, ["path", "key"]) &&
    Record.get(bunCacheRestoreWith ?? {}, "path").pipe(
      Option.getOrUndefined
    ) === expectedBunCachePath &&
    Record.get(bunCacheRestoreWith ?? {}, "key").pipe(Option.getOrUndefined) ===
      expectedBunCacheKey &&
    installStep !== null &&
    hasOnly(installStep, ["run"]) &&
    Record.get(installStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      "bun install --frozen-lockfile" &&
    bunCacheSaveStep !== null &&
    hasOnly(bunCacheSaveStep, ["uses", "if", "continue-on-error", "with"]) &&
    Record.get(bunCacheSaveStep ?? {}, "uses").pipe(Option.getOrUndefined) ===
      cacheSaveAction &&
    Record.get(bunCacheSaveStep ?? {}, "if").pipe(Option.getOrUndefined) ===
      "steps.bun-cache-restore.outputs.cache-hit != 'true'" &&
    Record.get(bunCacheSaveStep, "continue-on-error").pipe(
      Option.getOrUndefined
    ) === true &&
    bunCacheSaveWith !== null &&
    hasOnly(bunCacheSaveWith, ["path", "key"]) &&
    Record.get(bunCacheSaveWith ?? {}, "path").pipe(Option.getOrUndefined) ===
      expectedBunCachePath &&
    Record.get(bunCacheSaveWith ?? {}, "key").pipe(Option.getOrUndefined) ===
      expectedBunSaveKey &&
    playwrightCachePathStep !== null &&
    hasOnly(playwrightCachePathStep, ["run"]) &&
    Record.get(playwrightCachePathStep ?? {}, "run").pipe(
      Option.getOrUndefined
    ) === playwrightCachePathCommand &&
    playwrightIdentityStep !== null &&
    hasOnly(playwrightIdentityStep, ["id", "run"]) &&
    Record.get(playwrightIdentityStep ?? {}, "id").pipe(
      Option.getOrUndefined
    ) === "playwright-identity" &&
    Record.get(playwrightIdentityStep ?? {}, "run").pipe(
      Option.getOrUndefined
    ) === playwrightIdentityCommand &&
    playwrightCacheRestoreStep !== null &&
    hasOnly(playwrightCacheRestoreStep, [
      "id",
      "uses",
      "continue-on-error",
      "with",
    ]) &&
    Record.get(playwrightCacheRestoreStep ?? {}, "id").pipe(
      Option.getOrUndefined
    ) === "playwright-cache-restore" &&
    Record.get(playwrightCacheRestoreStep ?? {}, "uses").pipe(
      Option.getOrUndefined
    ) === cacheRestoreAction &&
    Record.get(playwrightCacheRestoreStep, "continue-on-error").pipe(
      Option.getOrUndefined
    ) === true &&
    playwrightCacheRestoreWith !== null &&
    hasOnly(playwrightCacheRestoreWith, ["path", "key"]) &&
    Record.get(playwrightCacheRestoreWith ?? {}, "path").pipe(
      Option.getOrUndefined
    ) === expectedPlaywrightCachePath &&
    Record.get(playwrightCacheRestoreWith ?? {}, "key").pipe(
      Option.getOrUndefined
    ) === expectedPlaywrightCacheKey &&
    browserStep !== null &&
    hasOnly(browserStep, ["run"]) &&
    Record.get(browserStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      "apps/web/node_modules/.bin/playwright install --with-deps chromium" &&
    playwrightCacheSaveStep !== null &&
    hasOnly(playwrightCacheSaveStep, [
      "uses",
      "if",
      "continue-on-error",
      "with",
    ]) &&
    Record.get(playwrightCacheSaveStep ?? {}, "uses").pipe(
      Option.getOrUndefined
    ) === cacheSaveAction &&
    Record.get(playwrightCacheSaveStep ?? {}, "if").pipe(
      Option.getOrUndefined
    ) === "steps.playwright-cache-restore.outputs.cache-hit != 'true'" &&
    Record.get(playwrightCacheSaveStep, "continue-on-error").pipe(
      Option.getOrUndefined
    ) === true &&
    playwrightCacheSaveWith !== null &&
    hasOnly(playwrightCacheSaveWith, ["path", "key"]) &&
    Record.get(playwrightCacheSaveWith ?? {}, "path").pipe(
      Option.getOrUndefined
    ) === expectedPlaywrightCachePath &&
    Record.get(playwrightCacheSaveWith ?? {}, "key").pipe(
      Option.getOrUndefined
    ) === expectedPlaywrightSaveKey &&
    policyStep !== null &&
    hasOnly(policyStep, ["run"]) &&
    Record.get(policyStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      "bun run check:quality-workflow" &&
    dopplerStep !== null &&
    hasOnly(dopplerStep, ["name", "id", "if", "uses", "with"]) &&
    Record.get(dopplerStep ?? {}, "name").pipe(Option.getOrUndefined) ===
      "Fetch trusted CI configuration" &&
    Record.get(dopplerStep ?? {}, "id").pipe(Option.getOrUndefined) ===
      "doppler-ci" &&
    Record.get(dopplerStep ?? {}, "if").pipe(Option.getOrUndefined) ===
      trustedEventCondition &&
    Record.get(dopplerStep ?? {}, "uses").pipe(Option.getOrUndefined) ===
      dopplerAction &&
    dopplerWith !== null &&
    hasOnly(dopplerWith, ["doppler-token"]) &&
    Record.get(dopplerWith, "doppler-token").pipe(Option.getOrUndefined) ===
      dopplerToken &&
    identityStep !== null &&
    hasOnly(identityStep, ["name", "if", "env", "run"]) &&
    Record.get(identityStep ?? {}, "name").pipe(Option.getOrUndefined) ===
      "Check trusted CI configuration identity" &&
    Record.get(identityStep ?? {}, "if").pipe(Option.getOrUndefined) ===
      trustedEventCondition &&
    identityEnv !== null &&
    hasOnly(identityEnv, ["DOPPLER_CONFIG", "DOPPLER_PROJECT"]) &&
    Record.get(identityEnv ?? {}, "DOPPLER_CONFIG").pipe(
      Option.getOrUndefined
    ) === dopplerConfigOutput &&
    Record.get(identityEnv ?? {}, "DOPPLER_PROJECT").pipe(
      Option.getOrUndefined
    ) === dopplerProjectOutput &&
    Record.get(identityStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      dopplerIdentityCommand &&
    trustedReleaseStep !== null &&
    hasOnly(trustedReleaseStep, ["name", "if", "env", "run"]) &&
    Record.get(trustedReleaseStep ?? {}, "name").pipe(Option.getOrUndefined) ===
      "Run trusted Quality with remote cache" &&
    Record.get(trustedReleaseStep ?? {}, "if").pipe(Option.getOrUndefined) ===
      trustedEventCondition &&
    trustedReleaseEnv !== null &&
    hasOnly(trustedReleaseEnv, ["TURBO_CACHE", "TURBO_TEAM", "TURBO_TOKEN"]) &&
    Record.get(trustedReleaseEnv ?? {}, "TURBO_CACHE").pipe(
      Option.getOrUndefined
    ) === trustedTurboCache &&
    Record.get(trustedReleaseEnv ?? {}, "TURBO_TEAM").pipe(
      Option.getOrUndefined
    ) === turboTeamOutput &&
    Record.get(trustedReleaseEnv ?? {}, "TURBO_TOKEN").pipe(
      Option.getOrUndefined
    ) === turboTokenOutput &&
    Record.get(trustedReleaseStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      "bun run release:check -- --ci" &&
    forkReleaseStep !== null &&
    hasOnly(forkReleaseStep, ["name", "if", "env", "run"]) &&
    Record.get(forkReleaseStep ?? {}, "name").pipe(Option.getOrUndefined) ===
      "Run fork Quality without credentials" &&
    Record.get(forkReleaseStep ?? {}, "if").pipe(Option.getOrUndefined) ===
      forkEventCondition &&
    forkReleaseEnv !== null &&
    hasOnly(forkReleaseEnv, ["TURBO_CACHE"]) &&
    Record.get(forkReleaseEnv ?? {}, "TURBO_CACHE").pipe(
      Option.getOrUndefined
    ) === forkTurboCache &&
    Record.get(forkReleaseStep ?? {}, "run").pipe(Option.getOrUndefined) ===
      "bun run release:check -- --ci";
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

export const decodeQualityWorkflow = Effect.fnUntraced(function* (
  text: string
) {
  const document = parseDocument(text, { prettyErrors: false, version: "1.2" });
  if (document.errors.length !== 0) {
    return yield* Effect.fail(
      new QualityWorkflowYamlError({ target: ".github/workflows/quality.yml" })
    );
  }
  return yield* Schema.decodeUnknownEffect(QualityWorkflowDocument, {
    onExcessProperty: "error",
  })(document.toJS()).pipe(
    Effect.mapError(
      () =>
        new QualityWorkflowInputError({
          target: ".github/workflows/quality.yml",
        })
    )
  );
});

const hasExactWorkflowCredentialPolicy = (
  workflow: QualityWorkflowDocument,
  quality: WorkflowRecord | null
) => {
  const stepValue = Record.get(quality ?? {}, "steps").pipe(
    Option.getOrUndefined
  );
  const steps = Schema.is(Schema.Array(Schema.Unknown))(stepValue)
    ? stepValue
    : [];
  const stepEnvironments = EffectArray.flatMap(steps, (step) => {
    const record = asRecord(step);
    const environment = asRecord(
      Record.get(record ?? {}, "env").pipe(Option.getOrUndefined)
    );
    return environment === null ? [] : [environment];
  });
  return (
    workflow.env !== undefined &&
    hasOnly(workflow.env, ["TAXKIT_ACTION_PIN_UPDATE_OWNER"]) &&
    stepEnvironments.length === 3 &&
    EffectArray.every(
      stepEnvironments,
      (environment) =>
        !Reflect.has(environment, "DOPPLER_CI_TOKEN") &&
        !Reflect.has(environment, "CLOUDFLARE_API_TOKEN") &&
        !Reflect.has(environment, "CLOUDFLARE_ACCOUNT_ID")
    )
  );
};

// oxlint-disable-next-line complexity -- each independent authority field must produce its own bounded finding.
export const inspectQualityWorkflow = (workflow: QualityWorkflowDocument) => {
  const { concurrency, jobs, permissions } = workflow;
  const quality = asRecord(
    Record.get(jobs ?? {}, "quality").pipe(Option.getOrUndefined)
  );
  const credentialPolicyIsExact = hasExactWorkflowCredentialPolicy(
    workflow,
    quality
  );
  const findings = [
    ...inspectTrigger(workflow.on),
    ...(hasOnly(permissions, ["contents"]) &&
    Record.get(permissions ?? {}, "contents").pipe(Option.getOrUndefined) ===
      "read"
      ? []
      : [
          finding(
            "workflow-permissions",
            ".github/workflows/quality.yml:permissions",
            "Set one explicit repository permission: contents: read."
          ),
        ]),
    ...(hasOnly(concurrency, ["group", "cancel-in-progress"]) &&
    Record.get(concurrency ?? {}, "group").pipe(Option.getOrUndefined) ===
      expectedConcurrencyGroup &&
    Record.get(concurrency, "cancel-in-progress").pipe(
      Option.getOrUndefined
    ) === true
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
    ...(Record.get(quality ?? {}, "runs-on").pipe(Option.getOrUndefined) ===
      "ubuntu-latest" &&
    Record.get(quality ?? {}, "timeout-minutes").pipe(Option.getOrUndefined) ===
      30
      ? []
      : [
          finding(
            "workflow-timeout",
            ".github/workflows/quality.yml:jobs.quality.timeout-minutes",
            "Use the bounded 30-minute timeout on the actual quality job."
          ),
        ]),
    ...(Record.get(workflow.env ?? {}, "TAXKIT_ACTION_PIN_UPDATE_OWNER").pipe(
      Option.getOrUndefined
    ) === expectedActionPinOwner
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
    ...inspectSteps(
      Record.get(quality ?? {}, "steps").pipe(Option.getOrUndefined)
    ),
  ];
  return EffectArray.sort(
    findings,
    Order.mapInput(
      Order.String,
      (item: QualityWorkflowFinding) => item.invariant
    )
  );
};

const hasExactCiReportOutput = (
  ciBranch: ts.IfStatement | undefined,
  calls: readonly ts.CallExpression[],
  releaseCall: ts.CallExpression | undefined
) => {
  const rendererCall = EffectArray.findFirst(
    calls,
    (call) => callIdentity(call.expression) === "renderReleaseReadinessReport"
  ).pipe(Option.getOrUndefined);
  const rendererArgument = EffectArray.head(rendererCall?.arguments ?? []).pipe(
    Option.getOrUndefined
  );
  const consoleCall = EffectArray.findFirst(
    calls,
    (call) => callIdentity(call.expression) === "Console.info"
  ).pipe(Option.getOrUndefined);
  const returnedReport =
    ciBranch !== undefined &&
    EffectArray.some(
      syntaxNodes(ciBranch.thenStatement),
      (node) =>
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "report" &&
        node.initializer !== undefined &&
        ts.isYieldExpression(node.initializer) &&
        node.initializer.expression === releaseCall
    );
  return (
    returnedReport &&
    rendererCall?.arguments.length === 1 &&
    rendererArgument !== undefined &&
    ts.isIdentifier(rendererArgument) &&
    rendererArgument.text === "report" &&
    consoleCall?.arguments.length === 1 &&
    EffectArray.head(consoleCall?.arguments ?? []).pipe(
      Option.getOrUndefined
    ) === rendererCall
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
  const ciBranch = EffectArray.findLast(
    syntaxNodes(file),
    (node): node is ts.IfStatement =>
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
  ).pipe(Option.getOrUndefined);
  const calls =
    ciBranch === undefined ? [] : callExpressions(ciBranch.thenStatement);
  const identities = EffectArray.map(calls, (call) =>
    callIdentity(call.expression)
  );
  const releaseCall = EffectArray.findFirst(
    calls,
    (call) => callIdentity(call.expression) === "runCiReleaseReadiness"
  ).pipe(Option.getOrUndefined);
  const releasePlanArgument = EffectArray.head(
    releaseCall?.arguments ?? []
  ).pipe(Option.getOrUndefined);
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
    hasNamedImport(file, "./schemas.js", "renderReleaseReadinessReport") &&
    !hasShadowedReservedCallBinding(file);
  return ciBranch !== undefined &&
    identities.length === 4 &&
    EffectArray.every(
      [
        "runCiReleaseReadiness",
        "createReleaseReadinessPlan",
        "Console.info",
        "renderReleaseReadinessReport",
      ],
      (expected) =>
        EffectArray.filter(identities, (identity) => identity === expected)
          .length === 1
    ) &&
    exactReleasePlan &&
    hasExactCiReportOutput(ciBranch, calls, releaseCall) &&
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
  return EffectArray.flatMap(expected, (id) =>
    EffectArray.filter(fixtures, (fixture) => fixture.id === id).length === 1
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
  ...EffectArray.flatMap(expectedControlIds, (id) => {
    const expected = Record.get(expectedControls, id).pipe(
      Option.getOrUndefined
    );
    const matches = EffectArray.filter(
      controls,
      (control) => control.id === id
    );
    return matches.length === 1 &&
      expected !== undefined &&
      Option.exists(EffectArray.head(matches), (control) =>
        matchesControlContract(control, expected)
      )
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
  EffectArray.every(expected, (item) => actual.includes(item));

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
  const automationIds = EffectArray.map(
    automations,
    (automation) => automation.id
  );
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
  const context = EffectArray.findFirst(
    automations,
    (automation) => automation.id === "documentation-context-freshness"
  ).pipe(Option.getOrUndefined);
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
  const quality = EffectArray.findFirst(
    automations,
    (automation) => automation.id === "quality-ci"
  ).pipe(Option.getOrUndefined);
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
        ...EffectArray.map(
          findings.slice(0, 12),
          (item) =>
            `${item.invariant}; target=${item.target}; recovery=${item.recovery}`
        ),
        `omitted=${Math.max(0, findings.length - 12)}; detail=.github/workflows/quality.yml.`,
      ].join("\n");
