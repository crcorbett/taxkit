import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Option,
  Order,
  Record,
  Schema,
  Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { parse } from "yaml";

const Manifest = Schema.Struct({
  scripts: Schema.Record(Schema.String, Schema.String),
});
const script = (scripts: typeof Manifest.Type.scripts, name: string) =>
  Record.get(scripts, name).pipe(
    Option.getOrElse(() => expect.fail(`Missing root script: ${name}`))
  );
const Workflow = Schema.Struct({
  jobs: Schema.Record(
    Schema.String,
    Schema.Struct({
      "continue-on-error": Schema.OptionFromOptionalKey(Schema.Boolean),
      if: Schema.OptionFromOptionalKey(Schema.String),
      needs: Schema.OptionFromOptionalKey(
        Schema.Union([Schema.String, Schema.Array(Schema.String)])
      ),
      steps: Schema.Array(
        Schema.Struct({
          "continue-on-error": Schema.OptionFromOptionalKey(Schema.Boolean),
          env: Schema.OptionFromOptionalKey(
            Schema.Record(Schema.String, Schema.String)
          ),
          id: Schema.OptionFromOptionalKey(Schema.String),
          if: Schema.OptionFromOptionalKey(Schema.String),
          run: Schema.OptionFromOptionalKey(Schema.String),
          uses: Schema.OptionFromOptionalKey(Schema.String),
          with: Schema.OptionFromOptionalKey(
            Schema.Struct({ ref: Schema.OptionFromOptionalKey(Schema.String) })
          ),
        })
      ),
    })
  ),
});
const checksWorkflow = ".github/workflows/checks.yml";
const providerCommand = /^bun run (?:pr|production):(?:plan|deploy)\b/u;
const statusOverride = /\b(?:always|failure|cancelled)\s*\(/u;

// These executable fixture leaves cannot build, access a provider or use a
// credential. The orchestration scripts themselves are read from the repository.
const bunFixture = `#!/bin/sh
case "$*" in
  'run verification'|'run release:check'|'run test:native')
    exec sh "$GATE_FIXTURE/$2"
    ;;
esac
printf '%s\\n' "$*" >> "$GATE_FIXTURE/calls"
test "$*" != "$GATE_FAIL"
`;
const alchemyFixture = `#!/bin/sh
printf 'alchemy %s\\n' "$*" >> "$GATE_FIXTURE/calls"
`;

const commandFixture = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const directory = yield* fs.makeTempDirectoryScoped({
    prefix: "taxkit-gates-",
  });
  const manifest = yield* fs
    .readFileString("package.json")
    .pipe(
      Effect.flatMap(
        Schema.decodeUnknownEffect(Schema.fromJsonString(Manifest))
      )
    );
  yield* Effect.forEach(
    ["verification", "release:check", "test:native"],
    (name) =>
      fs.writeFileString(`${directory}/${name}`, script(manifest.scripts, name))
  );
  yield* fs.writeFileString(`${directory}/calls`, "");
  yield* fs.writeFileString(`${directory}/bun`, bunFixture);
  yield* fs.writeFileString(`${directory}/alchemy`, alchemyFixture);
  yield* fs.writeFileString(
    `${directory}/gh`,
    '#!/bin/sh\nprintf "%s\\n" "$GATE_PR_STATE"\n'
  );
  yield* fs.writeFileString(`${directory}/outputs`, "");
  yield* fs.chmod(`${directory}/bun`, 0o700);
  yield* fs.chmod(`${directory}/alchemy`, 0o700);
  yield* fs.chmod(`${directory}/gh`, 0o700);
  return { directory, scripts: manifest.scripts };
});

const runCommand = Effect.fnUntraced(function* (
  fixture: Effect.Success<typeof commandFixture>,
  command: string,
  fail = "",
  args: readonly string[] = [],
  pullRequestState: "open" | "closed" = "closed"
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const child = yield* spawner.spawn(
    ChildProcess.make(
      "sh",
      ["-c", `${command} "$@"`, "gate-fixture", ...args],
      {
        cwd: fixture.directory,
        // Only harmless fixture executables precede system tools. No actual Bun,
        // Alchemy, Doppler or provider command is reached by a tested script.
        env: {
          GATE_FAIL: fail,
          GATE_FIXTURE: fixture.directory,
          GATE_PR_STATE: pullRequestState,
          GITHUB_OUTPUT: `${fixture.directory}/outputs`,
          GITHUB_REPOSITORY: "fixture/repository",
          PATH: `${fixture.directory}:/usr/bin:/bin`,
          PULL_REQUEST: "123",
        },
        extendEnv: false,
        stderr: "pipe",
        stdout: "pipe",
      }
    )
  );
  const [code] = yield* Effect.all(
    [
      child.exitCode,
      Stream.runDrain(child.stdout),
      Stream.runDrain(child.stderr),
    ],
    { concurrency: "unbounded" }
  );
  const fs = yield* FileSystem.FileSystem;
  const calls = yield* fs.readFileString(`${fixture.directory}/calls`);
  const outputs = yield* fs.readFileString(`${fixture.directory}/outputs`);
  return {
    calls: Array.filter(calls.trim().split("\n"), (line) => line.length > 0),
    code: Number(code),
    outputs,
  };
});

const workflow = (path: string) =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fs) => fs.readFileString(path)),
    Effect.flatMap((source) =>
      Effect.try(() => parse(source)).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Workflow))
      )
    )
  );

describe("required native release gate", () => {
  it.effect(
    "runs native build and tests after all earlier verification work",
    () =>
      Effect.gen(function* () {
        const fixture = yield* commandFixture;
        const result = yield* runCommand(fixture, "bun run verification");
        expect(result.code).toBe(0);
        expect(result.calls.slice(-2)).toEqual([
          "run --filter=web build:native-pair",
          "run --filter=web test:native-pair",
        ]);
        expect(result.calls.indexOf("run test")).toBeLessThan(
          result.calls.indexOf("run --filter=web build:native-pair")
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  it.effect.each(["build:native-pair", "test:native-pair"])(
    "blocks later release checks when native %s fails",
    (failure) =>
      Effect.gen(function* () {
        const fixture = yield* commandFixture;
        const result = yield* runCommand(
          fixture,
          "bun run release:check",
          `run --filter=web ${failure}`
        );
        expect(result.code).not.toBe(0);
        expect(result.calls).not.toContain("run sdk:check-packed-artifact");
        expect(result.calls).not.toContain("run changeset:status");
        if (failure === "build:native-pair") {
          expect(result.calls).not.toContain(
            "run --filter=web test:native-pair"
          );
        }
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  it.effect(
    "runs every Checks verification gate once and fails the job when native fails",
    () =>
      Effect.gen(function* () {
        const configuration = yield* workflow(checksWorkflow);
        const checks = Record.get(configuration.jobs, "checks").pipe(
          Option.getOrElse(() => expect.fail("Missing checks job"))
        );
        const { "continue-on-error": checksMayFail } = checks;
        expect(Option.getOrElse(checksMayFail, () => false)).toBe(false);
        expect(checks.if).toEqual(
          Option.some("github.event.action != 'closed'")
        );
        const gates = Array.filter(checks.steps, (step) =>
          Option.contains(step.run, "bun run verification")
        );
        // One trusted gate with the remote cache, one credential-free fork gate.
        expect(gates).toHaveLength(2);
        expect(
          Array.every(
            gates,
            ({ "continue-on-error": stepMayFail }) =>
              !Option.getOrElse(stepMayFail, () => false)
          )
        ).toBe(true);
        // No other job repeats verification for the same revision.
        expect(
          Array.flatMap(Record.toEntries(configuration.jobs), ([name, job]) =>
            Array.some(job.steps, (step) =>
              Option.contains(step.run, "bun run verification")
            )
              ? [name]
              : []
          )
        ).toEqual(["checks"]);
        const fixture = yield* commandFixture;
        const result = yield* runCommand(
          fixture,
          "bun run verification",
          "run --filter=web test:native-pair"
        );
        expect(result.code).not.toBe(0);
        expect(Array.last(result.calls)).toEqual(
          Option.some("run --filter=web test:native-pair")
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  it.effect(
    "admits Preview and Production only after Checks passed for the same commit",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const files = yield* fs.readDirectory(".github/workflows");
        const providerJobs = yield* Effect.forEach(
          Array.sort(files, Order.String),
          (file) =>
            workflow(`.github/workflows/${file}`).pipe(
              Effect.map((configuration) =>
                Array.flatMap(
                  Record.toEntries(configuration.jobs),
                  ([name, job]) =>
                    Array.some(job.steps, (step) =>
                      Option.exists(step.run, (run) =>
                        providerCommand.test(run)
                      )
                    )
                      ? [{ file, job, name }]
                      : []
                )
              )
            )
        ).pipe(Effect.map(Array.flatten));
        expect(
          Array.map(providerJobs, ({ file, name }) => `${file}#${name}`)
        ).toEqual(["checks.yml#deploy", "checks.yml#production"]);
        const checkoutRef = (job: (typeof providerJobs)[number]["job"]) =>
          Array.findFirst(job.steps, (step) =>
            Option.exists(step.uses, (uses) =>
              uses.startsWith("actions/checkout@")
            )
          ).pipe(
            Option.flatMap((step) => step.with),
            Option.flatMap((options) => options.ref),
            // Compare the expression inside the `${{ }}` wrapper.
            Option.map((ref) => ref.replaceAll(/^\$\{\{\s*|\s*\}\}$/gu, ""))
          );
        const configuration = yield* workflow(checksWorkflow);
        const checks = Record.get(configuration.jobs, "checks").pipe(
          Option.getOrElse(() => expect.fail("Missing checks job"))
        );
        // Checks verifies the pull request head, or the pushed commit; each
        // deploy job checks out exactly that revision.
        expect(checkoutRef(checks)).toEqual(
          Option.some("github.event.pull_request.head.sha || github.sha")
        );
        const expectedRef: Record.ReadonlyRecord<string, string> = {
          deploy: "github.event.pull_request.head.sha",
          production: "github.sha",
        };
        yield* Effect.forEach(providerJobs, ({ job, name }) =>
          Effect.sync(() => {
            const { "continue-on-error": jobMayFail } = job;
            expect(Option.getOrElse(jobMayFail, () => false)).toBe(false);
            expect(job.needs).toEqual(Option.some("checks"));
            expect(
              Option.exists(job.if, (condition) =>
                statusOverride.test(condition)
              )
            ).toBe(false);
            expect(
              Array.some(job.steps, (step) =>
                Option.exists(step.if, (condition) =>
                  statusOverride.test(condition)
                )
              )
            ).toBe(false);
            expect(
              Array.filter(job.steps, (step) =>
                Option.exists(step.run, (run) => providerCommand.test(run))
              )
            ).toHaveLength(2);
            expect(checkoutRef(job)).toEqual(Record.get(expectedRef, name));
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect.each(["checks"])(
    "checks the %s Doppler secret first and gives the token only to native commands",
    (name) =>
      Effect.gen(function* () {
        const configuration = yield* workflow(`.github/workflows/${name}.yml`);
        const credentialJobs = Array.filter(
          Record.values(configuration.jobs),
          (job) =>
            Array.some(job.steps, (step) =>
              Option.exists(step.env, (env) => Record.has(env, "DOPPLER_TOKEN"))
            )
        );
        expect(credentialJobs.length).toBeGreaterThan(0);
        yield* Effect.forEach(credentialJobs, (job) =>
          Effect.gen(function* () {
            const check = Array.head(job.steps).pipe(
              Option.getOrElse(() => expect.fail("Missing job steps"))
            );
            const { "continue-on-error": checkMayFail } = check;
            expect(check.env).toEqual(
              Option.some({
                DOPPLER_TOKEN_SET: `\${{ secrets.DOPPLER_TOKEN != '' }}`,
              })
            );
            expect(check.if).toEqual(Option.none());
            expect(Option.getOrElse(checkMayFail, () => false)).toBe(false);
            expect(
              Array.every(
                job.steps,
                (step) =>
                  !Option.exists(step.env, (env) =>
                    Record.has(env, "DOPPLER_TOKEN")
                  ) ||
                  Option.exists(step.run, (run) =>
                    /^bun run (?:pr|production):(?:plan|deploy|destroy|drift)\b/u.test(
                      run
                    )
                  )
              )
            ).toBe(true);
            const command = Option.getOrElse(check.run, () =>
              expect.fail("Missing token check")
            );
            const fixture = yield* commandFixture;
            const missing = yield* runCommand(
              fixture,
              `DOPPLER_TOKEN_SET=false; ${command};`
            );
            const present = yield* runCommand(
              fixture,
              `DOPPLER_TOKEN_SET=true; ${command};`
            );
            expect(missing.code).not.toBe(0);
            expect(present.code).toBe(0);
          })
        );
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  // `--yes` also lets native Alchemy set up or upgrade the shared state store.
  // A matching run without it fails closed first when the store is not ready.
  it.effect.each(["checks"])(
    "plans every %s --yes command without --yes first",
    (name) =>
      Effect.gen(function* () {
        const configuration = yield* workflow(`.github/workflows/${name}.yml`);
        const applies = Array.flatMap(
          Record.values(configuration.jobs),
          (job) =>
            Array.map(
              Array.filter(job.steps, (step) =>
                Option.exists(step.run, (run) => run.includes("--yes"))
              ),
              (step) => ({ job, step })
            )
        );
        expect(applies.length).toBeGreaterThan(0);
        yield* Effect.forEach(applies, ({ job, step }) =>
          Effect.sync(() => {
            const run = Option.getOrElse(step.run, () =>
              expect.fail("Missing apply command")
            );
            const base = run.replace(/ --yes --no-input(?: .*)?$/u, "");
            expect(base).toMatch(
              /^bun run (?:pr|production):(?:deploy|destroy)(?: "\$STAGE")?$/u
            );
            const guard = base.includes(":destroy")
              ? `${base} --dry-run --no-input`
              : `${base.replace(":deploy", ":plan")} --no-input`;
            const plan = Array.findFirst(job.steps, (candidate) =>
              Option.contains(candidate.run, guard)
            ).pipe(Option.getOrElse(() => expect.fail(`Missing ${guard}`)));
            const { "continue-on-error": planMayFail } = plan;
            expect(job.steps.indexOf(plan)).toBeLessThan(
              job.steps.indexOf(step)
            );
            expect(plan.if).toEqual(step.if);
            expect(plan.env).toEqual(step.env);
            expect(Option.getOrElse(planMayFail, () => false)).toBe(false);
            expect(
              Option.exists(step.if, (condition) =>
                /\b(?:always|failure|cancelled)\s*\(/u.test(condition)
              )
            ).toBe(false);
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect.each([
    { args: ["prod"] },
    { args: ["pr-0"] },
    { args: ["pr-123", "--stage", "prod"] },
    { args: ["pr-123", "--stage=prod"] },
  ])(
    "rejects invalid or overridden destroy stages before any work: $args",
    ({ args }) =>
      Effect.gen(function* () {
        const fixture = yield* commandFixture;
        const result = yield* runCommand(
          fixture,
          script(fixture.scripts, "pr:destroy"),
          "",
          args
        );
        expect(result.code).toBe(64);
        expect(result.calls).toEqual([]);
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  it.effect(
    "builds the docs closure before native preview destroy and forwards flags",
    () =>
      Effect.gen(function* () {
        const fixture = yield* commandFixture;
        const result = yield* runCommand(
          fixture,
          script(fixture.scripts, "pr:destroy"),
          "",
          ["pr-123", "--yes"]
        );
        expect(result.code).toBe(0);
        expect(result.calls).toEqual([
          "run build --filter=@taxkit/docs-content",
          "alchemy destroy --stage pr-123 --yes",
        ]);
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  it.effect("does not import the destroy stack if docs generation fails", () =>
    Effect.gen(function* () {
      const fixture = yield* commandFixture;
      const result = yield* runCommand(
        fixture,
        script(fixture.scripts, "pr:destroy"),
        "run build --filter=@taxkit/docs-content",
        ["pr-123", "--yes"]
      );
      expect(result.code).not.toBe(0);
      expect(result.calls).toEqual(["run build --filter=@taxkit/docs-content"]);
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  it.effect(
    "prepares required catalogue Chromium after cleanup guards and before destroy",
    () =>
      Effect.gen(function* () {
        const configuration = yield* workflow(checksWorkflow);
        const cleanup = Record.get(configuration.jobs, "cleanup").pipe(
          Option.getOrElse(() => expect.fail("Missing cleanup job"))
        );
        const { "continue-on-error": cleanupMayFail } = cleanup;
        const required = Array.map(
          [
            "pull-request",
            "stage-safety",
            "catalogue-browser-path",
            "catalogue-chromium",
          ],
          (id) =>
            Array.findFirst(cleanup.steps, (step) =>
              Option.contains(step.id, id)
            ).pipe(
              Option.getOrElse(() =>
                expect.fail(`Missing cleanup prerequisite: ${id}`)
              )
            )
        );
        const destroy = Array.findFirst(cleanup.steps, (step) =>
          Option.exists(step.run, (run) => run.startsWith("bun run pr:destroy"))
        ).pipe(Option.getOrElse(() => expect.fail("Missing cleanup command")));
        const { "continue-on-error": destroyMayFail } = destroy;
        expect(Option.getOrElse(cleanupMayFail, () => false)).toBe(false);
        yield* Effect.forEach(required, (step, index) => {
          const { "continue-on-error": stepMayFail } = step;
          expect(Option.getOrElse(stepMayFail, () => false)).toBe(false);
          if (index > 0) {
            expect(step.if).toEqual(
              Option.some("steps.pull-request.outputs.closed == 'true'")
            );
          }
          expect(cleanup.steps.indexOf(step)).toBeLessThan(
            cleanup.steps.indexOf(destroy)
          );
          return Array.get(required, index + 1).pipe(
            Option.match({
              onNone: () => Effect.void,
              onSome: (next) =>
                Effect.sync(() => {
                  expect(cleanup.steps.indexOf(step)).toBeLessThan(
                    cleanup.steps.indexOf(next)
                  );
                }),
            })
          );
        });
        expect(
          Array.get(required, 2).pipe(Option.flatMap((step) => step.run))
        ).toEqual(
          Option.some(
            'echo "PLAYWRIGHT_BROWSERS_PATH=$RUNNER_TEMP/ms-playwright" >> "$GITHUB_ENV"'
          )
        );
        expect(
          Array.get(required, 3).pipe(Option.flatMap((step) => step.run))
        ).toEqual(
          Option.some(
            "apps/web/node_modules/.bin/playwright install --with-deps chromium"
          )
        );
        expect(destroy.if).toEqual(
          Option.some("steps.pull-request.outputs.closed == 'true'")
        );
        expect(Option.getOrElse(destroyMayFail, () => false)).toBe(false);
      }).pipe(Effect.provide(BunServices.layer))
  );

  it.effect.each(["open", "closed"] as const)(
    "rechecks the actual cleanup PR state before admitting destroy: %s",
    (state) =>
      Effect.gen(function* () {
        const configuration = yield* workflow(checksWorkflow);
        const cleanup = Record.get(configuration.jobs, "cleanup").pipe(
          Option.getOrElse(() => expect.fail("Missing cleanup job"))
        );
        const guard = Array.findFirst(cleanup.steps, (step) =>
          Option.contains(step.id, "pull-request")
        ).pipe(Option.getOrElse(() => expect.fail("Missing closed-PR guard")));
        const command = Option.getOrElse(guard.run, () =>
          expect.fail("Missing state check")
        );
        const fixture = yield* commandFixture;
        const result = yield* runCommand(fixture, command, "", [], state);
        expect(result.code).toBe(0);
        expect(result.outputs).toBe(`closed=${state === "closed"}\n`);
        const destroy = Array.findFirst(cleanup.steps, (step) =>
          Option.exists(step.run, (run) => run.startsWith("bun run pr:destroy"))
        ).pipe(Option.getOrElse(() => expect.fail("Missing cleanup command")));
        expect(destroy.if).toEqual(
          Option.some("steps.pull-request.outputs.closed == 'true'")
        );
        expect(cleanup.steps.indexOf(guard)).toBeLessThan(
          cleanup.steps.indexOf(destroy)
        );
        expect(result.calls).toEqual([]);
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
});
