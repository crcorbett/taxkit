import {
  Array as EffectArray,
  Effect,
  HashSet,
  Match,
  Option,
  Record,
  Schema,
} from "effect";

import { DocsMdxComponentName, DocsValidationIssue } from "../schemas.js";
import type { DocsSourcePath } from "../schemas.js";

const fencedCodeBlockPattern = /```[\s\S]*?```/gu;
const inlineCodePattern = /`[^`]*`/gu;
const mdxComponentPattern =
  /<\/?(?<component>[A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]*)*)\b/gu;

const allowedMdxComponentNames = HashSet.empty<DocsMdxComponentName>();

const markdownWithoutFencedCode = (markdown: string) =>
  markdown
    .replaceAll(fencedCodeBlockPattern, "")
    .replaceAll(inlineCodePattern, "");

export const validateMdxComponentPolicy = (
  source: DocsSourcePath,
  markdown: string
) =>
  Effect.forEach(
    EffectArray.fromIterable(
      markdownWithoutFencedCode(markdown).matchAll(mdxComponentPattern)
    ),
    (match) =>
      Record.get(match.groups ?? {}, "component").pipe(
        Option.match({
          onNone: () =>
            Effect.succeed(EffectArray.empty<DocsValidationIssue>()),
          onSome: (name) =>
            Schema.decodeUnknownEffect(DocsMdxComponentName)(name).pipe(
              Effect.match({
                onFailure: (error) =>
                  EffectArray.of(
                    new DocsValidationIssue({
                      message: `invalid MDX component name: ${error.message}`,
                      path: [source],
                    })
                  ),
                onSuccess: (componentName) =>
                  Match.value(
                    HashSet.has(allowedMdxComponentNames, componentName)
                  ).pipe(
                    Match.when(true, () =>
                      EffectArray.empty<DocsValidationIssue>()
                    ),
                    Match.orElse(() =>
                      EffectArray.of(
                        new DocsValidationIssue({
                          message: `MDX component not allowed: ${componentName}`,
                          path: [source],
                        })
                      )
                    )
                  ),
              })
            ),
        })
      )
  ).pipe(Effect.map(EffectArray.flatten));
