import { Schema } from "effect";

export class LocalDopplerCommandError extends Schema.TaggedError<LocalDopplerCommandError>()(
  "LocalDopplerCommandError",
  {
    reason: Schema.Literals(["process-start", "process-exit"]),
  }
) {}

export class DopplerCustodyError extends Schema.TaggedError<DopplerCustodyError>()(
  "DopplerCustodyError",
  {
    reason: Schema.Literals([
      "config-file",
      "config-mode",
      "config-shape",
      "scoped-token",
      "system-keyring-reference",
    ]),
  }
) {}

const DopplerScopedConfig = Schema.Struct({
  token: Schema.optional(Schema.String),
});

export const DopplerUserConfig = Schema.Struct({
  scoped: Schema.Record(Schema.String, DopplerScopedConfig),
});
export type DopplerUserConfig = typeof DopplerUserConfig.Type;
