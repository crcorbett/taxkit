#!/usr/bin/env -S bun --no-env-file
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Array, Config, Effect, FileSystem, Schema } from "effect";

import {
  FakeDopplerConfig,
  FakeDopplerExitError,
  FakeDopplerReceipt,
} from "./fake-doppler.schemas.js";

// Checked test executable only. Tests pass synthetic env and scoped receipt paths.
const program = Effect.gen(function* fakeDopplerFixture() {
  const config = yield* Config.schema(FakeDopplerConfig);
  const fileSystem = yield* FileSystem.FileSystem;
  const receipt = yield* Schema.encodeEffect(
    Schema.fromJsonString(FakeDopplerReceipt)
  )({
    arguments: Array.drop(process.argv, 2),
    environment: {
      CLOUDFLARE_ACCOUNT_ID: config.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_API_TOKEN: config.CLOUDFLARE_API_TOKEN,
      DOPPLER_CONFIG: config.DOPPLER_CONFIG,
      DOPPLER_PROJECT: config.DOPPLER_PROJECT,
      DOPPLER_TOKEN: config.DOPPLER_TOKEN,
      TAXKIT_DOPPLER_TEST_MARKER: config.TAXKIT_DOPPLER_TEST_MARKER,
    },
  });
  yield* fileSystem.writeFileString(
    config.TAXKIT_DOPPLER_TEST_RECEIPT,
    receipt
  );
  if (config.TAXKIT_DOPPLER_TEST_EXIT_CODE === 1) {
    return yield* new FakeDopplerExitError({ code: 1 });
  }
}).pipe(Effect.provide(BunServices.layer));

BunRuntime.runMain(program, { disableErrorReporting: true });
