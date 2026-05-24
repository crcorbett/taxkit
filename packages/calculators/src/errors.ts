import { Array, Option, Schema, SchemaIssue } from "effect";

import type { CalculatorCatalogEntry } from "./catalog.js";
import { CalculatorInputDecodeError, CalculatorInputIssue } from "./schemas.js";
import type { CalculatorId, HelpMode } from "./schemas.js";

// Effect Schema's Standard Schema formatter can emit path segments as objects
// with a `key` field. Decode that shape with Schema instead of probing with
// `typeof` or `in`, then stringify the canonical path for public API consumers.
const StandardPathSegment = Schema.Struct({
  key: Schema.PropertyKey,
});

const schemaIssueFormatter = SchemaIssue.makeFormatterStandardSchemaV1();

/**
 * Converts an Effect Schema decode issue into the public calculator API error.
 *
 * This is the only shared projection in this file because it bridges Effect
 * Schema's internal issue tree to a stable transport schema. Help enrichment is
 * kept here so every calculation endpoint reports schema errors consistently.
 */
export const toCalculatorInputDecodeError = (args: {
  readonly calculatorId: CalculatorId;
  readonly entry: CalculatorCatalogEntry;
  readonly help: Option.Option<HelpMode>;
  readonly issue: SchemaIssue.Issue;
}): CalculatorInputDecodeError => {
  const issues = Array.map(
    schemaIssueFormatter(args.issue).issues,
    (issue) =>
      new CalculatorInputIssue({
        message: issue.message,
        path: Option.fromNullishOr(issue.path).pipe(
          Option.match({
            onNone: Array.empty,
            onSome: (path) =>
              Array.map(path, (segment) => {
                const pathSegment =
                  Schema.decodeUnknownOption(StandardPathSegment)(segment);

                return pathSegment.pipe(
                  Option.map((decodedSegment) => decodedSegment.key),
                  Option.getOrElse(() => segment),
                  String
                );
              }),
          })
        ),
      })
  );

  return args.help.pipe(
    Option.filter((help) => help === "errors" || help === "full"),
    Option.match({
      onNone: () =>
        new CalculatorInputDecodeError({
          issues,
          message: `Invalid facts for ${args.calculatorId}`,
        }),
      onSome: () =>
        new CalculatorInputDecodeError({
          calculatorId: args.calculatorId,
          help: Array.map(args.entry.inputFacts, (fact) =>
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
          ),
          issues,
          message: `Invalid facts for ${args.calculatorId}`,
        }),
    })
  );
};
