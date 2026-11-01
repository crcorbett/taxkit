import { Context } from "effect";
import type { Effect } from "effect";

import type { PeleRenderError } from "./errors.js";
import type { Source, Svg } from "./schemas.js";

export class Pele extends Context.Service<
  Pele,
  {
    readonly renderSvg: (source: Source) => Effect.Effect<Svg, PeleRenderError>;
  }
>()("@taxkit/pele/Pele") {}
