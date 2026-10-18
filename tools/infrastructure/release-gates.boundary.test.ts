import { BunServices } from "@effect/platform-bun";
import { describe, expect, it } from "@effect/vitest";
import {
  Array,
  Effect,
  FileSystem,
  Option,
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
      steps: Schema.Array(
        Schema.Struct({
          "continue-on-error": Schema.OptionFromOptionalKey(Schema.Boolean),
          id: Schema.OptionFromOptionalKey(Schema.String),
          if: Schema.OptionFromOptionalKey(Schema.String),
          run: Schema.OptionFromOptionalKey(Schema.String),
        })
      ),
    })
  ),
});

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

  it.effect.each(["checks", "preview", "production"])(
    "executes every %s workflow verification gate and blocks later provider steps",
    (name) =>
      Effect.gen(function* () {
        const configuration = yield* workflow(`.github/workflows/${name}.yml`);
        const jobs = Record.values(configuration.jobs);
        const gatedJobs = Array.filter(jobs, (job) =>
          Array.some(job.steps, (step) =>
            Option.contains(step.run, "bun run verification")
          )
        );
        expect(gatedJobs.length).toBeGreaterThan(0);
        yield* Effect.forEach(gatedJobs, (job) => {
          const { "continue-on-error": jobMayFail } = job;
          expect(Option.getOrElse(jobMayFail, () => false)).toBe(false);
          expect(
            Array.every(
              job.steps,
              ({ "continue-on-error": stepMayFail, run }) =>
                !Option.contains(run, "bun run verification") ||
                !Option.getOrElse(stepMayFail, () => false)
            )
          ).toBe(true);
          const commands = Array.flatMap(job.steps, (step) =>
            Option.toArray(step.run)
          );
          const gates = Array.filter(
            commands,
            (run) => run === "bun run verification"
          );
          const providerCommands = Array.filter(commands, (run) =>
            /^bun run (?:pr|production):(?:plan|deploy)\b/u.test(run)
          );
          expect(
            Array.every(
              job.steps,
              (step) =>
                !Option.exists(step.run, (run) =>
                  /^bun run (?:pr|production):(?:plan|deploy)\b/u.test(run)
                ) ||
                !Option.exists(step.if, (condition) =>
                  /\b(?:always|failure|cancelled)\s*\(/u.test(condition)
                )
            )
          ).toBe(true);
          if (name !== "checks") {
            expect(providerCommands).toHaveLength(2);
            expect(commands.indexOf("bun run verification")).toBeLessThan(
              commands.indexOf(
                Array.head(providerCommands).pipe(
                  Option.getOrElse(() =>
                    expect.fail("Missing provider command")
                  )
                )
              )
            );
          }
          return Effect.forEach(gates, (gate) =>
            Effect.gen(function* () {
              const fixture = yield* commandFixture;
              const result = yield* runCommand(
                fixture,
                [gate, ...providerCommands].join(" && "),
                "run --filter=web test:native-pair"
              );
              expect(result.code).not.toBe(0);
              expect(Array.last(result.calls)).toEqual(
                Option.some("run --filter=web test:native-pair")
              );
              expect(
                Array.some(result.calls, (call) =>
                  /run (?:pr|production):(?:plan|deploy)/u.test(call)
                )
              ).toBe(false);
            })
          );
        });
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
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

  it.effect.each(["open", "closed"] as const)(
    "rechecks the actual cleanup PR state before admitting destroy: %s",
    (state) =>
      Effect.gen(function* () {
        const configuration = yield* workflow(".github/workflows/preview.yml");
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
