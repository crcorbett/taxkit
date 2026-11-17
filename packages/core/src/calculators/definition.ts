import { Effect, Schema } from "effect";

import { CalculationDiagnostics } from "../engine/schemas.js";
import type { CalculationResult } from "../engine/schemas.js";
import type { CalculationError } from "../errors/calculation-error.js";
import { CalculationInvariantViolation } from "../errors/calculation-error.js";
import { inputValidationError } from "../errors/input-validation-error.js";
import { validateRuleGraph } from "../graph/rule-graph.js";
import type { CalculatorId, Jurisdiction, TaxYear } from "../primitives/tax.js";
import type {
  AnyFactDescriptor,
  AnyRuleDescriptor,
} from "../rules/descriptor.js";

export interface CalculatorDefinition<
  Input extends Schema.Top,
  Output extends Schema.Top,
> {
  readonly calculatorId: CalculatorId;
  readonly jurisdiction: Jurisdiction;
  readonly taxYear: TaxYear;
  readonly inputFacts: readonly AnyFactDescriptor[];
  readonly ruleDescriptors: readonly AnyRuleDescriptor[];
  readonly inputSchema: Input;
  readonly outputSchema: Output;
  readonly errorSchema: typeof CalculationError;
  /** A closed program: rule packs are composed statically by the owner. */
  readonly calculate: (
    input: Input["Type"]
  ) => Effect.Effect<CalculationResult<Output["Type"]>, CalculationError>;
}

/**
 * The owner supplies codecs and their matching closed report program
 * together. The definition validates the rule graph once and attaches its
 * diagnostics to every result. An invalid graph is a defect in the owning
 * package, not a caller error: its program dies without running a rule.
 */
export const defineCalculator = <
  const Id extends CalculatorId,
  const Country extends Jurisdiction,
  const Year extends TaxYear,
  Input extends Schema.Top,
  Output extends Schema.Top,
>(
  definition: Omit<CalculatorDefinition<Input, Output>, "calculate"> & {
    readonly calculatorId: Id;
    readonly jurisdiction: Country;
    readonly taxYear: Year;
    readonly calculate: (
      input: NoInfer<Input["Type"]>
    ) => Effect.Effect<NoInfer<Output["Type"]>, CalculationError>;
  }
) => {
  const graphIssues = validateRuleGraph({
    inputFacts: definition.inputFacts,
    rules: definition.ruleDescriptors,
  });
  const diagnostics = new CalculationDiagnostics({ graphIssues });
  return {
    ...definition,
    calculate: (
      input: Input["Type"]
    ): Effect.Effect<CalculationResult<Output["Type"]>, CalculationError> => {
      if (graphIssues.length > 0) {
        return Effect.die(
          new CalculationInvariantViolation({
            invariant: "rule-graph",
            message: "The calculator rule graph is invalid.",
          })
        );
      }
      return definition
        .calculate(input)
        .pipe(Effect.map((report) => ({ diagnostics, report })));
    },
  } as const;
};

type UntrustedCalculatorInput = typeof Schema.Unknown.Type;

/** Raw ingress is explicit and separate from execution over checked values. */
export const decodeInput = <Input extends Schema.Top>(
  definition: { readonly inputSchema: Input },
  input: UntrustedCalculatorInput
) =>
  Schema.decodeUnknownEffect(definition.inputSchema, {
    onExcessProperty: "error",
    errors: "all",
  })(input).pipe(Effect.mapError(({ issue }) => inputValidationError(issue)));
