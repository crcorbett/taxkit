import { fileURLToPath } from "node:url";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import { compile } from "@mdx-js/mdx";
import {
  Array,
  Cause,
  Effect,
  FileSystem,
  Option,
  Schema,
  Stream,
} from "effect";
import { ChildProcess } from "effect/process";
import { remarkLLMs } from "fumadocs-core/mdx-plugins/remark-llms";

import { getNavigation } from "../navigation.js";
import { remarkPublicDocsLinks } from "../public-links.boundary.js";
import { docsPublicLinkProfile } from "../public-links.profile.js";
import { DocsRepositoryRevision } from "../public-links.schema.js";
import { DocsContentPage, DocsPagePath, DocsSourcePath } from "../schemas.js";
import {
  readCheckedExampleSnapshot,
  validateCheckedExamplePublication,
} from "./checked-example-publication.boundary.js";
import { checkedSnippetBindings } from "./checked-snippets.js";
import { remarkMdxComponentPolicy } from "./mdx-component-policy.js";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const contentRoot = new URL("../../content/", import.meta.url);
const referenceSource = DocsSourcePath.make("content/reference/examples.mdx");

const emittedPublication = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const navigation = yield* getNavigation;
  return yield* Effect.forEach(
    [
      ...Array.map(checkedSnippetBindings, (binding) => binding.page),
      referenceSource,
    ],
    (source) =>
      Effect.gen(function* () {
        const path = `${repositoryRoot}/packages/docs-content/${source}`;
        const value = yield* fs.readFileString(path);
        // This is Fumadocs' actual processed-Markdown emitter, after the same
        // parsed-link and component policies used by source.config.ts.
        const compiled = yield* Effect.tryPromise({
          catch: (cause) =>
            new Cause.UnknownError(
              cause,
              "Compiler publication fixture failed."
            ),
          try: () =>
            compile(
              { path, value },
              {
                remarkPlugins: [
                  [
                    remarkPublicDocsLinks,
                    {
                      contentRoot,
                      navigation,
                      profile: docsPublicLinkProfile,
                      repositoryRoot: new URL("../../../../", import.meta.url),
                    },
                  ],
                  remarkMdxComponentPolicy,
                  [remarkLLMs, { _data: true }],
                ],
              }
            ),
        });
        const { markdown } = yield* Schema.decodeUnknownEffect(
          Schema.Struct({ markdown: Schema.String })
        )(compiled.data);
        return DocsContentPage.make({
          frontmatter: {
            description: "Publication fixture.",
            status: "published",
            title: "Fixture",
          },
          markdown,
          path: DocsPagePath.make(`/${source}`),
          slugs: [],
          source,
        });
      })
  );
});

describe("checked-example immutable publication", () => {
  it.effect(
    "loads the compiler config in its native Node host without a source loader",
    () =>
      Effect.gen(function* () {
        const handle = yield* ChildProcess.make(
          "node",
          [
            "--input-type=module",
            "--eval",
            "await import(process.argv[1])",
            new URL("../../source.config.ts", import.meta.url).href,
          ],
          {
            cwd: repositoryRoot,
            env: { NODE_OPTIONS: "" },
            extendEnv: true,
            forceKillAfter: "2 seconds",
            stderr: "pipe",
            stdin: "ignore",
            stdout: "ignore",
          }
        );
        const [exitCode, diagnostics] = yield* Effect.all(
          [
            handle.exitCode,
            Stream.mkString(handle.stderr.pipe(Stream.decodeText())),
          ],
          { concurrency: "unbounded" }
        );
        expect(Number(exitCode), diagnostics).toBe(0);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer))
  );

  it.effect(
    "ties actual emitted guide fences and links to the checked Git bytes",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* readCheckedExampleSnapshot(
          repositoryRoot,
          docsPublicLinkProfile
        );
        const pages = yield* emittedPublication;
        expect(snapshot).toHaveLength(9);
        expect(
          validateCheckedExamplePublication(
            pages,
            snapshot,
            docsPublicLinkProfile
          )
        ).toEqual([]);
        const reference = Array.findFirst(
          pages,
          (page) => page.source === referenceSource
        ).pipe(
          Option.getOrElse(() => expect.fail("Expected examples reference"))
        );
        expect(reference.markdown).toContain(
          `/blob/${docsPublicLinkProfile.checkedExampleRevision}/packages/docs-examples/src/browser-http.ts`
        );
        expect(reference.markdown).not.toContain(
          `/blob/${docsPublicLinkProfile.repositoryRevision}/packages/docs-examples/src/browser-http.ts`
        );
      }).pipe(Effect.provide(NodeServices.layer))
  );

  it.effect(
    "rejects changed checked bytes while the accepted Git pin stays fixed",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const error = yield* readCheckedExampleSnapshot(
          repositoryRoot,
          docsPublicLinkProfile
        ).pipe(
          Effect.provideService(
            FileSystem.FileSystem,
            FileSystem.makeNoop({
              readFile: (path) =>
                fs
                  .readFile(path)
                  .pipe(Effect.map((bytes) => Uint8Array.from([...bytes, 10]))),
            })
          ),
          Effect.flip
        );
        expect(error.message).toBe(
          "A checked example differs from its accepted immutable source snapshot."
        );
      }).pipe(Effect.provide(NodeServices.layer))
  );

  it.effect("rejects missing Git snapshots with a fixed safe failure", () =>
    Effect.gen(function* () {
      const error = yield* readCheckedExampleSnapshot(repositoryRoot, {
        ...docsPublicLinkProfile,
        checkedExampleRevision: DocsRepositoryRevision.make(
          "0000000000000000000000000000000000000000"
        ),
      }).pipe(Effect.flip);
      expect(error.message).toBe(
        "The accepted checked-example Git snapshot is unavailable."
      );
    }).pipe(Effect.provide(NodeServices.layer))
  );

  it.effect(
    "rejects emitted fence drift and an emitted historical example URL",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* readCheckedExampleSnapshot(
          repositoryRoot,
          docsPublicLinkProfile
        );
        const pages = yield* emittedPublication;
        const changed = Array.map(pages, (page) => ({
          ...page,
          markdown:
            page.source === referenceSource
              ? page.markdown.replaceAll(
                  docsPublicLinkProfile.checkedExampleRevision,
                  docsPublicLinkProfile.repositoryRevision
                )
              : "```ts\nconst changed = true;\n```",
        }));
        const issues = validateCheckedExamplePublication(
          changed,
          snapshot,
          docsPublicLinkProfile
        );
        expect(issues).toHaveLength(
          checkedSnippetBindings.length + snapshot.length
        );
      }).pipe(Effect.provide(NodeServices.layer))
  );
});
