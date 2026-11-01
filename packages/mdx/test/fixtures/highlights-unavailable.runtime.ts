import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import { CodeHighlighterInitializationError } from "@taxkit/mdx/errors";
import { PierreCodeHighlighterLive } from "@taxkit/mdx/highlights";
import { CodeHighlighter } from "@taxkit/mdx/service";
import {
  Boolean,
  ConfigProvider,
  Console,
  Effect,
  Layer,
  Schema,
} from "effect";

// Node's real --jitless host has no WebAssembly. Static SDK imports must still
// load so the Layer can report its initialization failure through Effect.
const program = CodeHighlighter.pipe(
  Effect.provide(
    PierreCodeHighlighterLive.pipe(
      Layer.provide(
        ConfigProvider.layer(ConfigProvider.fromUnknown({ MDX_THEME: "light" }))
      )
    )
  ),
  Effect.match({
    onFailure: (error) =>
      Boolean.match(Schema.is(CodeHighlighterInitializationError)(error), {
        onFalse: () => "unexpected-error",
        onTrue: () => "initialization-error",
      }),
    onSuccess: () => "unexpected-success",
  }),
  Effect.flatMap(Console.log)
);

// BunRuntime reexports the shared Node process runner, also valid in this host.
BunRuntime.runMain(program);
