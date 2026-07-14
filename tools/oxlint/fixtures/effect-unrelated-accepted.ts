import { describe, expect, it } from "@effect/vitest";
import { vi } from "vitest";

interface Effect<Value, Error, Requirements = never> {
  readonly error: Error;
  readonly requirements?: Requirements;
  readonly value: Value;
}

const Effect = {
  runPromise: <Value>(value: Value) => value,
};
const ManagedRuntime = {
  make: <Value>(value: Value) => value,
};
const BunRuntime = {
  runMain: <Value>(value: Value) => value,
};
const Schema = {
  Unknown: "local",
};
const console = {
  log: (value: string) => value,
};
const process = {
  argv: ["local"],
};

export type LocalEffect = Effect<string, unknown>;
export const localCause = { cause: Schema.Unknown };
export const localRuntimeValues = [
  Effect.runPromise("local"),
  ManagedRuntime.make("local"),
  BunRuntime.runMain("local"),
  console.log("local"),
  process.argv,
];
export const effectTestApis = { describe, expect, it, vi };
