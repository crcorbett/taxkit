import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";

export const acceptedBunFile = Bun.file("package.json");

BunRuntime.runMain(Effect.void);
