import { Array, Effect, Result, Schema, SchemaIssue } from "effect";
import type { CalculationEngine, CalculationResult } from "../engine/calculation-engine.js";
import { CalculationError } from "../errors/calculation-error.js";
import { CalculatorId, Jurisdiction, TaxYear } from "../primitives/tax.js";

export class InputValidationError extends Schema.TaggedError<InputValidationError, { readonly brand: unique symbol }>()("InputValidationError", {
  message: Schema.tag("Invalid calculator input."),
  issues: Schema.Array(Schema.Struct({ path: Schema.Array(Schema.String), message: Schema.Literal("Invalid input value") })),
  truncated: Schema.Boolean,
}) {}

const issueFormatter = SchemaIssue.makeFormatterStandardSchemaV1();
const PathKey = Schema.Struct({ key: Schema.PropertyKey });
export const inputValidationError = (issue: SchemaIssue.Issue): InputValidationError => {
  const issues = issueFormatter(issue).issues;
  return new InputValidationError({
    issues: Array.take(issues, 20).map((entry) => ({
      message: "Invalid input value",
      path: Array.take(entry.path ?? [], 12).map((part) =>
        Schema.decodeUnknownResult(PathKey)(part).pipe(Result.match({
          onFailure: () => "field",
          onSuccess: ({ key }) => String(key).slice(0, 80),
        }))
      ),
    })),
    truncated: issues.length > 20,
  });
};

export interface CalculatorDefinition<Input extends Schema.Top, Output extends Schema.Top> {
  readonly calculatorId: CalculatorId;
  readonly jurisdiction: Jurisdiction;
  readonly taxYear: TaxYear;
  readonly inputSchema: Input;
  readonly outputSchema: Output;
  readonly errorSchema: typeof CalculationError;
  readonly calculate: (input: Input["Type"]) => Effect.Effect<CalculationResult<Output["Type"]>, CalculationError, CalculationEngine>;
}

/** The owner supplies codecs and their matching native program together. */
export const defineCalculator = <
  const Id extends CalculatorId,
  const Country extends Jurisdiction,
  const Year extends TaxYear,
  Input extends Schema.Top,
  Output extends Schema.Top,
>(definition: CalculatorDefinition<Input, Output> & {
  readonly calculatorId: Id;
  readonly jurisdiction: Country;
  readonly taxYear: Year;
  readonly calculate: (input: NoInfer<Input["Type"]>) => Effect.Effect<CalculationResult<NoInfer<Output["Type"]>>, CalculationError, CalculationEngine>;
}) => definition;

/** Raw ingress is explicit and separate from execution over checked values. */
export const decodeInput = <Input extends Schema.Decoder<unknown, never>>(
  definition: { readonly inputSchema: Input }, input: unknown
) => Schema.decodeUnknownEffect(definition.inputSchema, { onExcessProperty: "error", errors: "all" })(input).pipe(
  Effect.mapError(({ issue }) => inputValidationError(issue))
);
