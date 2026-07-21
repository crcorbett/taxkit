import { Array, Order, Record } from "effect";

import {
  DocumentationDiagnostic,
  DocumentationPathClass,
  DocumentationReport,
} from "./schemas.js";
import type {
  DocumentationInvariant,
  OwnerPolicy,
  PublicPageAcceptanceRecord,
} from "./schemas.js";

export type DocumentationFile = Readonly<{ path: string; text: string }>;
export type WorkspaceScripts = Readonly<{
  name?: string;
  scripts: ReadonlySet<string>;
}>;
export type DocumentationInspection = Readonly<{
  acceptanceRecords?: ReadonlyMap<string, PublicPageAcceptanceRecord | null>;
  files: readonly DocumentationFile[];
  ownerPolicy: OwnerPolicy;
  rootScripts: ReadonlySet<string>;
  workspaceScripts: ReadonlyMap<string, WorkspaceScripts>;
}>;

const markdownLink = /\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/gu;
const bunRun =
  /\bbun\s+run\s+(?:(?:--filter(?:=|\s+)([^\s`]+))\s+)?([A-Za-z0-9:_-]+)/gu;
const lifecycleMetadata = [
  "document_type",
  "lifecycle",
  "authority",
  "owner",
  "last_reviewed",
] as const;
const legacyMetadata = [
  "status",
  "last_reviewed",
  "source_of_truth",
  "confidence",
] as const;

const diagnostic = (
  invariant: DocumentationInvariant,
  owner: string,
  target: string,
  repair: string
) => new DocumentationDiagnostic({ invariant, owner, repair, target });

const isUnder = (path: string, root: string): boolean =>
  path === root || path.startsWith(`${root}/`);

const metadata = (text: string): ReadonlyMap<string, string> => {
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text)?.[1];
  return new Map(
    globalThis.Array.from(
      (block ?? "").matchAll(/^([a-z_]+):\s*(\S.*)$/gmu),
      (entry) => {
        const value = entry[2] ?? "";
        const quoted = /^(?:"([\s\S]*)"|'([\s\S]*)')$/u.exec(value);
        return [entry[1] ?? "", quoted?.[1] ?? quoted?.[2] ?? value];
      }
    )
  );
};

const relativeTarget = (source: string, target: string): string => {
  const parts = source.split("/");
  parts.pop();
  for (const part of target.split("/")) {
    if (part === "." || part === "") {
      continue;
    }
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
};

const ownerForMaintainer = (policy: OwnerPolicy, path: string): string =>
  policy.maintainer.rootEntrypoints.includes(path)
    ? "taxkit-documentation-owner"
    : "maintainer-document-owner";

const localScriptsFor = (
  workspaceScripts: ReadonlyMap<string, WorkspaceScripts>,
  path: string
): ReadonlySet<string> => {
  const [matchingRoot] = globalThis.Array.from(workspaceScripts.keys())
    .filter((root) => isUnder(path, root))
    .toSorted((left, right) => right.length - left.length);
  return matchingRoot
    ? (workspaceScripts.get(matchingRoot)?.scripts ?? new Set<string>())
    : new Set<string>();
};

const filteredScriptsFor = (
  workspaceScripts: ReadonlyMap<string, WorkspaceScripts>,
  filter: string
): ReadonlySet<string> => {
  if (/^<[^>]+>$/u.test(filter)) {
    return new Set(
      globalThis.Array.from(workspaceScripts.values()).flatMap((workspace) =>
        globalThis.Array.from(workspace.scripts)
      )
    );
  }
  const selected = globalThis.Array.from(workspaceScripts.entries()).find(
    ([root, workspace]) =>
      workspace.name === filter || root.split("/").at(-1) === filter
  );
  return selected?.[1].scripts ?? new Set<string>();
};

const inspectCurrentOwnerReferences = (
  inspection: DocumentationInspection,
  file: DocumentationFile,
  paths: ReadonlySet<string>
): readonly DocumentationDiagnostic[] => {
  const result: DocumentationDiagnostic[] = [];
  const prose = file.text
    .replaceAll(/```[\s\S]*?```/gu, "")
    .replaceAll(/`[^`]*`/gu, "");
  for (const match of prose.matchAll(markdownLink)) {
    const [, matchedTarget] = match;
    const target = matchedTarget?.split("#")[0];
    if (
      target &&
      !target.startsWith("/") &&
      !target.startsWith("#") &&
      !/^[a-z][a-z0-9+.-]*:/iu.test(target) &&
      !paths.has(relativeTarget(file.path, target))
    ) {
      result.push(
        diagnostic(
          "relative-link",
          ownerForMaintainer(inspection.ownerPolicy, file.path),
          file.path,
          `repair relative link target ${target}`
        )
      );
    }
  }
  const localScripts = localScriptsFor(inspection.workspaceScripts, file.path);
  for (const match of file.text.matchAll(bunRun)) {
    const [, filter, command] = match;
    const commandScripts = filter
      ? filteredScriptsFor(inspection.workspaceScripts, filter)
      : localScripts;
    const commandExists = filter
      ? commandScripts.has(command ?? "")
      : inspection.rootScripts.has(command ?? "") ||
        commandScripts.has(command ?? "");
    if (command && !commandExists) {
      result.push(
        diagnostic(
          "local-bun-command",
          "repository-script-owner",
          file.path,
          `document an existing local bun script instead of bun run ${filter ? `--filter=${filter} ` : ""}${command}`
        )
      );
    }
  }
  return result;
};

export const classifyDocumentationPath = (
  policy: OwnerPolicy,
  path: string
): DocumentationPathClass => {
  if (/^(?:apps|packages)\/.+\/package\.json$/u.test(path)) {
    return DocumentationPathClass.make("workspace-manifest");
  }
  if (
    policy.public.roots.some((root) => isUnder(path, root)) ||
    path === policy.public.navigation.path
  ) {
    return DocumentationPathClass.make("public");
  }
  if (policy.sdkDocs.roots.some((root) => isUnder(path, root))) {
    return DocumentationPathClass.make("authored-sdk");
  }
  if (
    path === policy.openApi.snapshot.path ||
    isUnder(path, policy.fumadocs.generatedRoot)
  ) {
    return DocumentationPathClass.make("generated");
  }
  if (
    policy.maintainer.rootEntrypoints.includes(path) ||
    (policy.maintainer.roots.some((root) => isUnder(path, root)) &&
      /\.(?:md|html)$/u.test(path)) ||
    (/(?:^|\/)README\.md$/u.test(path) && !policy.sdkDocs.roots.includes(path))
  ) {
    return DocumentationPathClass.make("maintainer");
  }
  return DocumentationPathClass.make("other");
};

const inspectMaintainer = (
  inspection: DocumentationInspection,
  file: DocumentationFile,
  paths: ReadonlySet<string>
): readonly DocumentationDiagnostic[] => {
  const result: DocumentationDiagnostic[] = [];
  const fields = metadata(file.text);
  if (
    inspection.ownerPolicy.maintainer.snapshotExemptions.some(
      (item) => item.path === file.path
    )
  ) {
    return result;
  }
  const required =
    fields.has("status") && !fields.has("lifecycle")
      ? legacyMetadata
      : lifecycleMetadata;
  for (const key of required) {
    if (!fields.has(key)) {
      result.push(
        diagnostic(
          "maintainer-metadata",
          ownerForMaintainer(inspection.ownerPolicy, file.path),
          file.path,
          `add frontmatter ${key}`
        )
      );
    }
  }
  if (
    (fields.get("lifecycle") === "tombstone" ||
      fields.get("lifecycle") === "superseded") &&
    !fields.has("successor")
  ) {
    result.push(
      diagnostic(
        "lifecycle-successor",
        ownerForMaintainer(inspection.ownerPolicy, file.path),
        file.path,
        "add a successor pointer"
      )
    );
  }
  const isCurrentOwner =
    fields.get("lifecycle") === "current" ||
    fields.get("lifecycle") === "proposed" ||
    fields.get("status") === "canonical";
  if (!isCurrentOwner) {
    return result;
  }
  return [...result, ...inspectCurrentOwnerReferences(inspection, file, paths)];
};

const inspectOwners = (
  inspection: DocumentationInspection,
  paths: ReadonlySet<string>
): readonly DocumentationDiagnostic[] => {
  const policy = inspection.ownerPolicy;
  const result: DocumentationDiagnostic[] = [];
  const required = [
    policy.public.navigation,
    {
      owner: policy.public.statusDecision.owner,
      path: policy.public.statusDecision.path,
    },
    policy.openApi.source,
    policy.openApi.snapshot,
    policy.openApi.test,
    policy.openApi.liveRoute,
    policy.fumadocs.source,
    policy.fumadocs.build,
    ...Array.map(policy.sdkDocs.roots, (path) => ({
      owner: policy.sdkDocs.owner,
      path,
    })),
  ];
  for (const binding of required) {
    if (!paths.has(binding.path)) {
      result.push(
        diagnostic(
          "owner-policy",
          binding.owner,
          binding.path,
          "restore the owner-policy target or update the policy in the same accepted slice"
        )
      );
    }
    if (
      binding.command &&
      !localScriptsFor(inspection.workspaceScripts, binding.path).has(
        binding.command
      )
    ) {
      result.push(
        diagnostic(
          "owner-policy",
          binding.owner,
          binding.path,
          `declare existing workspace command ${binding.command}`
        )
      );
    }
  }
  if (
    paths.has(policy.openApi.snapshot.path) &&
    (!paths.has(policy.openApi.source.path) ||
      !paths.has(policy.openApi.test.path))
  ) {
    result.push(
      diagnostic(
        "generated-source-owner",
        policy.openApi.source.owner,
        policy.openApi.snapshot.path,
        "restore the package-owned OpenAPI source and snapshot test"
      )
    );
  }
  if (
    !paths.has(policy.fumadocs.source.path) ||
    !paths.has(policy.fumadocs.build.path)
  ) {
    result.push(
      diagnostic(
        "generated-source-owner",
        policy.fumadocs.source.owner,
        policy.fumadocs.generatedRoot,
        "restore Fumadocs source and build ownership"
      )
    );
  }
  return result;
};

const inspectPublicStatus = (
  inspection: DocumentationInspection
): readonly DocumentationDiagnostic[] => {
  const result: DocumentationDiagnostic[] = [];
  const policy = inspection.ownerPolicy;
  const allowedStatuses = new Set<string>(
    Record.keys(policy.public.statusDecision.statuses)
  );
  const navigation = inspection.files.find(
    (file) => file.path === policy.public.navigation.path
  );
  const publicFiles = inspection.files.filter(
    (file) =>
      policy.public.roots.some((root) => isUnder(file.path, root)) &&
      file.path.endsWith(".mdx")
  );
  const acceptedRecords = new Map<string, string>();
  const recordPaths = new Set<string>();
  const statusFor = (file: DocumentationFile): string | null =>
    file.path === policy.public.navigation.path
      ? (() => {
          const [, status] = /"status"\s*:\s*"([^"]+)"/u.exec(file.text) ?? [];
          return status ?? null;
        })()
      : (metadata(file.text).get("status") ?? null);

  for (const binding of policy.public.statusDecision.acceptanceRecords) {
    if (acceptedRecords.has(binding.path)) {
      result.push(
        diagnostic(
          "owner-policy",
          policy.public.statusDecision.owner,
          binding.path,
          "keep exactly one accepted-record binding for each published public path"
        )
      );
    } else {
      acceptedRecords.set(binding.path, binding.record);
    }
    if (recordPaths.has(binding.record)) {
      result.push(
        diagnostic(
          "owner-policy",
          policy.public.statusDecision.owner,
          binding.record,
          "bind each accepted record to exactly one published public path"
        )
      );
    } else {
      recordPaths.add(binding.record);
    }
  }

  for (const file of [...publicFiles, ...(navigation ? [navigation] : [])]) {
    const status = statusFor(file);
    if (!status || !allowedStatuses.has(status)) {
      result.push(
        diagnostic(
          "owner-policy",
          policy.public.statusDecision.owner,
          file.path,
          "use a public status represented by the accepted public lifecycle policy"
        )
      );
    }
    if (status === "published" && !acceptedRecords.has(file.path)) {
      result.push(
        diagnostic(
          "owner-policy",
          policy.public.statusDecision.owner,
          file.path,
          "bind this published public path to an addressable accepted record"
        )
      );
    }
  }
  for (const binding of policy.public.statusDecision.acceptanceRecords) {
    const publicFile = inspection.files.find(
      (file) => file.path === binding.path
    );
    const recordFile = inspection.files.find(
      (file) => file.path === binding.record
    );
    if (recordFile) {
      const acceptanceRecord =
        inspection.acceptanceRecords?.get(binding.record) ?? null;
      if (!acceptanceRecord) {
        result.push(
          diagnostic(
            "owner-policy",
            policy.public.statusDecision.owner,
            binding.record,
            "replace this file with a valid accepted page-level record"
          )
        );
      } else if (acceptanceRecord.targetPath !== binding.path) {
        result.push(
          diagnostic(
            "owner-policy",
            policy.public.statusDecision.owner,
            binding.record,
            `bind the accepted record targetPath exactly to ${binding.path}`
          )
        );
      }
    } else {
      result.push(
        diagnostic(
          "owner-policy",
          policy.public.statusDecision.owner,
          binding.record,
          "restore the addressable accepted record or remove its published-path binding"
        )
      );
    }
    if (!publicFile || statusFor(publicFile) !== "published") {
      result.push(
        diagnostic(
          "owner-policy",
          policy.public.statusDecision.owner,
          binding.path,
          "remove the stale accepted-record binding or restore the exact published public path"
        )
      );
    }
  }
  return result;
};

export const inspectDocumentation = (
  inspection: DocumentationInspection
): DocumentationReport => {
  const paths = new Set(Array.map(inspection.files, (file) => file.path));
  const diagnostics = [
    ...inspectOwners(inspection, paths),
    ...inspectPublicStatus(inspection),
    ...Array.flatMap(inspection.files, (file) => {
      const pathClass = classifyDocumentationPath(
        inspection.ownerPolicy,
        file.path
      );
      if (pathClass === "workspace-manifest") {
        const readme = file.path.replace(/package\.json$/u, "README.md");
        return paths.has(readme)
          ? []
          : [
              diagnostic(
                "workspace-readme",
                "workspace-package-owner",
                file.path,
                `add adjacent ${readme}`
              ),
            ];
      }
      return pathClass === "maintainer"
        ? inspectMaintainer(inspection, file, paths)
        : [];
    }),
  ];
  return new DocumentationReport({
    diagnostics: Array.sort(
      diagnostics,
      Order.combineAll<DocumentationDiagnostic>([
        Order.mapInput(Order.String, (finding) => finding.target),
        Order.mapInput(Order.String, (finding) => finding.invariant),
      ])
    ),
    inspected: inspection.files.length,
    maintainer: Array.filter(
      inspection.files,
      (file) =>
        classifyDocumentationPath(inspection.ownerPolicy, file.path) ===
        "maintainer"
    ).length,
    public: Array.filter(
      inspection.files,
      (file) =>
        classifyDocumentationPath(inspection.ownerPolicy, file.path) ===
        "public"
    ).length,
  });
};
