import { Array, Option, Schema, SchemaIssue } from "effect";

import type { CalculatorCatalogEntry } from "./catalog.js";
import {
  PublicSchemaDecodeError,
  SchemaDecodeIssue,
  UnsupportedCalculatorContextError,
} from "./schemas.js";
import type {
  CalculatorId,
  HelpMode,
  PublicCalculationRequest,
  SchemaDecodeHelp,
} from "./schemas.js";

const StandardPathSegment = Schema.Struct({
  key: Schema.PropertyKey,
});

const decodeStandardPathSegment =
  Schema.decodeUnknownOption(StandardPathSegment);

const schemaIssueFormatter = SchemaIssue.makeFormatterStandardSchemaV1();

type StandardSchemaIssue = ReturnType<
  typeof schemaIssueFormatter
>["issues"][number];

const toPathSegment = (segment: unknown): string =>
  decodeStandardPathSegment(segment).pipe(
    Option.map((pathSegment) => pathSegment.key),
    Option.getOrElse(() => segment),
    String
  );

const toSchemaDecodeIssue = (issue: StandardSchemaIssue): SchemaDecodeIssue =>
  new SchemaDecodeIssue({
    message: issue.message,
    path: Option.fromNullishOr(issue.path).pipe(
      Option.match({
        onNone: Array.empty,
        onSome: (path) => Array.map(path, toPathSegment),
      })
    ),
  });

const toSchemaDecodeHelp = (
  entry: CalculatorCatalogEntry
): readonly SchemaDecodeHelp[] =>
  Array.map(entry.inputFacts, (fact) =>
    Option.fromNullishOr(fact.question).pipe(
      Option.match({
        onNone: () => ({
          factId: fact.id,
          title: fact.title,
        }),
        onSome: (question) => ({
          factId: fact.id,
          question,
          title: fact.title,
        }),
      })
    )
  );

export const toPublicSchemaDecodeError = (args: {
  readonly calculatorId: CalculatorId;
  readonly entry: CalculatorCatalogEntry;
  readonly help: Option.Option<HelpMode>;
  readonly issue: SchemaIssue.Issue;
}): PublicSchemaDecodeError =>
  args.help.pipe(
    Option.filter((help) => help === "errors" || help === "full"),
    Option.match({
      onNone: () =>
        new PublicSchemaDecodeError({
          issues: Array.map(
            schemaIssueFormatter(args.issue).issues,
            toSchemaDecodeIssue
          ),
          message: `Invalid facts for ${args.calculatorId}`,
        }),
      onSome: () =>
        new PublicSchemaDecodeError({
          calculatorId: args.calculatorId,
          help: toSchemaDecodeHelp(args.entry),
          issues: Array.map(
            schemaIssueFormatter(args.issue).issues,
            toSchemaDecodeIssue
          ),
          message: `Invalid facts for ${args.calculatorId}`,
        }),
    })
  );

export const toUnsupportedCalculatorContextError = (args: {
  readonly calculatorId: CalculatorId;
  readonly jurisdiction: Option.Option<
    PublicCalculationRequest["jurisdiction"]
  >;
  readonly taxYear: Option.Option<PublicCalculationRequest["taxYear"]>;
}): UnsupportedCalculatorContextError =>
  args.jurisdiction.pipe(
    Option.match({
      onNone: () =>
        args.taxYear.pipe(
          Option.match({
            onNone: () =>
              new UnsupportedCalculatorContextError({
                context: {},
                message: `${args.calculatorId} is not available for the requested context`,
                requestedCalculator: args.calculatorId,
              }),
            onSome: (taxYear) =>
              new UnsupportedCalculatorContextError({
                context: {
                  taxYear,
                },
                message: `${args.calculatorId} is not available for the requested context`,
                requestedCalculator: args.calculatorId,
              }),
          })
        ),
      onSome: (jurisdiction) =>
        args.taxYear.pipe(
          Option.match({
            onNone: () =>
              new UnsupportedCalculatorContextError({
                context: {
                  jurisdiction,
                },
                message: `${args.calculatorId} is not available for the requested context`,
                requestedCalculator: args.calculatorId,
              }),
            onSome: (taxYear) =>
              new UnsupportedCalculatorContextError({
                context: {
                  jurisdiction,
                  taxYear,
                },
                message: `${args.calculatorId} is not available for the requested context`,
                requestedCalculator: args.calculatorId,
              }),
          })
        ),
    })
  );
