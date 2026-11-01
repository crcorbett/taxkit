import { Effect, Layer } from "effect";

import { PeleRenderError } from "./errors.js";
import { Svg } from "./schemas.js";
import { Pele } from "./service.js";

export const PeleTest = Layer.succeed(
  Pele,
  Pele.of({
    renderSvg: Effect.fn("Pele.renderSvg")(() =>
      Svg.makeEffect(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>'
      ).pipe(Effect.mapError(() => new PeleRenderError({ reason: "output" })))
    ),
  })
);
