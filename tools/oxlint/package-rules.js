const sourceFileName = (context) =>
  (context.filename ?? context.getFilename?.() ?? "").replaceAll("\\", "/");

const stringValue = (node) =>
  node?.type === "Literal" && String(node.value) === node.value
    ? node.value
    : undefined;

const resolveRelative = (fileName, specifier) => {
  const segments = fileName.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === "..") {
      segments.pop();
    } else if (segment !== "." && segment.length > 0) {
      segments.push(segment);
    }
  }
  return segments.join("/");
};

const workspaceSourceRoot = (fileName) => {
  const match = fileName.match(
    /\/(?:apps|packages)\/(?:[^/]+\/)+?src(?:\/|$)/u
  );
  return match?.[0]?.replace(/\/$/u, "");
};

const isPrivatePackageAlias = (specifier) =>
  /^@[^/]+\/[^/]+\/src(?:\/|$)/u.test(specifier);

const isCrossWorkspaceSourcePath = (fileName, specifier) => {
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

const noCrossPackageSourceImports = {
  create(context) {
    const fileName = sourceFileName(context);
    const inspect = (node) => {
      const specifier = stringValue(node.source);
      if (
        specifier !== undefined &&
        (isPrivatePackageAlias(specifier) ||
          isCrossWorkspaceSourcePath(fileName, specifier))
      ) {
        context.report({
          messageId: "noCrossPackageSourceImports",
          node: node.source,
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
