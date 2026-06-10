import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  Array as EffectArray,
  Effect,
  Match,
  Option,
  Order,
  Schema,
} from "effect";
import type { Effect as EffectType } from "effect";

import { DocsSourceError } from "../errors.js";
import {
  DocsNavigation,
  DocsPageFrontmatter,
  DocsSourcePath,
  DocsValidationIssue,
} from "../schemas.js";
import type {
  DocsContentPage,
  DocsNavigationLeaf,
  DocsPagePath,
  DocsValidationResult,
} from "../schemas.js";

const docsRoot = "apps/docs";
const contentRoot = "apps/docs/content";
const navigationSource = "apps/docs/navigation.json";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const absoluteDocsRoot = join(repoRoot, docsRoot);
const absoluteContentRoot = join(repoRoot, contentRoot);
const absoluteNavigationPath = join(repoRoot, navigationSource);

const bannedPattern =
  /\b(easy|simple|simply|just|seamless|seamlessly|powerful|effortless|beautiful|magical|unlock|leverage|utilise|streamline)\b/iu;
const staleNamePattern =
  /\b(calculateRequest|createEffectClient|PublicCalculationMetadata|PublicErrorEnvelope|PublicCalculationMetadataGroup|PublicCalculationMetadataHandlerLive)\b/u;
const privateNamePattern =
  /\b(adad|SaaS|paid|simulation|private downstream product|private product strategy)\b/iu;
const relativeLinkPattern = /\[[^\]]+\]\(([^)]+)\)/gu;
const frontmatterPattern = /^---\n([\s\S]*?)\n---/u;

const contentSourcePath = (path: string) =>
  Schema.decodeUnknownEffect(DocsSourcePath)(`content/${path}`);

const sourceError = (cause: unknown, source?: DocsSourcePath) =>
  Option.fromUndefinedOr(source).pipe(
    Option.match({
      onNone: () => new DocsSourceError({ cause }),
      onSome: (value) => new DocsSourceError({ cause, source: value }),
    })
  );

const readText = (path: string) =>
  Effect.tryPromise({
    catch: (cause) => sourceError(cause),
    try: () => readFile(path, "utf-8"),
  });

const fileExists = (path: string) =>
  Effect.tryPromise({
    catch: (cause) => sourceError(cause),
    try: () => access(path),
  }).pipe(
    Effect.match({
      onFailure: () => false,
      onSuccess: () => true,
    })
  );

const sourceExists = (source: DocsSourcePath) =>
  fileExists(join(absoluteDocsRoot, source.replace(/^content\//u, "content/")));

const parseFrontmatterValue = (body: string, key: string) =>
  Option.fromNullishOr(
    new RegExp(`^${key}:\\s*"([^"]+)"`, "mu").exec(body)
  ).pipe(Option.flatMap((match) => Option.fromNullishOr(match[1])));

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
        Option.fromNullishOr(match[1]).pipe(
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
              Schema.decodeUnknownEffect(DocsPageFrontmatter)({
                description: parseFrontmatterValue(body, "description").pipe(
                  Option.getOrElse(() => "")
                ),
                status: parseFrontmatterValue(body, "status").pipe(
                  Option.getOrElse(() => "")
                ),
                title: parseFrontmatterValue(body, "title").pipe(
                  Option.getOrElse(() => "")
                ),
              }).pipe(
                Effect.mapError((error) =>
                  EffectArray.of(
                    new DocsValidationIssue({
                      message: error.message,
                      path: [source, "frontmatter"],
                    })
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
            message: `${label}: ${match[0]}`,
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
  Match.value((markdown.match(/```/gu) ?? []).length % 2).pipe(
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
      Option.fromNullishOr(value.split("#")[0]).pipe(
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
          Option.fromNullishOr(match[1]).pipe(
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
  directory: string,
  prefix = ""
): EffectType.Effect<readonly string[], DocsSourceError> =>
  Effect.tryPromise({
    catch: (cause) => sourceError(cause),
    try: () => readdir(directory, { withFileTypes: true }),
  }).pipe(
    Effect.flatMap((entries) =>
      Effect.forEach(entries, (entry) =>
        Match.value(entry.isDirectory()).pipe(
          Match.when(true, () =>
            collectMdxPaths(
              join(directory, entry.name),
              join(prefix, entry.name)
            )
          ),
          Match.orElse(() =>
            Match.value(entry.name.endsWith(".mdx")).pipe(
              Match.when(true, () =>
                Effect.succeed(EffectArray.of(join(prefix, entry.name)))
              ),
              Match.orElse(() => Effect.succeed(EffectArray.empty<string>()))
            )
          )
        )
      )
    ),
    Effect.map(EffectArray.flatten)
  );

const listMdxSources: EffectType.Effect<
  readonly DocsSourcePath[],
  DocsSourceError
> = collectMdxPaths(absoluteContentRoot).pipe(
  Effect.flatMap((paths) => Effect.forEach(paths, contentSourcePath)),
  Effect.mapError((cause) => sourceError(cause)),
  Effect.map((paths) => paths.toSorted(Order.String))
);

export const getNavigation: EffectType.Effect<DocsNavigation, DocsSourceError> =
  readText(absoluteNavigationPath).pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(Schema.fromJsonString(DocsNavigation))
    ),
    Effect.mapError((cause) => sourceError(cause))
  );

const navigationLeaves = (navigation: DocsNavigation) =>
  EffectArray.flatMap(navigation.primaryNavigation, (section) => [
    section,
    ...(section.pages ?? []),
  ]);

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
            validateLocalLinks(source, absolutePath).pipe(
              Effect.map((linkIssues) => [
                ...frontmatterIssues,
                ...validateTextPolicy(source, markdown),
                ...validateFenceBalance(source, markdown),
                ...linkIssues,
              ])
            ),
          onSuccess: () =>
            validateLocalLinks(source, absolutePath).pipe(
              Effect.map((linkIssues) => [
                ...validateTextPolicy(source, markdown),
                ...validateFenceBalance(source, markdown),
                ...linkIssues,
              ])
            ),
        })
      )
    )
  );
};

export const validateContent: EffectType.Effect<
  DocsValidationResult,
  DocsSourceError
> = Effect.gen(function* () {
  const navigation = yield* getNavigation;
  const sources = yield* listMdxSources;
  const navigationIssues = yield* validateNavigationSources(navigation);
  const pageIssues = yield* Effect.forEach(sources, validatePage).pipe(
    Effect.map(EffectArray.flatten)
  );

  return {
    issues: [...navigationIssues, ...pageIssues],
  } satisfies DocsValidationResult;
});

const getPageMarkdown = (source: DocsSourcePath) =>
  readText(join(absoluteDocsRoot, source));

const pageFromNavigationItem = (
  item: DocsNavigationLeaf
): EffectType.Effect<DocsContentPage, DocsSourceError> =>
  getPageMarkdown(item.source).pipe(
    Effect.flatMap((markdown) =>
      decodeFrontmatter(item.source, markdown).pipe(
        Effect.map(
          (frontmatter) =>
            ({
              frontmatter,
              markdown,
              path: item.path,
              source: item.source,
            }) satisfies DocsContentPage
        ),
        Effect.mapError((cause) => sourceError(cause, item.source))
      )
    )
  );

export const listNavigationPages: EffectType.Effect<
  readonly DocsContentPage[],
  DocsSourceError
> = getNavigation.pipe(
  Effect.flatMap((navigation) =>
    Effect.forEach(navigationLeaves(navigation), pageFromNavigationItem)
  )
);

export const getPageByPath = (path: DocsPagePath) =>
  getNavigation.pipe(
    Effect.map((navigation) =>
      EffectArray.findFirst(
        navigationLeaves(navigation),
        (item) => item.path === path
      )
    ),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(Option.none<DocsContentPage>()),
        onSome: (item) =>
          pageFromNavigationItem(item).pipe(Effect.map(Option.some)),
      })
    )
  );

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
