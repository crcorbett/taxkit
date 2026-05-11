import { Context } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { WhatTaxServerLayer } from "../server.js";
import { makeWhatTaxApiInProcessClientLayer } from "./in-process.layer.js";

const { handler } = HttpRouter.toWebHandler(WhatTaxServerLayer);
type HandlerOptions = NonNullable<Parameters<typeof handler>[1]>;
const handlerOptions = Context.empty() satisfies HandlerOptions;

export const WhatTaxApiInProcessClientLive = makeWhatTaxApiInProcessClientLayer(
  async (request) => await handler(request, handlerOptions)
);
