import * as HttpRouter from "effect/unstable/http/HttpRouter";
import { WhatTaxServerLayer } from "../server.js";
import { makeWhatTaxApiInProcessClientLayer } from "./in-process.layer.js";

const { handler } = HttpRouter.toWebHandler(WhatTaxServerLayer);

export const WhatTaxApiInProcessClientLive =
  makeWhatTaxApiInProcessClientLayer((request) => handler(request, {} as never));
