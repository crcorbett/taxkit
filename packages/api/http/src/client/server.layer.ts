import { Context } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { TaxKitServerLayer } from "../server.js";
import { makeTaxKitApiInProcessClientLayer } from "./in-process.layer.js";

const { handler } = HttpRouter.toWebHandler(TaxKitServerLayer);

export const TaxKitApiInProcessClientLive = makeTaxKitApiInProcessClientLayer(
  (request) => handler(request, Context.empty())
);
