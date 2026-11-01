import { Context } from "effect";
import type { Effect } from "effect";

import type { PeleRenderError } from "./errors.js";
import type { RenderSvgRequest, Svg } from "./schemas.js";

export class Pele extends Context.Service<
  Pele,
  {
    readonly renderSvg: (
      request: RenderSvgRequest
    ) => Effect.Effect<Svg, PeleRenderError>;
  }
>()("@taxkit/pele/Pele") {}
