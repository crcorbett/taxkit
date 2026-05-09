import { WhatTaxLive } from "@packages/tax/live";
import { Cause, Effect, Exit, Layer, ManagedRuntime, Result } from "effect";

const ServerLayer = Layer.mergeAll(WhatTaxLive);

export const runtime = ManagedRuntime.make(ServerLayer);

type ServerContext = ManagedRuntime.ManagedRuntime.Services<typeof runtime>;

export type RuntimeError = ManagedRuntime.ManagedRuntime.Error<typeof runtime>;

export const runServer = async <A>(
  program: Effect.Effect<A, RuntimeError, ServerContext>
): Promise<A> => {
  const exit = await runtime.runPromiseExit(program);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  const defect = Cause.findDefect(exit.cause);
  if (Result.isSuccess(defect)) {
    throw defect.success;
  }
  throw new Error(Cause.pretty(exit.cause));
};
