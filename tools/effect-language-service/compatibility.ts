import { Effect, Schema } from "effect";

const CompatibilityValue = Schema.Struct({
  count: Schema.Number,
});

const compatibilityProgram: Effect.Effect<typeof CompatibilityValue.Type> =
  Effect.succeed(
    CompatibilityValue.make({
      count: 1,
    })
  );

void compatibilityProgram;
