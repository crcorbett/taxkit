import {
  Function as EffectFunction,
  Clock,
  Effect,
  Layer,
  Result,
  Schema,
} from "effect";
import { render } from "pele";

import { PeleRenderError } from "./errors.js";
import { Svg } from "./schemas.js";
import { Pele } from "./service.js";

const ProviderReply = Schema.Struct({ svg: Svg });
// Provider errors can contain the source and a snippet. Keep only bounded codes.
const ProviderFailure = Schema.Struct({
  code: Schema.Literals(["unsupported-diagram", "syntax", "semantic", "limit"]),
});

export const PeleLive = Layer.succeed(
  Pele,
  Pele.of({
    renderSvg: Effect.fn("Pele.renderSvg")(function* (source) {
      // Gantt's "today" marker uses the host's Effect clock, including tests.
      const now = yield* Clock.currentTimeMillis;
      const reply: unknown = yield* Effect.try({
        // The SDK's synchronous throw callback needs its typed error now.
        catch: (failure) =>
          EffectFunction.pipe(
            Schema.decodeUnknownResult(ProviderFailure)(failure),
            Result.match({
              onFailure: () => new PeleRenderError({ reason: "render" }),
              onSuccess: ({ code }) => new PeleRenderError({ reason: code }),
            })
          ),
        try: () => render(source, { now }),
      });
      const result = yield* Schema.decodeUnknownEffect(ProviderReply)(
        reply
      ).pipe(Effect.mapError(() => new PeleRenderError({ reason: "output" })));
      return result.svg;
    }),
  })
);
