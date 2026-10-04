import { describe, expect, test } from "bun:test";

import { Array as EffectArray, Effect, Schema } from "effect";

import automationJson from "./automation-register.json";
import controlsJson from "./controls.json";
import {
  decodeQualityWorkflow,
  inspectGovernanceRegisters,
  inspectQualityWorkflow,
  inspectReleaseRuntime,
} from "./policy.js";
import { AutomationRegister, ControlRegister } from "./schemas.js";

const acceptedWorkflow = `name: Quality
on:
  pull_request:
  push:
    branches:
      - main
permissions:
  contents: read
env:
  TAXKIT_ACTION_PIN_UPDATE_OWNER: taxkit-ci-release-maintainer
concurrency:
  group: quality-${"${{"} github.workflow }}-${"${{"} github.ref }}
  cancel-in-progress: true
jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          fetch-depth: 0
      - run: git show-ref --verify --quiet refs/heads/main || git branch --track main origin/main
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6
        with:
          bun-version-file: .bun-version
      - id: bun-cache-path
        run: echo "path=$(bun pm cache)" >> "$GITHUB_OUTPUT"
      - id: bun-cache-restore
        uses: actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9
        continue-on-error: true
        with:
          path: ${"${{"} steps.bun-cache-path.outputs.path }}
          key: bun-packages-${"${{"} runner.os }}-${"${{"} runner.arch }}-${"${{"} hashFiles('.bun-version') }}-${"${{"} hashFiles('bun.lock') }}
      - run: bun install --frozen-lockfile
      - uses: actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9
        if: steps.bun-cache-restore.outputs.cache-hit != 'true'
        continue-on-error: true
        with:
          path: ${"${{"} steps.bun-cache-path.outputs.path }}
          key: ${"${{"} steps.bun-cache-restore.outputs.cache-primary-key }}
      - run: echo "PLAYWRIGHT_BROWSERS_PATH=$RUNNER_TEMP/ms-playwright" >> "$GITHUB_ENV"
      - id: playwright-identity
        run: echo "version=$(apps/docs/node_modules/.bin/playwright --version | cut -d' ' -f2)" >> "$GITHUB_OUTPUT"
      - id: playwright-cache-restore
        uses: actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9
        continue-on-error: true
        with:
          path: ${"${{"} env.PLAYWRIGHT_BROWSERS_PATH }}
          key: playwright-chromium-${"${{"} runner.os }}-${"${{"} runner.arch }}-${"${{"} steps.playwright-identity.outputs.version }}-${"${{"} hashFiles('bun.lock') }}
      - run: apps/docs/node_modules/.bin/playwright install --with-deps chromium
      - uses: actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9
        if: steps.playwright-cache-restore.outputs.cache-hit != 'true'
        continue-on-error: true
        with:
          path: ${"${{"} env.PLAYWRIGHT_BROWSERS_PATH }}
          key: ${"${{"} steps.playwright-cache-restore.outputs.cache-primary-key }}
      - run: bun run check:quality-workflow
      - name: Fetch trusted CI configuration
        id: doppler-ci
        if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
        uses: dopplerhq/secrets-fetch-action@451892f16195f9ac360e1a5bcbf0b5fd0e957534
        with:
          doppler-token: ${"${{"} secrets.DOPPLER_CI_TOKEN }}
      - name: Check trusted CI configuration identity
        if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
        env:
          DOPPLER_CONFIG: ${"${{"} steps.doppler-ci.outputs.DOPPLER_CONFIG }}
          DOPPLER_PROJECT: ${"${{"} steps.doppler-ci.outputs.DOPPLER_PROJECT }}
        run: test "$DOPPLER_PROJECT" = "taxkit" && test "$DOPPLER_CONFIG" = "ci"
      - name: Run trusted Quality with remote cache
        if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
        env:
          TURBO_CACHE: local:rw,remote:rw
          TURBO_TEAM: ${"${{"} steps.doppler-ci.outputs.TURBO_TEAM }}
          TURBO_TOKEN: ${"${{"} steps.doppler-ci.outputs.TURBO_TOKEN }}
        run: bun run release:check -- --ci
      - name: Run fork Quality without credentials
        if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository
        env:
          TURBO_CACHE: local:rw
        run: bun run release:check -- --ci
`;

const findingsFor = (text: string) =>
  inspectQualityWorkflow(Effect.runSync(decodeQualityWorkflow(text)));

describe("quality workflow policy", () => {
  test("accepts the bounded pull-request write-through canonical release graph", () => {
    expect(findingsFor(acceptedWorkflow)).toEqual([]);
  });

  test("rejects shallow or ambiguous release-history setup", () => {
    for (const workflow of [
      acceptedWorkflow.replace("fetch-depth: 0", "fetch-depth: 1"),
      acceptedWorkflow.replace(
        "git show-ref --verify --quiet refs/heads/main || git branch --track main origin/main",
        "git fetch origin main"
      ),
    ]) {
      expect(
        EffectArray.map(findingsFor(workflow), (item) => item.invariant)
      ).toContain("workflow-mutation-step");
    }
  });

  test("rejects a changed or omitted browser bootstrap command", () => {
    for (const workflow of [
      acceptedWorkflow.replace(
        "apps/docs/node_modules/.bin/playwright install --with-deps chromium",
        "bunx playwright install --with-deps chromium"
      ),
      acceptedWorkflow.replace(
        "      - run: apps/docs/node_modules/.bin/playwright install --with-deps chromium\n",
        ""
      ),
      acceptedWorkflow.replace(
        "$RUNNER_TEMP/ms-playwright",
        "$GITHUB_WORKSPACE/.cache/ms-playwright"
      ),
    ]) {
      expect(
        EffectArray.map(findingsFor(workflow), (item) => item.invariant)
      ).toContain("workflow-mutation-step");
    }
  });

  test("rejects node_modules caches and keys without platform or version identity", () => {
    for (const workflow of [
      acceptedWorkflow.replace(
        ["path: $", "{{ steps.bun-cache-path.outputs.path }}"].join(""),
        "path: node_modules"
      ),
      acceptedWorkflow.replace("bun-packages-${", "bun-packages-"),
      acceptedWorkflow.replace(
        ["-$", "{{ hashFiles('.bun-version') }}"].join(""),
        ""
      ),
      acceptedWorkflow.replace(
        ["-$", "{{ steps.playwright-identity.outputs.version }}"].join(""),
        ""
      ),
    ]) {
      expect(
        EffectArray.map(findingsFor(workflow), (item) => item.invariant)
      ).toContain("workflow-mutation-step");
    }
  });

  test("rejects event-name key splitting", () => {
    for (const workflow of [
      acceptedWorkflow.replace(
        ["bun-packages-$", "{{ runner.os }}"].join(""),
        ["bun-packages-$", "{{ github.event_name }}-$", "{{ runner.os }}"].join(
          ""
        )
      ),
      acceptedWorkflow.replace(
        ["playwright-chromium-$", "{{ runner.os }}"].join(""),
        [
          "playwright-chromium-$",
          "{{ github.event_name }}-$",
          "{{ runner.os }}",
        ].join("")
      ),
    ]) {
      expect(
        EffectArray.map(findingsFor(workflow), (item) => item.invariant)
      ).toContain("workflow-mutation-step");
    }
  });

  test("rejects cache failures that stop Quality and early saves", () => {
    for (const workflow of [
      acceptedWorkflow.replace("        continue-on-error: true\n", ""),
      acceptedWorkflow.replace(
        "      - run: bun install --frozen-lockfile\n      - uses: actions/cache/save@",
        "      - uses: actions/cache/save@"
      ),
      acceptedWorkflow.replace(
        "      - run: apps/docs/node_modules/.bin/playwright install --with-deps chromium\n      - uses: actions/cache/save@",
        "      - uses: actions/cache/save@"
      ),
    ]) {
      expect(
        EffectArray.map(findingsFor(workflow), (item) => item.invariant)
      ).toContain("workflow-mutation-step");
    }
  });

  test("rejects a floating action, authority expansion and bypassed graph in the actual job", () => {
    expect(
      EffectArray.map(
        findingsFor(
          acceptedWorkflow
            .replace("contents: read", "contents: write")
            .replace("@3d3c42e5aac5ba805825da76410c181273ba90b1", "@v7")
            .replaceAll("bun run release:check -- --ci", "bun run verification")
        ),
        (item) => item.invariant
      )
    ).toEqual([
      "canonical-release-graph",
      "workflow-action-pin",
      "workflow-mutation-step",
      "workflow-permissions",
    ]);
  });

  test("rejects comment and other-job spoofing instead of scanning text", () => {
    expect(
      EffectArray.map(
        findingsFor(
          acceptedWorkflow
            .replaceAll(
              "        run: bun run release:check -- --ci",
              "        run: bun run verification # bun run release:check -- --ci"
            )
            .replace(
              "jobs:\n  quality:",
              "jobs:\n  spoof:\n    runs-on: ubuntu-latest\n    timeout-minutes: 30\n    steps:\n      - run: bun run release:check -- --ci\n  quality:"
            )
        ),
        (item) => item.invariant
      )
    ).toContain("canonical-release-graph");
  });

  test("rejects malformed YAML and all path-filter variants", () => {
    expect(() => Effect.runSync(decodeQualityWorkflow("jobs: ["))).toThrow();
    for (const filter of [
      "    paths:\n      - packages/**\n",
      "    paths-ignore:\n      - docs/**\n",
    ]) {
      expect(
        EffectArray.map(
          findingsFor(
            acceptedWorkflow.replace(
              "    branches:\n",
              `${filter}    branches:\n`
            )
          ),
          (item) => item.invariant
        )
      ).toContain("workflow-triggers");
    }
  });

  test("rejects pull_request_target so forks cannot receive the cache token", () => {
    expect(
      EffectArray.map(
        findingsFor(
          acceptedWorkflow.replace(
            "  pull_request:\n",
            "  pull_request_target:\n"
          )
        ),
        (item) => item.invariant
      )
    ).toContain("workflow-triggers");
  });

  test("rejects branch pushes that duplicate pull-request coverage", () => {
    expect(
      EffectArray.map(
        findingsFor(
          acceptedWorkflow.replace(
            "    branches:\n      - main\n",
            '    branches:\n      - main\n      - "codex/**"\n'
          )
        ),
        (item) => item.invariant
      )
    ).toContain("workflow-triggers");
  });

  test("rejects missing action owner, timeout and cancellation semantics", () => {
    expect(
      EffectArray.map(
        findingsFor(
          acceptedWorkflow
            .replace("taxkit-ci-release-maintainer", "unowned")
            .replace("timeout-minutes: 30", "timeout-minutes: 120")
            .replace("cancel-in-progress: true", "cancel-in-progress: false")
        ),
        (item) => item.invariant
      )
    ).toEqual([
      "workflow-concurrency",
      "workflow-pin-update-owner",
      "workflow-timeout",
    ]);
  });

  test("rejects a widened Doppler fetch, wrong outputs and fork credentials", () => {
    for (const workflow of [
      acceptedWorkflow.replace(
        ["doppler-token: $", "{{ secrets.DOPPLER_CI_TOKEN }}"].join(""),
        ["doppler-token: $", "{{ secrets.TURBO_TOKEN }}"].join("")
      ),
      acceptedWorkflow.replace(
        ["steps.doppler-ci.outputs.TURBO_TEAM", " }}"].join(""),
        ["vars.TURBO_TEAM", " }}"].join("")
      ),
      acceptedWorkflow.replace("local:rw,remote:rw", "local:rw,remote:r"),
      acceptedWorkflow.replace(
        "        with:\n          doppler-token:",
        "        with:\n          inject-env-vars: true\n          doppler-token:"
      ),
      acceptedWorkflow.replace(
        "          TURBO_CACHE: local:rw\n        run: bun run release:check -- --ci",
        "          TURBO_CACHE: local:rw,remote:rw\n          TURBO_TOKEN: inherited\n        run: bun run release:check -- --ci"
      ),
    ]) {
      expect(findingsFor(workflow).length).toBeGreaterThan(0);
    }
  });

  test("rejects secret fetch before the last cache save or a changed config identity", () => {
    for (const workflow of [
      acceptedWorkflow.replace(
        "      - name: Fetch trusted CI configuration",
        "      - name: Fetch trusted CI configuration\n        inject-before-cache: true"
      ),
      acceptedWorkflow.replace(
        'test "$DOPPLER_PROJECT" = "taxkit"',
        'test "$DOPPLER_PROJECT" = "another-project"'
      ),
      acceptedWorkflow.replace(
        'test "$DOPPLER_CONFIG" = "ci"',
        'test "$DOPPLER_CONFIG" = "prd"'
      ),
    ]) {
      expect(
        EffectArray.map(findingsFor(workflow), (item) => item.invariant)
      ).toContain("workflow-mutation-step");
    }
  });

  test("rejects every job-level permission override including equivalent write scopes", () => {
    for (const permissions of [
      "    permissions: write-all\n",
      "    permissions:\n      contents: write\n",
      "    permissions:\n      actions: write\n      contents: read\n",
    ]) {
      const findings = findingsFor(
        acceptedWorkflow.replace(
          "    runs-on: ubuntu-latest\n",
          `    runs-on: ubuntu-latest\n${permissions}`
        )
      );
      expect(EffectArray.map(findings, (item) => item.target)).toContain(
        ".github/workflows/quality.yml:jobs.quality.permissions"
      );
    }
  });

  test("rejects job and release-step failure tolerance or execution skipping", () => {
    for (const contaminated of [
      acceptedWorkflow.replace(
        "    runs-on: ubuntu-latest\n",
        "    runs-on: ubuntu-latest\n    continue-on-error: true\n"
      ),
      acceptedWorkflow.replace(
        "        run: bun run release:check -- --ci",
        "        run: bun run release:check -- --ci\n        continue-on-error: true"
      ),
      acceptedWorkflow.replaceAll(
        "if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository",
        "if: false"
      ),
    ]) {
      expect(findingsFor(contaminated).length).toBeGreaterThan(0);
    }
  });

  test("semantically rejects unsafe but schema-valid governance registers", () => {
    const controls = Effect.runSync(
      Schema.decodeUnknownEffect(ControlRegister)(controlsJson)
    );
    const automations = Effect.runSync(
      Schema.decodeUnknownEffect(AutomationRegister)(automationJson)
    );
    expect(inspectGovernanceRegisters(controls, automations)).toEqual([]);

    const unsafeControls = EffectArray.map(controls, (control) =>
      control.id === "canonical-release-graph"
        ? { ...control, evidence: "bun run test" }
        : control
    );
    const unsafeAutomations = EffectArray.map(automations, (automation) =>
      automation.id === "documentation-context-freshness" &&
      automation.candidate !== undefined
        ? {
            ...automation,
            candidate: {
              ...automation.candidate,
              candidatePath: "docs/README.md",
              publisher: automation.candidate.responsibleReviewer,
              selfFeedbackExclusions: ["unrelated input"],
            },
          }
        : automation
    );
    expect(
      EffectArray.map(
        inspectGovernanceRegisters(unsafeControls, unsafeAutomations),
        (item) => item.invariant
      )
    ).toEqual(["control-register", "automation-register"]);

    expect(
      EffectArray.map(
        inspectGovernanceRegisters(
          [...controls, { ...controls[0], id: "extra-control" }],
          automations
        ),
        (item) => item.invariant
      )
    ).toContain("control-register");

    const unsafeControlContract = EffectArray.map(controls, (control) => ({
      ...control,
      preventedFailure: "x",
      recovery: "x",
      retirementCondition: "x",
      reviewTrigger: "x",
      signal: "x",
    }));
    expect(
      EffectArray.map(
        inspectGovernanceRegisters(unsafeControlContract, automations),
        (item) => item.invariant
      )
    ).toContain("control-register");

    const longNonsense =
      "This sentence is deliberately long but carries no governance meaning whatsoever.";
    const meaningless = EffectArray.map(automations, (automation) => ({
      ...automation,
      authority: { ...automation.authority, principal: longNonsense },
      proof: { ...automation.proof, command: longNonsense },
      recovery: { ...automation.recovery, action: longNonsense },
      resource: { ...automation.resource, scope: [longNonsense] },
      retirementCondition: {
        ...automation.retirementCondition,
        condition: longNonsense,
      },
      rollback: { ...automation.rollback, action: longNonsense },
      stopAndEscalation: {
        ...automation.stopAndEscalation,
        stopConditions: [longNonsense],
      },
    }));
    expect(
      EffectArray.filter(
        inspectGovernanceRegisters(controls, meaningless),
        (item) => item.invariant === "automation-register"
      ).length
    ).toBeGreaterThanOrEqual(2);
  });

  test("rejects aliased and parenthesized candidate reads in the CI branch", () => {
    const accepted = `import { Console } from "effect";
    import { runCiReleaseReadiness } from "./program.js";
    import { createReleaseReadinessPlan } from "./schemas.js";
    const program = Effect.gen(function* main() {
      const cli = yield* decodeReleaseReadinessCli(args);
      if (cli.mode === "ci") {
        const report = yield* runCiReleaseReadiness(createReleaseReadinessPlan(root));
        yield* Console.info("CI release graph passed");
        return report;
      }
      return yield* readReleaseEvidence(root);
    });`;
    expect(inspectReleaseRuntime(accepted)).toEqual([]);
    for (const contaminated of [
      accepted.replace(
        "const report =",
        "const read = readReleaseEvidence; yield* read(root); const report ="
      ),
      accepted.replace(
        "const report =",
        "yield* (readReleaseEvidence)(root); const report ="
      ),
      accepted.replace(
        "const report =",
        "yield* evidenceBoundary.readReleaseEvidence(root); const report ="
      ),
      accepted.replace(
        "const report =",
        "yield* ({ readReleaseEvidence }).readReleaseEvidence(root); const report ="
      ),
    ]) {
      expect(
        EffectArray.map(
          inspectReleaseRuntime(contaminated),
          (item) => item.invariant
        )
      ).toEqual(["release-runtime-boundary"]);
    }
  });
});
