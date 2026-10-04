import { Context } from "effect";
import * as HttpRouter from "effect/http/HttpRouter";

import { TaxKitServerLayer } from "../server.js";
import { createTaxKitApiInProcessClientLayer } from "./in-process.layer.js";

const { handler } = HttpRouter.toWebHandler(TaxKitServerLayer);

export const TaxKitApiInProcessClientLive = createTaxKitApiInProcessClientLayer(
  (request) => handler(request, Context.empty())
);
