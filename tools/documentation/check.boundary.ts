import {
  Array,
  Effect,
  HashMap,
  HashSet,
  Option,
  Record,
  Schema,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { DocumentationError } from "./errors.js";

const PackageScripts = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.optionalKey(Schema.String),
    scripts: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  })
);

export type DocumentationFile = Readonly<{ path: string; text: string }>;
export type ScriptOwners = Readonly<{
  root: HashSet.HashSet<string>;
  workspaces: HashMap.HashMap<string, HashSet.HashSet<string>>;
}>;

const markdownLink = /\[[^\]]*\]\((?<target>[^\s)]+)(?:\s+[^)]*)?\)/gu;
const bunRun =
  /\bbun\s+run\s+(?:--filter(?:=|\s+)(?<filter>[^\s`]+)\s+)?(?<command>[A-Za-z0-9:_-]+)/gu;
const code = /```[\s\S]*?```|`[^`\n]*`/gu;

const group = (match: RegExpMatchArray, name: string): Option.Option<string> =>
  Option.fromNullishOr(match.groups).pipe(
    Option.flatMap((groups) => Record.get(groups, name)),
    Option.flatMap(Option.fromNullishOr)
  );

const directoryOf = (file: string) =>
  file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "";

const normalise = (relative: string): Option.Option<string> =>
  Array.reduce(
    relative.split("/"),
    Option.some<readonly string[]>([]),
    (parts, segment) =>
      Option.flatMap(parts, (current) => {
        if (segment === "" || segment === ".") {
          return Option.some(current);
        }
        if (segment === "..") {
          return current.length === 0
            ? Option.none()
            : Option.some(Array.dropRight(current, 1));
        }
        return Option.some([...current, decodeURIComponent(segment)]);
      })
  ).pipe(Option.map((parts) => parts.join("/")));

// Fragment-free relative targets in prose. Code samples are not links.
const linkTargets = (file: DocumentationFile): readonly string[] =>
  Array.getSomes(
    Array.map(
      Array.fromIterable(file.text.replaceAll(code, "").matchAll(markdownLink)),
      (match) =>
        group(match, "target").pipe(
          Option.map((target) => target.split("#", 1).join("")),
          Option.filter(
            (target) =>
              target !== "" &&
              !/^[a-z][a-z0-9+.-]*:/iu.test(target) &&
              !target.startsWith("/")
          )
        )
    )
  );

const resolveTarget = (file: DocumentationFile, target: string) => {
  const directory = directoryOf(file.path);
  return normalise(directory === "" ? target : `${directory}/${target}`);
};

/**
 * Pure inspection over files the runtime has already read. Each finding names
 * the document and the broken reference so the author can repair it directly.
 */
export const inspectDocumentation = ({
  files,
  exists,
  scripts,
}: Readonly<{
  files: readonly DocumentationFile[];
  exists: (repositoryPath: string) => boolean;
  scripts: ScriptOwners;
}>): readonly string[] =>
  Array.flatMap(files, (file) => {
    const links = Array.getSomes(
      Array.map(linkTargets(file), (target) =>
        Option.match(resolveTarget(file, target), {
          onNone: () =>
            Option.some(`${file.path}: link leaves the repository: ${target}`),
          onSome: (candidate) =>
            exists(candidate)
              ? Option.none()
              : Option.some(`${file.path}: broken link: ${target}`),
        })
      )
    );
    const owned = HashMap.get(scripts.workspaces, directoryOf(file.path));
    const commands = Array.getSomes(
      Array.map(Array.fromIterable(file.text.matchAll(bunRun)), (match) => {
        const command = group(match, "command").pipe(
          Option.getOrElse(() => "")
        );
        return Option.match(group(match, "filter"), {
          onNone: () =>
            HashSet.has(scripts.root, command) ||
            Option.exists(owned, (names) => HashSet.has(names, command))
              ? Option.none()
              : Option.some(
                  `${file.path}: unknown root command: bun run ${command}`
                ),
          onSome: (workspace) =>
            Option.match(HashMap.get(scripts.workspaces, workspace), {
              // Glob and path filters are not checked here.
              onNone: () => Option.none(),
              onSome: (names) =>
                HashSet.has(names, command)
                  ? Option.none()
                  : Option.some(
                      `${file.path}: unknown command: bun run --filter=${workspace} ${command}`
                    ),
            }),
        });
      })
    );
    return [...links, ...commands];
  });

const workspaceRoots = [
  "apps",
  "packages",
  "packages/api",
  "packages/sdk",
  "packages/rules/au",
] as const;

export const checkDocumentation = Effect.fn("Documentation.check")(function* (
  repositoryRoot: string
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const readScripts = (manifest: string) =>
    fs.readFileString(manifest).pipe(
      Effect.flatMap(Schema.decodeEffect(PackageScripts)),
      Effect.map((decoded) => ({
        name: Option.fromNullishOr(decoded.name),
        scripts: HashSet.fromIterable(Record.keys(decoded.scripts ?? {})),
      }))
    );
  const root = yield* readScripts(path.join(repositoryRoot, "package.json"));
  const workspaceDirectories = yield* Effect.forEach(workspaceRoots, (parent) =>
    fs
      .readDirectory(path.join(repositoryRoot, parent))
      .pipe(Effect.map(Array.map((entry) => `${parent}/${entry}`)))
  ).pipe(Effect.map(Array.flatten));
  const workspaces = yield* Effect.filter(workspaceDirectories, (directory) =>
    fs.exists(path.join(repositoryRoot, directory, "package.json"))
  );
  const manifests = yield* Effect.forEach(workspaces, (directory) =>
    readScripts(path.join(repositoryRoot, directory, "package.json")).pipe(
      Effect.map((manifest) => ({ directory, manifest }))
    )
  );
  const docs = yield* fs
    .readDirectory(path.join(repositoryRoot, "docs"), { recursive: true })
    .pipe(
      Effect.map((entries) =>
        Array.map(
          Array.filter(entries, (entry) => entry.endsWith(".md")),
          (entry) => `docs/${entry}`
        )
      )
    );
  const readmes = yield* Effect.filter(
    Array.map(workspaces, (directory) => `${directory}/README.md`),
    (readme) => fs.exists(path.join(repositoryRoot, readme))
  );
  const files = yield* Effect.forEach(
    ["AGENTS.md", "ARCHITECTURE.md", "README.md", ...docs, ...readmes],
    (file) =>
      fs
        .readFileString(path.join(repositoryRoot, file))
        .pipe(Effect.map((text) => ({ path: file, text })))
  );
  const existing = yield* Effect.forEach(
    HashSet.fromIterable(
      Array.flatMap(files, (file) =>
        Array.getSomes(
          Array.map(linkTargets(file), (target) => resolveTarget(file, target))
        )
      )
    ),
    (candidate) =>
      fs
        .exists(path.join(repositoryRoot, candidate))
        .pipe(Effect.map((found) => [candidate, found] as const))
  ).pipe(Effect.map(HashMap.fromIterable));
  const findings = inspectDocumentation({
    exists: (candidate) =>
      HashMap.get(existing, candidate).pipe(Option.getOrElse(() => false)),
    files,
    scripts: {
      root: root.scripts,
      workspaces: HashMap.fromIterable(
        Array.flatMap(manifests, ({ directory, manifest }) => [
          [directory, manifest.scripts] as const,
          ...Option.match(manifest.name, {
            onNone: () => [],
            onSome: (name) => [[name, manifest.scripts] as const],
          }),
        ])
      ),
    },
  });
  if (findings.length > 0) {
    return yield* new DocumentationError({ findings });
  }
  return files.length;
});
