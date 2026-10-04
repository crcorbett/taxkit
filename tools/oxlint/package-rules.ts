import { Array as EffectArray, Option } from "effect";

import type {
  OxlintContext,
  OxlintRule,
  SyntaxKind,
  SyntaxNode,
} from "./host.types.js";

const sourceFileName = (context: OxlintContext) =>
  (context.filename ?? context.getFilename?.() ?? "").replaceAll("\\", "/");

const stringValue = (node: SyntaxNode | null | undefined) =>
  node?.type === "Literal" && String(node.value) === node.value
    ? node.value
    : undefined;

const resolveRelative = (fileName: string, specifier: string) => {
  const segments = EffectArray.reduce(
    specifier.split("/"),
    EffectArray.dropRight(fileName.split("/"), 1),
    (current, segment) => {
      if (segment === "..") {
        return EffectArray.dropRight(current, 1);
      }
      if (segment !== "." && segment.length > 0) {
        return EffectArray.append(current, segment);
      }
      return current;
    }
  );
  return segments.join("/");
};

const workspaceSourceRoot = (fileName: string) => {
  const match = fileName.match(
    /\/(?:apps|packages)\/(?:[^/]+\/)+?src(?:\/|$)/u
  );
  return Option.getOrUndefined(
    Option.fromNullishOr(match).pipe(
      Option.flatMap(EffectArray.head),
      Option.map((value) => value.replace(/\/$/u, ""))
    )
  );
};

const isPrivatePackageAlias = (specifier: string) =>
  /^@[^/]+\/[^/]+\/src(?:\/|$)/u.test(specifier);

const isCrossWorkspaceSourcePath = (fileName: string, specifier: string) => {
  if (!specifier.startsWith(".")) {
    return false;
  }
  const sourceRoot = workspaceSourceRoot(fileName);
  const target = resolveRelative(fileName, specifier);
  const targetRoot = workspaceSourceRoot(target);
  return (
    sourceRoot !== undefined &&
    targetRoot !== undefined &&
    sourceRoot !== targetRoot
  );
};

const noCrossPackageSourceImports: OxlintRule = {
  create(context) {
    const fileName = sourceFileName(context);
    const inspect = (
      node: SyntaxKind<
        | "ExportAllDeclaration"
        | "ExportNamedDeclaration"
        | "ImportDeclaration"
        | "ImportExpression"
      >
    ) => {
      const specifier = stringValue(node.source);
      if (
        specifier !== undefined &&
        (isPrivatePackageAlias(specifier) ||
          isCrossWorkspaceSourcePath(fileName, specifier))
      ) {
        context.report({
          messageId: "noCrossPackageSourceImports",
          node: node.source ?? node,
        });
      }
    };
    return {
      ExportAllDeclaration: inspect,
      ExportNamedDeclaration: inspect,
      ImportDeclaration: inspect,
      ImportExpression: inspect,
    };
  },
  meta: {
    docs: {
      description:
        "Prevent imports from another workspace's private source tree.",
    },
    messages: {
      noCrossPackageSourceImports:
        "Import the package's public export instead of reaching into another workspace's source folder.",
    },
    type: "problem",
  },
};

export default {
  meta: { name: "package" },
  rules: {
    "no-cross-package-source-imports": noCrossPackageSourceImports,
  },
};
