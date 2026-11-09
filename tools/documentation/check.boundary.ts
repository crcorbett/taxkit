import {
  Match,
  Function as EffectFunction,
  Array,
  Effect,
  HashMap,
  HashSet,
  Option,
  Record,
  Schema,
  Stream,
  Boolean as EffectBoolean,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { DocumentationError, DocumentationInventoryError } from "./errors.js";

const PackageScripts = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.optionalKey(Schema.String),
    scripts: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  })
);
const DocumentInventory = Schema.Array(Schema.NonEmptyString);
export type DocumentationFile = Readonly<{
  path: string;
  text: string;
}>;
export type ScriptOwners = Readonly<{
  root: HashSet.HashSet<string>;
  workspaces: HashMap.HashMap<string, HashSet.HashSet<string>>;
}>;
const markdownLink = /\[[^\]]*\]\((?<target>[^\s)]+)(?:\s+[^)]*)?\)/gu;
const bunRun =
  /\bbun\s+run\s+(?:--filter(?:=|\s+)(?<filter>[^\s`]+)\s+)?(?<command>[A-Za-z0-9:_-]+)/gu;
const code = /```[\s\S]*?```|`[^`\n]*`/gu;
const fence = /```[\s\S]*?```|~~~[\s\S]*?~~~/gu;
const frontMatter = /^---\n[\s\S]*?\n---\n/u;
const heading = /^ {0,3}#{1,6}[ \t]+(?<title>.*?)(?:[ \t]+#+)?[ \t]*$/gmu;
const htmlAnchor = /<[a-z][^>]*\s(?:id|name)="(?<anchor>[^"]+)"/giu;
const decode = Option.liftThrowable(decodeURIComponent);
const group = (match: RegExpMatchArray, name: string): Option.Option<string> =>
  Option.fromNullishOr(match.groups).pipe(
    Option.flatMap((groups) => Record.get(groups, name)),
    Option.flatMap(Option.fromNullishOr)
  );
const directoryOf = (file: string) =>
  EffectBoolean.match(file.includes("/"), {
    onFalse: (): "" => "",
    onTrue: () => file.slice(0, file.lastIndexOf("/")),
  });
const normalise = (relative: string): Option.Option<string> =>
  EffectFunction.pipe(
    relative.split("/"),
    Array.reduce(Option.some<readonly string[]>([]), (parts, segment) =>
      EffectFunction.pipe(
        parts,
        Option.flatMap((current) => {
          if (segment === "" || segment === ".") {
            return Option.some(current);
          }
          if (segment === "..") {
            return Match.value(current.length).pipe(
              Match.when(0, () => Option.none()),
              Match.orElse(() => Option.some(Array.dropRight(current, 1)))
            );
          }
          return decode(segment).pipe(
            Option.map((decoded) => [...current, decoded])
          );
        })
      )
    )
  ).pipe(Option.map((parts) => parts.join("/")));
/**
 * GitHub's heading slug: rendered text in lower case, without punctuation,
 * spaces as hyphens, and a numeric suffix for each repeated heading.
 */
const headingAnchors = (text: string): HashSet.HashSet<string> => {
  const body = text.replace(frontMatter, "").replaceAll(fence, "");
  const slugs = EffectFunction.pipe(
    Array.fromIterable(body.matchAll(heading)),
    Array.map((match) =>
      group(match, "title").pipe(
        Option.getOrElse(() => ""),
        (title) =>
          title
            .replaceAll(/!?\[(?<label>[^\]]*)\]\([^)]*\)/gu, "$<label>")
            .replaceAll(/<[^>]+>/gu, "")
            .toLowerCase()
            .replaceAll(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
            .replaceAll(" ", "-")
      )
    ),
    Array.mapAccum(HashMap.empty<string, number>(), (seen, slug) =>
      Option.match(HashMap.get(seen, slug), {
        onNone: () => [HashMap.set(seen, slug, 1), slug] as const,
        onSome: (count) =>
          [HashMap.set(seen, slug, count + 1), `${slug}-${count}`] as const,
      })
    ),
    ([, unique]) => unique
  );
  const explicit = Array.getSomes(
    EffectFunction.pipe(
      Array.fromIterable(body.matchAll(htmlAnchor)),
      Array.map((match) => group(match, "anchor"))
    )
  );
  return HashSet.fromIterable([...slugs, ...explicit]);
};
type LinkReference = Readonly<{
  raw: string;
  path: string;
  fragment: Option.Option<string>;
}>;
// Relative references in prose. Code samples are not links.
const linkReferences = (file: DocumentationFile): readonly LinkReference[] =>
  Array.getSomes(
    EffectFunction.pipe(
      Array.fromIterable(file.text.replaceAll(code, "").matchAll(markdownLink)),
      Array.map((match) =>
        group(match, "target").pipe(
          Option.filter(
            (target) =>
              target !== "" &&
              target !== "#" &&
              !/^[a-z][a-z0-9+.-]*:/iu.test(target) &&
              !target.startsWith("/")
          ),
          Option.map((raw) => {
            const [path = "", ...rest] = raw.split("#");
            return {
              fragment: Option.liftPredicate(
                rest.join("#"),
                (fragment) => fragment !== ""
              ),
              path,
              raw,
            };
          })
        )
      )
    )
  );
const resolveTarget = (file: DocumentationFile, target: string) => {
  const directory = directoryOf(file.path);
  return Match.value(directory).pipe(
    Match.when("", () => target),
    Match.orElse((matchedValue) => `${matchedValue}/${target}`),
    normalise
  );
};
const filePaths = (file: DocumentationFile): readonly string[] =>
  Array.getSomes(
    EffectFunction.pipe(
      linkReferences(file),
      Array.filter((reference) => reference.path !== ""),
      Array.map((reference) => resolveTarget(file, reference.path))
    )
  );
/**
 * Pure inspection over files the runtime has already read. Each finding names
 * the document and the broken reference so the author can repair it directly.
 * Fragments are checked against the headings of documents in `files`.
 */
export const inspectDocumentation = ({
  files,
  exists,
  scripts,
}: Readonly<{
  files: readonly DocumentationFile[];
  exists: (repositoryPath: string) => boolean;
  scripts: ScriptOwners;
}>): readonly string[] => {
  const anchors = HashMap.fromIterable(
    EffectFunction.pipe(
      files,
      Array.map((file) => [file.path, headingAnchors(file.text)] as const)
    )
  );
  const anchorFinding = (
    file: DocumentationFile,
    reference: LinkReference,
    target: string
  ): Option.Option<string> =>
    reference.fragment.pipe(
      Option.flatMap((fragment) =>
        HashMap.get(anchors, target).pipe(
          Option.flatMap((known) =>
            EffectBoolean.match(
              decode(fragment).pipe(
                Option.exists((decoded) =>
                  HashSet.has(known, decoded.toLowerCase())
                )
              ),
              {
                onFalse: () =>
                  Option.some(`${file.path}: broken anchor: ${reference.raw}`),
                onTrue: () => Option.none(),
              }
            )
          )
        )
      )
    );
  return EffectFunction.pipe(
    files,
    Array.flatMap((file) => {
      const links = Array.getSomes(
        EffectFunction.pipe(
          linkReferences(file),
          Array.map((reference) =>
            Match.value(reference.path).pipe(
              Match.when("", () => anchorFinding(file, reference, file.path)),
              Match.orElse((target) =>
                Option.match(resolveTarget(file, target), {
                  onNone: () =>
                    Option.some(
                      `${file.path}: link leaves the repository: ${reference.raw}`
                    ),
                  onSome: (candidate) =>
                    EffectBoolean.match(exists(candidate), {
                      onFalse: () =>
                        Option.some(
                          `${file.path}: broken link: ${reference.raw}`
                        ),
                      onTrue: () => anchorFinding(file, reference, candidate),
                    }),
                })
              )
            )
          )
        )
      );
      const owned = HashMap.get(scripts.workspaces, directoryOf(file.path));
      const commands = Array.getSomes(
        EffectFunction.pipe(
          Array.fromIterable(file.text.matchAll(bunRun)),
          Array.map((match) => {
            const command = group(match, "command").pipe(
              Option.getOrElse(() => "")
            );
            return Option.match(group(match, "filter"), {
              onNone: () =>
                EffectBoolean.match(
                  HashSet.has(scripts.root, command) ||
                    Option.exists(owned, (names) =>
                      HashSet.has(names, command)
                    ),
                  {
                    onFalse: () =>
                      Option.some(
                        `${file.path}: unknown root command: bun run ${command}`
                      ),
                    onTrue: () => Option.none(),
                  }
                ),
              onSome: (workspace) =>
                Option.match(HashMap.get(scripts.workspaces, workspace), {
                  onNone: () =>
                    Option.some(
                      `${file.path}: unknown workspace: bun run --filter=${workspace} ${command}`
                    ),
                  onSome: (names) =>
                    EffectBoolean.match(HashSet.has(names, command), {
                      onFalse: () =>
                        Option.some(
                          `${file.path}: unknown command: bun run --filter=${workspace} ${command}`
                        ),
                      onTrue: () => Option.none(),
                    }),
                }),
            });
          })
        )
      );
      return [...links, ...commands];
    })
  );
};
/**
 * Every tracked or new Markdown document except release notes, which are
 * generated from Changesets.
 */
export const isDocumentation = (file: string): boolean =>
  file.endsWith(".md") &&
  !file.startsWith(".changeset/") &&
  !Option.contains(Array.last(file.split("/")), "CHANGELOG.md");
const workspaceRoots = [
  "apps",
  "content",
  "packages",
  "packages/api",
  "packages/sdk",
  "packages/rules/au",
] as const;
export const checkDocumentation = Effect.fn("Documentation.check")(function* ({
  repositoryRoot,
}: {
  readonly repositoryRoot: string;
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
  const readScripts = (manifest: string) =>
    fs.readFileString(manifest).pipe(
      Effect.flatMap(Schema.decodeEffect(PackageScripts)),
      Effect.map((decoded) => ({
        name: Option.fromNullishOr(decoded.name),
        scripts: HashSet.fromIterable(Record.keys(decoded.scripts ?? {})),
      }))
    );
  const root = yield* EffectFunction.pipe(
    path.join(repositoryRoot, "package.json"),
    readScripts
  );
  const workspaceDirectories = yield* EffectFunction.pipe(
    workspaceRoots,
    Effect.forEach((parent) =>
      fs
        .readDirectory(path.join(repositoryRoot, parent))
        .pipe(Effect.map(Array.map((entry) => `${parent}/${entry}`)))
    )
  ).pipe(Effect.map(Array.flatten));
  const workspaces = yield* EffectFunction.pipe(
    workspaceDirectories,
    Effect.filter((directory) =>
      fs.exists(path.join(repositoryRoot, directory, "package.json"))
    )
  );
  const manifests = yield* EffectFunction.pipe(
    workspaces,
    Effect.forEach((directory) =>
      EffectFunction.pipe(
        path.join(repositoryRoot, directory, "package.json"),
        readScripts
      ).pipe(Effect.map((manifest) => ({ directory, manifest })))
    )
  );
  const listed = yield* Effect.gen(function* listDocuments() {
    const handle = yield* childProcesses.spawn(
      ChildProcess.make(
        "git",
        [
          "ls-files",
          "-z",
          "--cached",
          "--others",
          "--exclude-standard",
          "--",
          "*.md",
        ],
        {
          cwd: repositoryRoot,
          extendEnv: true,
          forceKillAfter: "2 seconds",
          stderr: "pipe",
          stdin: "ignore",
          stdout: "pipe",
        }
      )
    );
    const [stdout, [exitCode]] = yield* Effect.all(
      [
        Stream.runCollect(Stream.decodeText(handle.stdout)),
        Effect.zip(handle.exitCode, Stream.runDrain(handle.stderr), {
          concurrent: true,
        }),
      ],
      { concurrency: "unbounded" }
    );
    yield* Match.value(Number(exitCode)).pipe(
      Match.when(0, () => Effect.void),
      Match.orElse((failed) =>
        Effect.fail(
          new DocumentationInventoryError({
            exitCode: failed,
            operation: "list-documents",
          })
        )
      )
    );
    return yield* EffectFunction.pipe(
      stdout.join("").split("\0"),
      Array.filter((file) => file.length > 0),
      Schema.decodeEffect(DocumentInventory),
      Effect.mapError(
        () => new DocumentationInventoryError({ operation: "decode-documents" })
      )
    );
  }).pipe(
    Effect.scoped,
    Effect.catchTag("PlatformError", () =>
      Effect.fail(
        new DocumentationInventoryError({ operation: "list-documents" })
      )
    )
  );
  // A tracked file deleted in the working tree is no longer documentation.
  const documents = yield* EffectFunction.pipe(
    listed,
    Array.filter(isDocumentation),
    Array.dedupe,
    Effect.filter((file) => fs.exists(path.join(repositoryRoot, file)))
  );
  const files = yield* EffectFunction.pipe(
    documents,
    Effect.forEach((file) =>
      fs
        .readFileString(path.join(repositoryRoot, file))
        .pipe(Effect.map((text) => ({ path: file, text })))
    )
  );
  const existing = yield* Effect.forEach(
    EffectFunction.pipe(files, Array.flatMap(filePaths), HashSet.fromIterable),
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
        EffectFunction.pipe(
          manifests,
          Array.flatMap(({ directory, manifest }) => [
            [directory, manifest.scripts] as const,
            ...Option.match(manifest.name, {
              onNone: () => [],
              onSome: (name) => [[name, manifest.scripts] as const],
            }),
          ])
        )
      ),
    },
  });
  if (findings.length > 0) {
    return yield* new DocumentationError({ findings });
  }
  return files.length;
});
