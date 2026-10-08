import { Array, HashMap, HashSet, Option, Order, Record, pipe } from "effect";
import { sort } from "effect/Array";

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
  scripts: HashSet.HashSet<string>;
}>;
export type DocumentationInspection = Readonly<{
  acceptanceRecords?: HashMap.HashMap<string, PublicPageAcceptanceRecord>;
  files: readonly DocumentationFile[];
  ownerPolicy: OwnerPolicy;
  rootScripts: HashSet.HashSet<string>;
  workspaceScripts: HashMap.HashMap<string, WorkspaceScripts>;
}>;

const markdownLink = /\[[^\]]*\]\((?<target>[^\s)]+)(?:\s+[^)]*)?\)/gu;
const bunRun =
  /\bbun\s+run\s+(?:(?:--filter(?:=|\s+)(?<filter>[^\s`]+))\s+)?(?<command>[A-Za-z0-9:_-]+)/gu;
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

const metadata = (text: string): HashMap.HashMap<string, string> => {
  const block = Record.get(
    /^---\r?\n(?<body>[\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text)?.groups ?? {},
    "body"
  ).pipe(Option.getOrElse(() => ""));
  return HashMap.fromIterable(
    Array.map(
      Array.fromIterable(
        block.matchAll(/^(?<key>[a-z_]+):\s*(?<value>\S.*)$/gmu)
      ),
      (entry) => {
        const value = Record.get(entry.groups ?? {}, "value").pipe(
          Option.getOrElse(() => "")
        );
        const quoted =
          /^(?:"(?<doubleQuoted>[\s\S]*)"|'(?<singleQuoted>[\s\S]*)')$/u.exec(
            value
          )?.groups ?? {};
        return [
          Record.get(entry.groups ?? {}, "key").pipe(
            Option.getOrElse(() => "")
          ),
          Record.get(quoted, "doubleQuoted").pipe(
            Option.flatMap(Option.fromNullishOr),
            Option.orElse(() =>
              Record.get(quoted, "singleQuoted").pipe(
                Option.flatMap(Option.fromNullishOr)
              )
            ),
            Option.getOrElse(() => value)
          ),
        ] as const;
      }
    )
  );
};

const relativeTarget = (source: string, target: string): string =>
  Array.reduce(
    target.split("/"),
    Array.dropRight(source.split("/"), 1),
    (parts, part) => {
      if (part === "." || part === "") {
        return parts;
      }
      return part === ".."
        ? Array.dropRight(parts, 1)
        : Array.append(parts, part);
    }
  ).join("/");

const ownerForMaintainer = (policy: OwnerPolicy, path: string): string =>
  Array.contains(policy.maintainer.rootEntrypoints, path)
    ? "taxkit-documentation-owner"
    : "maintainer-document-owner";

const localScriptsFor = (
  workspaceScripts: HashMap.HashMap<string, WorkspaceScripts>,
  path: string
): HashSet.HashSet<string> =>
  pipe(
    Array.fromIterable(HashMap.keys(workspaceScripts)),
    Array.filter((root) => isUnder(path, root)),
    sort(
      Order.flip(Order.mapInput(Order.Number, (root: string) => root.length))
    ),
    Array.head,
    Option.flatMap((root) => HashMap.get(workspaceScripts, root)),
    Option.map((workspace) => workspace.scripts),
    Option.getOrElse(() => HashSet.empty<string>())
  );

const filteredScriptsFor = (
  workspaceScripts: HashMap.HashMap<string, WorkspaceScripts>,
  filter: string
): HashSet.HashSet<string> => {
  if (/^<[^>]+>$/u.test(filter)) {
    return HashSet.fromIterable(
      Array.flatMap(
        Array.fromIterable(HashMap.values(workspaceScripts)),
        (workspace) => Array.fromIterable(workspace.scripts)
      )
    );
  }
  return Array.findFirst(
    Array.fromIterable(workspaceScripts),
    ([root, workspace]) =>
      workspace.name === filter ||
      Array.last(root.split("/")).pipe(Option.contains(filter))
  ).pipe(
    Option.map(([, workspace]) => workspace.scripts),
    Option.getOrElse(() => HashSet.empty<string>())
  );
};

const isMissingRelativeTarget = (
  target: string,
  sourcePath: string,
  paths: HashSet.HashSet<string>
): boolean =>
  target.length > 0 &&
  !target.startsWith("/") &&
  !target.startsWith("#") &&
  !/^[a-z][a-z0-9+.-]*:/iu.test(target) &&
  !HashSet.has(paths, relativeTarget(sourcePath, target));

const inspectCurrentOwnerReferences = (
  inspection: DocumentationInspection,
  file: DocumentationFile,
  paths: HashSet.HashSet<string>
): readonly DocumentationDiagnostic[] => {
  const prose = file.text
    .replaceAll(/```[\s\S]*?```/gu, "")
    .replaceAll(/`[^`]*`/gu, "");
  const localScripts = localScriptsFor(inspection.workspaceScripts, file.path);
  return [
    ...Array.flatMap(
      Array.fromIterable(prose.matchAll(markdownLink)),
      (match) =>
        Record.get(match.groups ?? {}, "target").pipe(
          Option.flatMap((target) => Array.head(target.split("#"))),
          Option.match({
            onNone: () => [],
            onSome: (target) =>
              isMissingRelativeTarget(target, file.path, paths)
                ? [
                    diagnostic(
                      "relative-link",
                      ownerForMaintainer(inspection.ownerPolicy, file.path),
                      file.path,
                      `repair relative link target ${target}`
                    ),
                  ]
                : [],
          })
        )
    ),
    ...Array.flatMap(
      Array.fromIterable(file.text.matchAll(bunRun)),
      (match) => {
        const filter = Record.get(match.groups ?? {}, "filter").pipe(
          Option.flatMap(Option.fromNullishOr)
        );
        const commandScripts = Option.match(filter, {
          onNone: () => localScripts,
          onSome: (value) =>
            filteredScriptsFor(inspection.workspaceScripts, value),
        });
        return Record.get(match.groups ?? {}, "command").pipe(
          Option.match({
            onNone: () => [],
            onSome: (command) => {
              const exists =
                HashSet.has(commandScripts, command) ||
                (Option.isNone(filter) &&
                  HashSet.has(inspection.rootScripts, command));
              const prefix = Option.match(filter, {
                onNone: () => "",
                onSome: (value) => `--filter=${value} `,
              });
              return exists
                ? []
                : [
                    diagnostic(
                      "local-bun-command",
                      "repository-script-owner",
                      file.path,
                      `document an existing local bun script instead of bun run ${prefix}${command}`
                    ),
                  ];
            },
          })
        );
      }
    ),
  ];
};

export const classifyDocumentationPath = (
  policy: OwnerPolicy,
  path: string
): DocumentationPathClass => {
  if (/^(?:apps|packages)\/.+\/package\.json$/u.test(path)) {
    return DocumentationPathClass.make("workspace-manifest");
  }
  if (
    Array.some(policy.public.roots, (root) => isUnder(path, root)) ||
    path === policy.public.navigation.path
  ) {
    return DocumentationPathClass.make("public");
  }
  if (Array.some(policy.sdkDocs.roots, (root) => isUnder(path, root))) {
    return DocumentationPathClass.make("authored-sdk");
  }
  if (
    path === policy.openApi.snapshot.path ||
    isUnder(path, policy.fumadocs.generatedRoot)
  ) {
    return DocumentationPathClass.make("generated");
  }
  if (
    Array.contains(policy.maintainer.rootEntrypoints, path) ||
    (Array.some(policy.maintainer.roots, (root) => isUnder(path, root)) &&
      /\.(?:md|html)$/u.test(path)) ||
    (/(?:^|\/)README\.md$/u.test(path) &&
      !Array.contains(policy.sdkDocs.roots, path))
  ) {
    return DocumentationPathClass.make("maintainer");
  }
  return DocumentationPathClass.make("other");
};

const inspectMaintainer = (
  inspection: DocumentationInspection,
  file: DocumentationFile,
  paths: HashSet.HashSet<string>
): readonly DocumentationDiagnostic[] => {
  const fields = metadata(file.text);
  if (
    Array.some(
      inspection.ownerPolicy.maintainer.snapshotExemptions,
      (item) => item.path === file.path
    )
  ) {
    return [];
  }
  const required =
    HashMap.has(fields, "status") && !HashMap.has(fields, "lifecycle")
      ? legacyMetadata
      : lifecycleMetadata;
  const lifecycle = HashMap.get(fields, "lifecycle");
  const diagnostics = [
    ...Array.flatMap(required, (key) =>
      HashMap.has(fields, key)
        ? []
        : [
            diagnostic(
              "maintainer-metadata",
              ownerForMaintainer(inspection.ownerPolicy, file.path),
              file.path,
              `add frontmatter ${key}`
            ),
          ]
    ),
    ...((Option.contains(lifecycle, "tombstone") ||
      Option.contains(lifecycle, "superseded")) &&
    !HashMap.has(fields, "successor")
      ? [
          diagnostic(
            "lifecycle-successor",
            ownerForMaintainer(inspection.ownerPolicy, file.path),
            file.path,
            "add a successor pointer"
          ),
        ]
      : []),
  ];
  const isCurrentOwner =
    Option.contains(lifecycle, "current") ||
    Option.contains(lifecycle, "proposed") ||
    HashMap.get(fields, "status").pipe(Option.contains("canonical"));
  return isCurrentOwner
    ? [
        ...diagnostics,
        ...inspectCurrentOwnerReferences(inspection, file, paths),
      ]
    : diagnostics;
};

const inspectOwners = (
  inspection: DocumentationInspection,
  paths: HashSet.HashSet<string>
): readonly DocumentationDiagnostic[] => {
  const policy = inspection.ownerPolicy;
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
  return [
    ...Array.flatMap(required, (binding) => [
      ...(HashSet.has(paths, binding.path)
        ? []
        : [
            diagnostic(
              "owner-policy",
              binding.owner,
              binding.path,
              "restore the owner-policy target or update the policy in the same accepted slice"
            ),
          ]),
      ...(binding.command &&
      !HashSet.has(
        localScriptsFor(inspection.workspaceScripts, binding.path),
        binding.command
      )
        ? [
            diagnostic(
              "owner-policy",
              binding.owner,
              binding.path,
              `declare existing workspace command ${binding.command}`
            ),
          ]
        : []),
    ]),
    ...(HashSet.has(paths, policy.openApi.snapshot.path) &&
    (!HashSet.has(paths, policy.openApi.source.path) ||
      !HashSet.has(paths, policy.openApi.test.path))
      ? [
          diagnostic(
            "generated-source-owner",
            policy.openApi.source.owner,
            policy.openApi.snapshot.path,
            "restore the package-owned OpenAPI source and snapshot test"
          ),
        ]
      : []),
    ...(!HashSet.has(paths, policy.fumadocs.source.path) ||
    !HashSet.has(paths, policy.fumadocs.build.path)
      ? [
          diagnostic(
            "generated-source-owner",
            policy.fumadocs.source.owner,
            policy.fumadocs.generatedRoot,
            "restore Fumadocs source and build ownership"
          ),
        ]
      : []),
  ];
};

const inspectPublicStatus = (
  inspection: DocumentationInspection
): readonly DocumentationDiagnostic[] => {
  const policy = inspection.ownerPolicy;
  const allowedStatuses = HashSet.fromIterable(
    Record.keys(policy.public.statusDecision.statuses)
  );
  const navigation = Array.findFirst(
    inspection.files,
    (file) => file.path === policy.public.navigation.path
  );
  const publicFiles = Array.filter(
    inspection.files,
    (file) =>
      Array.some(policy.public.roots, (root) => isUnder(file.path, root)) &&
      file.path.endsWith(".mdx")
  );
  const statusFor = (file: DocumentationFile): Option.Option<string> =>
    file.path === policy.public.navigation.path
      ? Record.get(
          /"status"\s*:\s*"(?<status>[^"]+)"/u.exec(file.text)?.groups ?? {},
          "status"
        )
      : HashMap.get(metadata(file.text), "status");
  const bindings = Array.reduce(
    policy.public.statusDecision.acceptanceRecords,
    {
      acceptedRecords: HashMap.empty<string, string>(),
      diagnostics: Array.empty<DocumentationDiagnostic>(),
      recordPaths: HashSet.empty<string>(),
    },
    (snapshot, binding) => ({
      acceptedRecords: HashMap.has(snapshot.acceptedRecords, binding.path)
        ? snapshot.acceptedRecords
        : HashMap.set(snapshot.acceptedRecords, binding.path, binding.record),
      diagnostics: [
        ...snapshot.diagnostics,
        ...(HashMap.has(snapshot.acceptedRecords, binding.path)
          ? [
              diagnostic(
                "owner-policy",
                policy.public.statusDecision.owner,
                binding.path,
                "keep exactly one accepted-record binding for each published public path"
              ),
            ]
          : []),
        ...(HashSet.has(snapshot.recordPaths, binding.record)
          ? [
              diagnostic(
                "owner-policy",
                policy.public.statusDecision.owner,
                binding.record,
                "bind each accepted record to exactly one published public path"
              ),
            ]
          : []),
      ],
      recordPaths: HashSet.add(snapshot.recordPaths, binding.record),
    })
  );
  return [
    ...bindings.diagnostics,
    ...Array.flatMap(
      [...publicFiles, ...Option.toArray(navigation)],
      (file) => {
        const status = statusFor(file);
        return [
          ...(Option.exists(status, (value) =>
            HashSet.has(allowedStatuses, value)
          )
            ? []
            : [
                diagnostic(
                  "owner-policy",
                  policy.public.statusDecision.owner,
                  file.path,
                  "use a public status represented by the accepted public lifecycle policy"
                ),
              ]),
          ...(Option.contains(status, "published") &&
          !HashMap.has(bindings.acceptedRecords, file.path)
            ? [
                diagnostic(
                  "owner-policy",
                  policy.public.statusDecision.owner,
                  file.path,
                  "bind this published public path to an addressable accepted record"
                ),
              ]
            : []),
        ];
      }
    ),
    ...Array.flatMap(
      policy.public.statusDecision.acceptanceRecords,
      (binding) => {
        const publicFile = Array.findFirst(
          inspection.files,
          (file) => file.path === binding.path
        );
        const recordFile = Array.findFirst(
          inspection.files,
          (file) => file.path === binding.record
        );
        return [
          ...Option.match(recordFile, {
            onNone: () => [
              diagnostic(
                "owner-policy",
                policy.public.statusDecision.owner,
                binding.record,
                "restore the addressable accepted record or remove its published-path binding"
              ),
            ],
            onSome: () =>
              HashMap.get(
                inspection.acceptanceRecords ??
                  HashMap.empty<string, PublicPageAcceptanceRecord>(),
                binding.record
              ).pipe(
                Option.match({
                  onNone: () => [
                    diagnostic(
                      "owner-policy",
                      policy.public.statusDecision.owner,
                      binding.record,
                      "replace this file with a valid accepted page-level record"
                    ),
                  ],
                  onSome: (acceptanceRecord) =>
                    acceptanceRecord.targetPath === binding.path
                      ? []
                      : [
                          diagnostic(
                            "owner-policy",
                            policy.public.statusDecision.owner,
                            binding.record,
                            `bind the accepted record targetPath exactly to ${binding.path}`
                          ),
                        ],
                })
              ),
          }),
          ...(Option.exists(publicFile, (file) =>
            statusFor(file).pipe(Option.contains("published"))
          )
            ? []
            : [
                diagnostic(
                  "owner-policy",
                  policy.public.statusDecision.owner,
                  binding.path,
                  "remove the stale accepted-record binding or restore the exact published public path"
                ),
              ]),
        ];
      }
    ),
  ];
};

export const inspectDocumentation = (
  inspection: DocumentationInspection
): DocumentationReport => {
  const paths = HashSet.fromIterable(
    Array.map(inspection.files, (file) => file.path)
  );
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
        return HashSet.has(paths, readme)
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
