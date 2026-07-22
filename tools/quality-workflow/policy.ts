import { Effect, Schema } from "effect";
import ts from "typescript";
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
const allowedRunSteps = new Set([
  "bun install --frozen-lockfile",
  "bun run check:quality-workflow",
  "bun run release:check -- --ci",
]);
const expectedActionSteps = new Set([
  "actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5",
  "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6",
]);
const UnknownRecord = Schema.Record(Schema.String, Schema.Unknown);

const finding = (
  invariant: (typeof QualityWorkflowFinding.Type)["invariant"],
  target: string,
  recovery: string
) => new QualityWorkflowFinding({ invariant, recovery, target });

const asRecord = (value: unknown): Record<string, unknown> | null =>
  Schema.is(UnknownRecord)(value) ? value : null;

const hasOnly = (record: Record<string, unknown>, expected: string[]) =>
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
    "makeReleaseReadinessPlan",
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
  triggers: Record<string, unknown>
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
    branches.length === 2 &&
    branches.includes("main") &&
    branches.includes("codex/**") &&
    noPathFilters
    ? []
    : [
        finding(
          "workflow-triggers",
          ".github/workflows/quality.yml:on",
          "Use only pull_request and the main/codex/** push triggers; do not add path filters because new or renamed boundaries must fail closed."
        ),
      ];
};

// oxlint-disable-next-line complexity -- each allowed step key and value is checked independently so execution cannot be skipped or tolerated.
const inspectSteps = (steps: unknown): readonly QualityWorkflowFinding[] => {
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
    .filter((step): step is Record<string, unknown> => step !== null)
    .flatMap((step) => (typeof step.uses === "string" ? [step.uses] : []));
  const runSteps = steps
    .map(asRecord)
    .filter((step): step is Record<string, unknown> => step !== null)
    .flatMap((step) => (typeof step.run === "string" ? [step.run] : []));
  const validActionSteps =
    actionSteps.length === expectedActionSteps.size &&
    actionSteps.every(
      (step) => actionPin.test(step) && expectedActionSteps.has(step)
    );
  const validRunSteps =
    runSteps.length === allowedRunSteps.size &&
    runSteps.every((step) => allowedRunSteps.has(step));
  const checkoutStep = asRecord(steps[0]);
  const setupStep = asRecord(steps[1]);
  const setupWith = asRecord(setupStep?.with);
  const installStep = asRecord(steps[2]);
  const policyStep = asRecord(steps[3]);
  const releaseStep = asRecord(steps[4]);
  const exactSteps =
    steps.length === 5 &&
    checkoutStep !== null &&
    hasOnly(checkoutStep, ["uses"]) &&
    checkoutStep.uses ===
      "actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5" &&
    setupStep !== null &&
    hasOnly(setupStep, ["uses", "with"]) &&
    setupStep.uses ===
      "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6" &&
    setupWith !== null &&
    hasOnly(setupWith, ["bun-version-file"]) &&
    setupWith["bun-version-file"] === ".bun-version" &&
    installStep !== null &&
    hasOnly(installStep, ["run"]) &&
    installStep.run === "bun install --frozen-lockfile" &&
    policyStep !== null &&
    hasOnly(policyStep, ["run"]) &&
    policyStep.run === "bun run check:quality-workflow" &&
    releaseStep !== null &&
    hasOnly(releaseStep, ["run"]) &&
    releaseStep.run === "bun run release:check -- --ci";
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
            "Remove extra mutation, release, build, test or verification steps; the canonical release graph owns those checks."
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

export const inspectQualityWorkflow = (workflow: QualityWorkflowDocument) => {
  const { concurrency, jobs, permissions } = workflow;
  const quality = asRecord(jobs.quality);
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
    ...(workflow.env !== undefined &&
    hasOnly(workflow.env, ["TAXKIT_ACTION_PIN_UPDATE_OWNER"]) &&
    workflow.env.TAXKIT_ACTION_PIN_UPDATE_OWNER === expectedActionPinOwner
      ? []
      : [
          finding(
            "workflow-pin-update-owner",
            ".github/workflows/quality.yml:env.TAXKIT_ACTION_PIN_UPDATE_OWNER",
            "Name taxkit-ci-release-maintainer as the action-pin update owner."
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
      "makeReleaseReadinessPlan";
  const exactBindings =
    hasNamedImport(file, "effect", "Console") &&
    hasNamedImport(file, "./program.js", "runCiReleaseReadiness") &&
    hasNamedImport(file, "./schemas.js", "makeReleaseReadinessPlan") &&
    !hasShadowedReservedCallBinding(file);
  return ciBranch !== undefined &&
    identities.length === 3 &&
    identities.filter((identity) => identity === "runCiReleaseReadiness")
      .length === 1 &&
    identities.filter((identity) => identity === "makeReleaseReadinessPlan")
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
} as const;
const expectedControlIds = [
  "canonical-release-graph",
  "context-candidate-admission",
  "quality-workflow-semantics",
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
          "Keep exactly the three registered controls; reject unowned additions."
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
    quality.authority.resource !== "taxkit-repository-and-runner" ||
    quality.authority.environment !== "github-actions-ci" ||
    !hasExactMembers(quality.authority.grants, ["contents:read"]) ||
    !hasExactMembers(quality.authority.denied, deniedExternalMutation) ||
    !hasExactMembers(quality.resource.scope, [
      "immutable repository revision",
      "configured Actions runner",
    ]) ||
    quality.environment.trigger !== "configured-pull-request-or-push" ||
    quality.proof.command !== "bun run release:check -- --ci" ||
    quality.proof.failureIdentity !== "first failed ordered check and target" ||
    quality.proof.successPostcondition !==
      "all nine ordered repository checks passed for the immutable revision" ||
    !hasExactMembers(quality.proof.nonClaims, qualityNonClaims) ||
    quality.stopAndEscalation.mode !== "fail-closed" ||
    !hasExactMembers(quality.stopAndEscalation.stopConditions, [
      "first tagged check failure",
      "unknown workflow shape",
    ]) ||
    quality.rollback.action !== "revert the workflow or control change" ||
    quality.rollback.authorityRequired !== "taxkit-ci-release-maintainer" ||
    quality.recovery.action !==
      "repair the named source boundary and run the canonical graph on a new revision" ||
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
    ? "Quality workflow policy passed: decoded immutable, bounded, read-only canonical release graph."
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
