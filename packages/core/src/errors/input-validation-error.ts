import {
  Array,
  Function as EffectFunction,
  Option,
  Result,
  Schema,
  SchemaIssue,
  SchemaGetter,
} from "effect";

export class InputValidationError extends Schema.TaggedError<
  InputValidationError,
  { readonly brand: unique symbol }
>()("InputValidationError", {
  message: Schema.tag("Invalid calculator input."),
  issues: Schema.Array(
    Schema.Struct({
      path: Schema.Array(Schema.String),
      message: Schema.Literal("Invalid input value"),
    })
  ),
  truncated: Schema.Boolean,
}) {}

const issueFormatter = SchemaIssue.makeFormatterStandardSchemaV1();
const SafePathKey = Schema.Union([
  Schema.String.check(Schema.isPattern(/^[A-Za-z_][A-Za-z0-9_]{0,79}$/u)),
  Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 1_000_000 })),
]);
const PathKey = Schema.Union([
  Schema.Struct({ key: SafePathKey }).pipe(
    Schema.decodeTo(SafePathKey, {
      decode: SchemaGetter.transform(({ key }) => key),
      encode: SchemaGetter.transform((key) => ({ key })),
    })
  ),
  SafePathKey,
]);
export const inputValidationError = (
  issue: SchemaIssue.Issue
): InputValidationError => {
  const { issues } = issueFormatter(issue);
  return new InputValidationError({
    issues: EffectFunction.pipe(
      issues,
      Array.take(20),
      Array.map((entry) => ({
        message: "Invalid input value",
        path: EffectFunction.pipe(
          Option.fromUndefinedOr(entry.path),
          Option.getOrElse((): readonly PropertyKey[] => []),
          Array.take(12),
          Array.map((part) =>
            Schema.decodeUnknownResult(PathKey)(part).pipe(
              Result.match({
                onFailure: () => "field",
                onSuccess: String,
              })
            )
          )
        ),
      }))
    ),
    truncated: issues.length > 20,
  });
};
