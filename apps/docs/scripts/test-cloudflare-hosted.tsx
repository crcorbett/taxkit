import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Console, Effect, Layer, Match } from "effect";
import { FetchHttpClient } from "effect/http";

import { runCloudflareHostedProof } from "./cloudflare-hosted-proof.boundary.js";
import { CloudflareHostedProofLive } from "./cloudflare-hosted-proof.live.layer.js";

const program = runCloudflareHostedProof.pipe(
  Effect.flatMap(Console.log),
  Effect.tapErrorTag("HostedProofConfigurationError", (error) =>
    Console.error(`FAIL [hosted-proof] config=${error.requirement}`)
  ),
  Effect.tapErrorTag("HostedProofExecutionError", (error) =>
    Console.error(`FAIL [hosted-proof] execution=${error.operation}`)
  ),
  Effect.tapErrorTag("HostedProofEvidenceError", (error) =>
    Console.error(`FAIL [hosted-proof] evidence=${error.operation}`)
  ),
  Effect.scoped,
  Effect.provide(
    CloudflareHostedProofLive.pipe(
      Layer.provide(Layer.merge(BunServices.layer, FetchHttpClient.layer))
    )
  )
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
