import { createBindingTracker, propertyName } from "./binding-tracker.js";

const bunImportSemantic = (source, specifierType, imported) => {
  if (
    source === "@effect/platform-bun" &&
    specifierType === "ImportSpecifier" &&
    imported === "BunRuntime"
  ) {
    return "BunRuntime";
  }

  if (
    source === "@effect/platform-bun" &&
    specifierType === "ImportNamespaceSpecifier"
  ) {
    return "platform-bun";
  }

  if (source === "@effect/platform-bun/BunRuntime") {
    return specifierType === "ImportSpecifier" && imported
      ? `BunRuntime.${imported}`
      : "BunRuntime";
  }

  return null;
};

const bunHostMethods = new Set([
  "file",
  "serve",
  "spawn",
  "spawnSync",
  "write",
]);

const bunRuntimeSemantics = new Set([
  "BunRuntime.runMain",
  "platform-bun.BunRuntime.runMain",
]);

const destructuresBunHostMethod = (pattern) =>
  pattern?.type === "ObjectPattern" &&
  pattern.properties.some(
    (property) =>
      property.type === "Property" &&
      (!property.computed || property.key?.type === "Literal") &&
      bunHostMethods.has(propertyName(property.key))
  );

const noHostApiOutsideAdapters = {
  create(context) {
    const tracker = createBindingTracker(
      context.sourceCode,
      new Map([["Bun", "Global.Bun"]])
    );
    const isHostMethod = (semantic) =>
      semantic?.startsWith("Global.Bun.") &&
      bunHostMethods.has(semantic.slice("Global.Bun.".length));

    return {
      AssignmentExpression(node) {
        const source = tracker.semanticOfExpression(node.right);
        tracker.trackAssignment(node);
        if (source === "Global.Bun" && destructuresBunHostMethod(node.left)) {
          context.report({ messageId: "noHostApiOutsideAdapters", node });
        }
      },
      CallExpression(node) {
        const semantic = tracker.calledSemantic(node);
        if (node.callee?.type === "Identifier" && isHostMethod(semantic)) {
          context.report({
            messageId: "noHostApiOutsideAdapters",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, bunImportSemantic);
      },
      MemberExpression(node) {
        if (isHostMethod(tracker.semanticOfExpression(node))) {
          context.report({
            messageId: "noHostApiOutsideAdapters",
            node,
          });
        }
      },
      VariableDeclarator(node) {
        const source = tracker.semanticOfExpression(node.init);
        tracker.trackVariable(node);
        if (source === "Global.Bun" && destructuresBunHostMethod(node.id)) {
          context.report({ messageId: "noHostApiOutsideAdapters", node });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Restrict Bun host APIs to configured adapter files.",
    },
    messages: {
      noHostApiOutsideAdapters:
        "Do not call Bun file, process, or server APIs from package logic. Use Effect Platform FileSystem, Command, or HttpServer services and provide Bun implementations from an exact live/runtime/script adapter.",
    },
    type: "problem",
  },
};

const noRuntimeOutsideEntrypoints = {
  create(context) {
    const tracker = createBindingTracker(context.sourceCode);

    return {
      AssignmentExpression: tracker.trackAssignment,
      CallExpression(node) {
        if (bunRuntimeSemantics.has(tracker.calledSemantic(node))) {
          context.report({
            messageId: "noRuntimeOutsideEntrypoints",
            node: node.callee,
          });
        }
      },
      ImportDeclaration(node) {
        tracker.trackImport(node, bunImportSemantic);
      },
      VariableDeclarator: tracker.trackVariable,
    };
  },
  meta: {
    docs: {
      description: "Restrict BunRuntime.runMain to configured entrypoints.",
    },
    messages: {
      noRuntimeOutsideEntrypoints:
        "Do not call BunRuntime.runMain outside an executable runtime entrypoint. Package logic returns Effect programs; the configured app, CLI, or runtime adapter provides Bun layers and owns process lifecycle.",
    },
    type: "problem",
  },
};

export default {
  meta: { name: "bun" },
  rules: {
    "no-host-api-outside-adapters": noHostApiOutsideAdapters,
    "no-runtime-outside-entrypoints": noRuntimeOutsideEntrypoints,
  },
};
