import {
  Array,
  Effect,
  Equivalence,
  FileSystem,
  Match,
  Option,
  Stream,
} from "effect";
import { ChildProcess } from "effect/process";

import { DocsSourceError } from "../errors.js";
import type { DocsPublicLinkProfile } from "../public-links.schema.js";
import { DocsSourcePath, DocsValidationIssue } from "../schemas.js";
import type { DocsContentPage } from "../schemas.js";
import {
  checkedExampleFiles,
  checkedSnippetBindings,
  validateCheckedSnippet,
} from "./checked-snippets.js";

// Build-only source acquisition. Git reads the selected immutable object, never
// a branch name or the network. Exit status and complete bytes are both checked.
export const readCheckedExampleSnapshot = (
  repositoryRoot: string,
  profile: DocsPublicLinkProfile
) =>
  Effect.forEach(checkedExampleFiles, (example) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const repositoryPath = example.startsWith("../test/")
        ? `packages/docs-examples/test/${example.slice("../test/".length)}`
        : `packages/docs-examples/src/${example}`;
      const checked = yield* fs.readFile(`${repositoryRoot}/${repositoryPath}`);
      const handle = yield* ChildProcess.make(
        "git",
        ["show", `${profile.checkedExampleRevision}:${repositoryPath}`],
        {
          cwd: repositoryRoot,
          forceKillAfter: "2 seconds",
          stderr: "ignore",
          stdin: "ignore",
          stdout: "pipe",
        }
      );
      const [bytes, exitCode] = yield* Effect.all(
        [Stream.runCollect(handle.stdout), handle.exitCode],
        { concurrency: "unbounded" }
      );
      yield* Match.value(Number(exitCode)).pipe(
        Match.when(0, () => Effect.void),
        Match.orElse(() =>
          Effect.fail(
            new DocsSourceError({
              message:
                "The accepted checked-example Git snapshot is unavailable.",
              operation: "read",
            })
          )
        )
      );
      const acceptedBytes = Array.flatMap(bytes, Array.fromIterable);
      if (
        !Array.makeEquivalence(Equivalence.Number)(
          Array.fromIterable(checked),
          acceptedBytes
        )
      ) {
        return yield* Effect.fail(
          new DocsSourceError({
            message:
              "A checked example differs from its accepted immutable source snapshot.",
            operation: "decode",
          })
        );
      }
      const source = yield* Effect.try({
        catch: () =>
          new DocsSourceError({
            message: "The accepted checked-example Git snapshot is invalid.",
            operation: "decode",
          }),
        try: () =>
          new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
            Uint8Array.from(acceptedBytes)
          ),
      });
      return { example, repositoryPath, source };
    }).pipe(
      Effect.scoped,
      Effect.catchTag("PlatformError", () =>
        Effect.fail(
          new DocsSourceError({
            message: "The checked-example source snapshot could not be read.",
            operation: "read",
          })
        )
      )
    )
  );

type CheckedExampleSnapshot = Effect.Success<
  ReturnType<typeof readCheckedExampleSnapshot>
>;

// These pages already passed compiler ingress. Check their emitted Markdown,
// so the guide fence and public URL describe the exact accepted source bytes.
export const validateCheckedExamplePublication = (
  pages: readonly DocsContentPage[],
  snapshot: CheckedExampleSnapshot,
  profile: DocsPublicLinkProfile
): readonly DocsValidationIssue[] => [
  ...Array.flatMap(checkedSnippetBindings, (binding) =>
    Option.all({
      example: Array.findFirst(
        snapshot,
        (entry) => entry.example === binding.example
      ),
      page: Array.findFirst(pages, (page) => page.source === binding.page),
    }).pipe(
      Option.match({
        onNone: () =>
          Array.of(
            new DocsValidationIssue({
              message: "The checked example publication input is missing.",
              path: [binding.page, "checked-snippet"],
            })
          ),
        onSome: ({ example, page }) =>
          validateCheckedSnippet(binding.page, page.markdown, example.source),
      })
    )
  ),
  ...Array.flatMap(snapshot, (example) => {
    const referenceSource = DocsSourcePath.make(
      "content/reference/examples.mdx"
    );
    const expected = `${profile.repositoryUrl.href}/blob/${profile.checkedExampleRevision}/${example.repositoryPath}`;
    return Array.findFirst(
      pages,
      (page) => page.source === referenceSource
    ).pipe(
      Option.filter((page) => page.markdown.includes(`](${expected})`)),
      Option.match({
        onNone: () =>
          Array.of(
            new DocsValidationIssue({
              message:
                "The emitted example link does not select its accepted immutable source snapshot.",
              path: [referenceSource, example.repositoryPath],
            })
          ),
        onSome: () => Array.empty<DocsValidationIssue>(),
      })
    );
  }),
];
