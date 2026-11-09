// The one synchronous rule-options ingress. Oxlint calls each rule factory
// synchronously, so options get one non-throwing Schema check here; missing or
// malformed options decode to None and grant no allowance.
import { Array, Option, Schema } from "effect";

import type { OxlintContext } from "../../host.types.js";

export const ruleOptions =
  <S extends Schema.Decoder<unknown>>(schema: S) =>
  (context: OxlintContext): Option.Option<S["Type"]> =>
    Array.head(context.options).pipe(
      Option.flatMap(Schema.decodeUnknownOption(schema))
    );
