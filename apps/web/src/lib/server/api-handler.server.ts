import "@tanstack/react-start/server-only";
import { WhatTaxServerLayer } from "@whattax/http-api/server";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

const { handler, dispose } = HttpRouter.toWebHandler(WhatTaxServerLayer);

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

export const apiHandler = (request: Request): Promise<Response> => {
  ensureDisposeOnShutdown();
  return handler(request, {} as never);
};
