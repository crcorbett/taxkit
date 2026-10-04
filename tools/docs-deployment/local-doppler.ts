import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Match from "effect/Match";
import * as ChildProcess from "effect/process/ChildProcess";
import * as Record from "effect/Record";

import { LocalDopplerCommandError } from "./local-doppler.schemas.js";

const localDocsDopplerProject = "taxkit";
const localDocsDopplerConfig = "dev";
const localDocsDopplerSecrets = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
] as const;

const removedAmbientNames = HashSet.make(
  "DOPPLER_TOKEN",
  "DOPPLER_PROJECT",
  "DOPPLER_CONFIG",
  ...localDocsDopplerSecrets
);

const localDocsDopplerArguments = [
  "--no-read-env",
  "--no-check-version",
  "--silent",
  "run",
  "--project",
  localDocsDopplerProject,
  "--config",
  localDocsDopplerConfig,
  "--no-fallback",
  "--only-secrets",
  localDocsDopplerSecrets.join(","),
  "--",
  "bun",
  "run",
  "--no-env-file",
  "docs:dev:cloudflare:internal",
] as const;

const filterLocalDopplerEnvironment = (
  environment: Readonly<Record<string, string | undefined>>
) =>
  Record.fromEntries(
    Array.filter(
      Record.toEntries(environment),
      (entry): entry is [string, string] =>
        entry[1] !== undefined && !HashSet.has(removedAmbientNames, entry[0])
    )
  );

export const runLocalDocsWithDoppler = (
  executable: string,
  environment: Readonly<Record<string, string | undefined>>
) =>
  Effect.gen(function* localDocsDoppler() {
    const handle = yield* ChildProcess.make(
      executable,
      localDocsDopplerArguments,
      {
        env: filterLocalDopplerEnvironment(environment),
        extendEnv: false,
        forceKillAfter: "2 seconds",
        stderr: "inherit",
        stdin: "inherit",
        stdout: "inherit",
      }
    ).pipe(
      Effect.mapError(
        () => new LocalDopplerCommandError({ reason: "process-start" })
      )
    );
    const exitCode = yield* handle.exitCode.pipe(
      Effect.mapError(
        () => new LocalDopplerCommandError({ reason: "process-exit" })
      )
    );

    return yield* Match.value(Number(exitCode)).pipe(
      Match.when(0, () => Effect.void),
      Match.orElse(() =>
        Effect.fail(new LocalDopplerCommandError({ reason: "process-exit" }))
      )
    );
  });
