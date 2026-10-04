import { homedir } from "node:os";

import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { ConfigProvider, Console, Effect, Match } from "effect";
import * as Path from "effect/Path";

import { checkDopplerCustody } from "./doppler-custody.boundary.js";
import { readLocalDopplerEnvironment } from "./local-doppler-environment.boundary.js";
import { runLocalDocsWithDoppler } from "./local-doppler.js";

const program = Effect.gen(function* localDopplerRuntime() {
  const path = yield* Path.Path;
  yield* checkDopplerCustody(
    process.cwd(),
    path.join(homedir(), ".doppler", ".doppler.yaml")
  );
  const environment = yield* readLocalDopplerEnvironment(
    ConfigProvider.fromEnv({ preserveEmptyStrings: true })
  );
  yield* runLocalDocsWithDoppler("doppler", environment);
}).pipe(
  Effect.tapErrorTag("DopplerCustodyError", (error) =>
    Console.error(`FAIL [doppler-custody] reason=${error.reason}`)
  ),
  Effect.tapErrorTag("LocalDopplerEnvironmentError", (error) =>
    Console.error(`FAIL [local-doppler] reason=${error.reason}`)
  ),
  Effect.tapErrorTag("LocalDopplerCommandError", (error) =>
    Console.error(`FAIL [local-doppler] reason=${error.reason}`)
  ),
  Effect.scoped,
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(program, { disableErrorReporting: true })
  ),
  Match.orElse(() => false)
);
