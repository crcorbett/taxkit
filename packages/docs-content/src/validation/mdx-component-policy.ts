import { createProcessor } from "@mdx-js/mdx";
import { Array, Effect, HashSet, Match, Option, Result, Schema } from "effect";
import { visit } from "estree-util-visit";
import type { Root, RootContent } from "mdast";
import { VFile } from "vfile";

import { DocsMdxComponentName, DocsValidationIssue } from "../schemas.ts";
import type { DocsSourcePath } from "../schemas.ts";

const allowedMdxComponentNames = HashSet.empty<DocsMdxComponentName>();
const processor = createProcessor({ format: "mdx" });

const componentNameIssues = (
  path: DocsValidationIssue["path"],
  name: string
): readonly DocsValidationIssue[] =>
  Option.some(name).pipe(
    // MDX has already parsed the qualified name. JSX members are bindings
    // regardless of root casing; only plain lowercase names are intrinsic tags.
    Option.filter((value) => value.includes(".") || !/^[a-z]/u.test(value)),
    Option.match({
      onNone: () => Array.empty<DocsValidationIssue>(),
      onSome: (value) =>
        Schema.decodeResult(DocsMdxComponentName)(value).pipe(
          Result.match({
            onFailure: () =>
              Array.of(
                new DocsValidationIssue({
                  message: "Invalid MDX component name.",
                  path,
                })
              ),
            onSuccess: (componentName) =>
              HashSet.has(allowedMdxComponentNames, componentName)
                ? Array.empty<DocsValidationIssue>()
                : Array.of(
                    new DocsValidationIssue({
                      message: `MDX component not allowed: ${componentName}`,
                      path,
                    })
                  ),
          })
        ),
    })
  );

type EstreeNode = Parameters<typeof visit>[0];
type JsxElementName = Extract<
  EstreeNode,
  { type: "JSXOpeningElement" }
>["name"];

const jsxElementName = (name: JsxElementName): string => {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }
  if (name.type === "JSXMemberExpression") {
    return `${jsxElementName(name.object)}.${name.property.name}`;
  }
  return `${name.namespace.name}:${name.name.name}`;
};

const estreeComponentIssues = (
  path: DocsValidationIssue["path"],
  program: Extract<EstreeNode, { type: "Program" }>
): readonly DocsValidationIssue[] => {
  // The native visitor owns ESTree's fields and nested JSX traversal. VFile is
  // its per-invocation diagnostic sink; no AST mutation or owned accumulator.
  const diagnostics = new VFile();
  visit(program, (node) => {
    if (node.type === "JSXOpeningElement") {
      Array.head(componentNameIssues(path, jsxElementName(node.name))).pipe(
        Option.match({
          onNone: () => null,
          onSome: (issue) => diagnostics.message(issue.message),
        })
      );
    }
  });
  return Array.map(
    diagnostics.messages,
    (message) => new DocsValidationIssue({ message: message.reason, path })
  );
};

// The parser owns literal code and executable JSX in both mdast and ESTree.
// Expressions/ESM carry a native Program; MDX JSX attribute expressions carry
// their own Programs outside the parent node's mdast children.
const componentIssues = (
  path: DocsValidationIssue["path"],
  node: Root | RootContent
): readonly DocsValidationIssue[] => {
  if (node.type === "code" || node.type === "inlineCode") {
    return Array.empty();
  }
  const programs = Match.value(node).pipe(
    Match.when(
      (value) =>
        value.type === "mdxFlowExpression" ||
        value.type === "mdxTextExpression" ||
        value.type === "mdxjsEsm",
      (value) => Option.toArray(Option.fromNullishOr(value.data?.estree))
    ),
    Match.when(
      (value) =>
        value.type === "mdxJsxFlowElement" ||
        value.type === "mdxJsxTextElement",
      (value) =>
        Array.flatMap(value.attributes, (attribute) => {
          if (attribute.type === "mdxJsxExpressionAttribute") {
            return Option.toArray(Option.fromNullishOr(attribute.data?.estree));
          }
          return Match.value(attribute.value).pipe(
            Match.when(Match.string, () =>
              Array.empty<Extract<EstreeNode, { type: "Program" }>>()
            ),
            Match.when(Match.null, () =>
              Array.empty<Extract<EstreeNode, { type: "Program" }>>()
            ),
            Match.when(Match.undefined, () =>
              Array.empty<Extract<EstreeNode, { type: "Program" }>>()
            ),
            Match.orElse((expression) =>
              Option.toArray(Option.fromNullishOr(expression.data?.estree))
            )
          );
        })
    ),
    Match.orElse(() => Array.empty<Extract<EstreeNode, { type: "Program" }>>())
  );
  return [
    ...(node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement"
      ? Option.fromNullishOr(node.name).pipe(
          Option.match({
            onNone: () => Array.empty<DocsValidationIssue>(),
            onSome: (name) => componentNameIssues(path, name),
          })
        )
      : Array.empty<DocsValidationIssue>()),
    ...Array.flatMap(programs, (program) =>
      estreeComponentIssues(path, program)
    ),
    ...("children" in node
      ? Array.flatMap(node.children, (child) => componentIssues(path, child))
      : Array.empty<DocsValidationIssue>()),
  ];
};

export const validateMdxComponentPolicy = (
  source: DocsSourcePath,
  markdown: string
) =>
  Effect.try({
    catch: () =>
      new DocsValidationIssue({
        message: "The documentation MDX syntax is invalid.",
        path: [source],
      }),
    try: () => processor.parse(markdown),
  }).pipe(
    Effect.match({
      onFailure: Array.of,
      onSuccess: (tree) => componentIssues([source], tree),
    })
  );

export const remarkMdxComponentPolicy =
  () =>
  (tree: Root, file: VFile): Root => {
    const issues = componentIssues([file.path], tree);
    return Array.head(issues).pipe(
      Option.match({
        onNone: () => tree,
        onSome: (issue) => file.fail(issue.message),
      })
    );
  };
