import nodePath from "node:path";

import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import {
  Array as EffectArray,
  Effect,
  FileSystem,
  HashSet,
  Match,
  Option,
  Order,
  Record,
  Schema,
} from "effect";
import type { Effect as EffectType } from "effect";
import { parse as parseYaml } from "yaml";

import { DocsSourceError } from "../errors.js";
import { getNavigation } from "../navigation.js";
import {
  DocsPageFrontmatter,
  DocsSourcePath,
  DocsValidationIssue,
} from "../schemas.js";
import type {
  DocsNavigation,
  DocsNavigationLeaf,
  DocsValidationResult,
} from "../schemas.js";
import { validateMdxComponentPolicy } from "./mdx-component-policy.js";

const { join, resolve } = nodePath;
const docsRoot = "packages/docs-content";
const contentRoot = "packages/docs-content/content";
const examplesRoot = "packages/docs-examples/src";
const navigationSource = "packages/docs-content/navigation.json";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const absoluteDocsRoot = join(repoRoot, docsRoot);
const absoluteContentRoot = join(repoRoot, contentRoot);
const absoluteExamplesRoot = join(repoRoot, examplesRoot);

const bannedPattern =
  /\b(?:easy|simple|simply|just|seamless|seamlessly|powerful|effortless|beautiful|magical|unlock|leverage|utilise|streamline)\b/iu;
const staleNamePattern =
  /\b(?:calculateRequest|createEffectClient|PublicCalculationMetadata|PublicErrorEnvelope|PublicCalculationMetadataGroup|PublicCalculationMetadataHandlerLive)\b/u;
const privateNamePattern =
  /\b(?:adad|SaaS|paid|simulation|private downstream product|private product strategy)\b/iu;
const relativeLinkPattern = /\[[^\]]+\]\((?<target>[^)]+)\)/gu;
const frontmatterPattern = /^---\n(?<body>[\s\S]*?)\n---/u;
const exampleFileNames = [
  "browser-http.ts",
  "effect.ts",
  "error-handling.ts",
  "node-server.ts",
] as const;

const exampleReferenceSource = DocsSourcePath.make(
  "content/reference/examples.mdx"
);
const openApiReferenceSource = DocsSourcePath.make(
  "content/api/openapi-reference.mdx"
);

const openApiReferenceRequiredText = [
  "/api/docs/openapi.json",
  "/api/v1/calculators/{calculatorId}/calculate",
  "Accepted exclusion",
] as const;

const examplesReferenceRequiredText = [
  "../../../docs-examples/src/browser-http.ts",
  "../../../docs-examples/src/effect.ts",
  "../../../docs-examples/src/error-handling.ts",
  "../../../docs-examples/src/node-server.ts",
  "bun run --filter=@taxkit/docs-examples check-examples",
] as const;

const contentSourcePath = (path: string) =>
  Schema.decodeUnknownEffect(DocsSourcePath)(`content/${path}`);

const sourceError = (source?: DocsSourcePath) =>
  Option.fromUndefinedOr(source).pipe(
    Option.match({
      onNone: () =>
        new DocsSourceError({
          message: "The docs source could not be read.",
          operation: "read",
        }),
      onSome: (value) =>
        new DocsSourceError({
          message: "The docs source could not be read.",
          operation: "read",
          source: value,
        }),
    })
  );

const readText = (path: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;

    return yield* fileSystem.readFileString(path);
  }).pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.mapError(() => sourceError())
  );

const fileExists = (path: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;

    return yield* fileSystem.exists(path);
  }).pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.match({
      onFailure: () => false,
      onSuccess: (exists) => exists,
    })
  );

const sourceExists = (source: DocsSourcePath) =>
  fileExists(join(absoluteDocsRoot, source.replace(/^content\//u, "content/")));

const frontmatterIssue = (source: DocsSourcePath, message: string) =>
  EffectArray.of(
    new DocsValidationIssue({
      message,
      path: [source, "frontmatter"],
    })
  );

const parseFrontmatterBody = (source: DocsSourcePath, body: string) =>
  Effect.try({
    catch: (cause) => frontmatterIssue(source, String(cause)),
    try: () => parseYaml(body),
  });

const decodeFrontmatter = (
  source: DocsSourcePath,
  markdown: string
): EffectType.Effect<DocsPageFrontmatter, readonly DocsValidationIssue[]> =>
  Option.fromNullishOr(frontmatterPattern.exec(markdown)).pipe(
    Option.match({
      onNone: () =>
        Effect.fail(
          EffectArray.of(
            new DocsValidationIssue({
              message: "missing frontmatter",
              path: [source],
            })
          )
        ),
      onSome: (match) =>
        Record.get(match.groups ?? {}, "body").pipe(
          Option.match({
            onNone: () =>
              Effect.fail(
                EffectArray.of(
                  new DocsValidationIssue({
                    message: "missing frontmatter",
                    path: [source],
                  })
                )
              ),
            onSome: (body) =>
              parseFrontmatterBody(source, body).pipe(
                Effect.flatMap((candidate) =>
                  Schema.decodeUnknownEffect(DocsPageFrontmatter)(
                    candidate
                  ).pipe(
                    Effect.mapError((error) =>
                      frontmatterIssue(source, error.message)
                    )
                  )
                )
              ),
          })
        ),
    })
  );

const checkPattern = (
  source: DocsSourcePath,
  markdown: string,
  pattern: RegExp,
  label: string
) =>
  Option.fromNullishOr(markdown.match(pattern)).pipe(
    Option.match({
      onNone: () => EffectArray.empty<DocsValidationIssue>(),
      onSome: (match) =>
        EffectArray.of(
          new DocsValidationIssue({
            message: `${label}: ${EffectArray.head(match).pipe(Option.getOrElse(() => ""))}`,
            path: [source],
          })
        ),
    })
  );

const validateTextPolicy = (source: DocsSourcePath, markdown: string) =>
  EffectArray.flatten(
    EffectArray.map(
      [
        [bannedPattern, "banned marketing language"] as const,
        [staleNamePattern, "stale public API or SDK name"] as const,
        [privateNamePattern, "private downstream product detail"] as const,
      ],
      ([pattern, label]) => checkPattern(source, markdown, pattern, label)
    )
  );

const validateFenceBalance = (source: DocsSourcePath, markdown: string) =>
  Match.value(
    Option.fromNullishOr(markdown.match(/```/gu)).pipe(
      Option.map((matches) => matches.length),
      Option.getOrElse(() => 0)
    ) % 2
  ).pipe(
    Match.when(0, () => EffectArray.empty<DocsValidationIssue>()),
    Match.orElse(() =>
      EffectArray.of(
        new DocsValidationIssue({
          message: "unbalanced fenced code blocks",
          path: [source],
        })
      )
    )
  );

const missingTextIssue = (
  source: DocsSourcePath,
  label: string,
  text: string
) =>
  new DocsValidationIssue({
    message: `${label} missing required text: ${text}`,
    path: [source],
  });

const missingFileIssue = (source: DocsSourcePath, path: string) =>
  new DocsValidationIssue({
    message: `referenced file missing: ${path}`,
    path: [source],
  });

const validateRequiredText = (
  source: DocsSourcePath,
  markdown: string,
  label: string,
  requiredText: readonly string[]
) =>
  EffectArray.flatMap(requiredText, (text) =>
    markdown.includes(text)
      ? EffectArray.empty<DocsValidationIssue>()
      : EffectArray.of(missingTextIssue(source, label, text))
  );

const validateLocalLinkTarget = (
  source: DocsSourcePath,
  absolutePath: string,
  target: string
) =>
  Match.value(target).pipe(
    Match.when(
      (value) =>
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("mailto:") ||
        value.startsWith("#"),
      () => Effect.succeed(EffectArray.empty<DocsValidationIssue>())
    ),
    Match.orElse((value) =>
      EffectArray.head(value.split("#")).pipe(
        Option.filter((withoutAnchor) => withoutAnchor.length > 0),
        Option.match({
          onNone: () =>
            Effect.succeed(EffectArray.empty<DocsValidationIssue>()),
          onSome: (withoutAnchor) =>
            fileExists(resolve(absolutePath, "..", withoutAnchor)).pipe(
              Effect.map((exists) =>
                Match.value(exists).pipe(
                  Match.when(true, () =>
                    EffectArray.empty<DocsValidationIssue>()
                  ),
                  Match.orElse(() =>
                    EffectArray.of(
                      new DocsValidationIssue({
                        message: `broken local link: ${target}`,
                        path: [source],
                      })
                    )
                  )
                )
              )
            ),
        })
      )
    )
  );

const validateLocalLinks = (source: DocsSourcePath, absolutePath: string) =>
  readText(absolutePath).pipe(
    Effect.flatMap((markdown) =>
      Effect.forEach(
        EffectArray.fromIterable(markdown.matchAll(relativeLinkPattern)),
        (match) =>
          Record.get(match.groups ?? {}, "target").pipe(
            Option.match({
              onNone: () =>
                Effect.succeed(EffectArray.empty<DocsValidationIssue>()),
              onSome: (target) =>
                validateLocalLinkTarget(source, absolutePath, target),
            })
          )
      )
    ),
    Effect.map(EffectArray.flatten)
  );

const collectMdxPaths = (
  directory: string
): EffectType.Effect<readonly string[], DocsSourceError> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;

    return yield* fileSystem.readDirectory(directory, { recursive: true });
  }).pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.map((paths) =>
      EffectArray.filter(paths, (path) => path.endsWith(".mdx"))
    ),
    Effect.mapError(() => sourceError())
  );

const listMdxSources: EffectType.Effect<
  readonly DocsSourcePath[],
  DocsSourceError
> = collectMdxPaths(absoluteContentRoot).pipe(
  Effect.flatMap((paths) => Effect.forEach(paths, contentSourcePath)),
  Effect.mapError(() => sourceError()),
  Effect.map((paths) => EffectArray.sort(paths, Order.String))
);

export { getNavigation } from "../navigation.js";

const navigationLeaves = (navigation: DocsNavigation) =>
  EffectArray.flatMap(navigation.primaryNavigation, (section) => [
    section,
    ...Option.fromNullishOr(section.pages).pipe(
      Option.getOrElse(() => EffectArray.empty<DocsNavigationLeaf>())
    ),
  ]);

const navigationSourceSet = (navigation: DocsNavigation) =>
  HashSet.fromIterable(
    EffectArray.map(navigationLeaves(navigation), (leaf) => leaf.source)
  );

const missingNavigationIssue = (source: DocsSourcePath) =>
  new DocsValidationIssue({
    message: `content source missing from navigation: ${source}`,
    path: [source],
  });

const validateNavigationCoversSources = (
  navigation: DocsNavigation,
  sources: readonly DocsSourcePath[]
) =>
  EffectArray.map(
    EffectArray.sort(
      EffectArray.fromIterable(
        HashSet.difference(
          HashSet.fromIterable(sources),
          navigationSourceSet(navigation)
        )
      ),
      Order.String
    ),
    missingNavigationIssue
  );

const validateNavigationSources = (
  navigation: DocsNavigation
): EffectType.Effect<readonly DocsValidationIssue[], DocsSourceError> =>
  Effect.forEach(navigationLeaves(navigation), (item) =>
    sourceExists(item.source).pipe(
      Effect.map((exists) =>
        Match.value(exists).pipe(
          Match.when(true, () => EffectArray.empty<DocsValidationIssue>()),
          Match.orElse(() =>
            EffectArray.of(
              new DocsValidationIssue({
                message: `navigation source missing: ${item.source}`,
                path: [navigationSource],
              })
            )
          )
        )
      )
    )
  ).pipe(Effect.map(EffectArray.flatten));

const validatePage = (
  source: DocsSourcePath
): EffectType.Effect<readonly DocsValidationIssue[], DocsSourceError> => {
  const absolutePath = join(absoluteDocsRoot, source);

  return readText(absolutePath).pipe(
    Effect.flatMap((markdown) =>
      decodeFrontmatter(source, markdown).pipe(
        Effect.matchEffect({
          onFailure: (frontmatterIssues) =>
            Effect.all({
              componentIssues: validateMdxComponentPolicy(source, markdown),
              linkIssues: validateLocalLinks(source, absolutePath),
            }).pipe(
              Effect.map(({ componentIssues, linkIssues }) => [
                ...frontmatterIssues,
                ...validateTextPolicy(source, markdown),
                ...validateFenceBalance(source, markdown),
                ...componentIssues,
                ...linkIssues,
              ])
            ),
          onSuccess: () =>
            Effect.all({
              componentIssues: validateMdxComponentPolicy(source, markdown),
              linkIssues: validateLocalLinks(source, absolutePath),
            }).pipe(
              Effect.map(({ componentIssues, linkIssues }) => [
                ...validateTextPolicy(source, markdown),
                ...validateFenceBalance(source, markdown),
                ...componentIssues,
                ...linkIssues,
              ])
            ),
        })
      )
    )
  );
};

const validateExamplesReference = (
  source: DocsSourcePath
): EffectType.Effect<readonly DocsValidationIssue[], DocsSourceError> =>
  readText(join(absoluteDocsRoot, source)).pipe(
    Effect.flatMap((markdown) =>
      Effect.forEach(exampleFileNames, (fileName) =>
        fileExists(join(absoluteExamplesRoot, fileName)).pipe(
          Effect.map((exists) =>
            Match.value(exists).pipe(
              Match.when(true, () => EffectArray.empty<DocsValidationIssue>()),
              Match.orElse(() =>
                EffectArray.of(
                  missingFileIssue(source, `${examplesRoot}/${fileName}`)
                )
              )
            )
          )
        )
      ).pipe(
        Effect.map((fileIssues) =>
          EffectArray.flatten([
            ...fileIssues,
            validateRequiredText(
              source,
              markdown,
              "examples reference",
              examplesReferenceRequiredText
            ),
          ])
        )
      )
    )
  );

const validateOpenApiReference = (
  source: DocsSourcePath
): EffectType.Effect<readonly DocsValidationIssue[], DocsSourceError> =>
  readText(join(absoluteDocsRoot, source)).pipe(
    Effect.map((markdown) =>
      validateRequiredText(
        source,
        markdown,
        "OpenAPI reference",
        openApiReferenceRequiredText
      )
    )
  );

const validateReferenceIntegration = Effect.all({
  exampleIssues: validateExamplesReference(exampleReferenceSource),
  openApiIssues: validateOpenApiReference(openApiReferenceSource),
}).pipe(
  Effect.map(({ exampleIssues, openApiIssues }) =>
    EffectArray.flatten([exampleIssues, openApiIssues])
  ),
  Effect.mapError(() => sourceError())
);

export const validateContent: EffectType.Effect<
  DocsValidationResult,
  DocsSourceError
> = Effect.gen(function* () {
  const navigation = yield* getNavigation;
  const sources = yield* listMdxSources;
  const navigationIssues = yield* validateNavigationSources(navigation);
  const navigationCoverageIssues = validateNavigationCoversSources(
    navigation,
    sources
  );
  const pageIssues = yield* Effect.forEach(sources, validatePage).pipe(
    Effect.map(EffectArray.flatten)
  );
  const referenceIssues = yield* validateReferenceIntegration;

  return {
    issues: [
      ...navigationIssues,
      ...navigationCoverageIssues,
      ...pageIssues,
      ...referenceIssues,
    ],
  } satisfies DocsValidationResult;
});

export const validationSummary = (result: DocsValidationResult) =>
  Match.value(result.issues.length).pipe(
    Match.when(0, () => Option.none<string>()),
    Match.orElse(() =>
      Option.some(
        EffectArray.join(
          EffectArray.map(
            result.issues,
            (issue) => `${issue.path.join(": ")}: ${issue.message}`
          ),
          "\n"
        )
      )
    )
  );
