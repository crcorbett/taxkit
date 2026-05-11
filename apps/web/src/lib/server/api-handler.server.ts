import "@tanstack/react-start/server-only";
import { WhatTaxServerLayer } from "@whattax/http-api/server";
import { Context } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

const { handler, dispose } = HttpRouter.toWebHandler(WhatTaxServerLayer);
type HandlerOptions = NonNullable<Parameters<typeof handler>[1]>;
const handlerOptions = Context.empty() satisfies HandlerOptions;

let signalRegistered = false;

const ensureDisposeOnShutdown = () => {
  if (signalRegistered) {
    return;
  }
  signalRegistered = true;

  if (typeof process === "undefined" || typeof process.on !== "function") {
    return;
  }

  let disposed = false;
  process.on("SIGTERM", () => {
    if (disposed) {
      return;
    }
    disposed = true;
    void dispose();
  });
};

export const apiHandler = async (request: Request): Promise<Response> => {
  ensureDisposeOnShutdown();
  return await handler(request, handlerOptions);
};
