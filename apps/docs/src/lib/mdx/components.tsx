import { Array as EffectArray, Match, Option } from "effect";
import type { ComponentPropsWithoutRef } from "react";

const normalizeHref = (href: string | undefined) =>
  Option.fromUndefinedOr(href).pipe(
    Option.map((value) => value.replace(/\.mdx(?:#.*)?$/u, "")),
    Option.getOrElse((): string | undefined => undefined)
  );

const mdxComponents = {
  a: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={normalizeHref(href)} {...props}>
      {children}
    </a>
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => <code {...props} />,
  h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1 {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2 {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3 {...props}>{children}</h3>
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => <li {...props} />,
  ol: (props: ComponentPropsWithoutRef<"ol">) => <ol {...props} />,
  p: (props: ComponentPropsWithoutRef<"p">) => <p {...props} />,
  pre: (props: ComponentPropsWithoutRef<"pre">) => <pre {...props} />,
  strong: (props: ComponentPropsWithoutRef<"strong">) => <strong {...props} />,
  ul: (props: ComponentPropsWithoutRef<"ul">) => <ul {...props} />,
};

const stripFrontmatter = (markdown: string) =>
  Option.fromNullishOr(/^---\n[\s\S]*?\n---\n/u.exec(markdown)).pipe(
    Option.map((match) => markdown.slice(match[0].length)),
    Option.getOrElse(() => markdown)
  );

const inline = (value: string) => value.replaceAll(/`([^`]+)`/gu, "$1");

interface BlockState {
  readonly blocks: readonly string[];
  readonly current: readonly string[];
  readonly inFence: boolean;
}

const emptyBlockState: BlockState = {
  blocks: EffectArray.empty<string>(),
  current: EffectArray.empty<string>(),
  inFence: false,
};

const flushBlock = (state: BlockState): BlockState =>
  Match.value(state.current.length).pipe(
    Match.when(0, () => state),
    Match.orElse(() => ({
      blocks: [...state.blocks, EffectArray.join(state.current, "\n")],
      current: EffectArray.empty<string>(),
      inFence: false,
    }))
  );

const appendLine = (state: BlockState, line: string): BlockState => ({
  ...state,
  current: [...state.current, line],
});

const collectBlocks = (markdown: string) =>
  flushBlock(
    EffectArray.reduce(markdown.split("\n"), emptyBlockState, (state, line) =>
      Match.value(state.inFence).pipe(
        Match.when(true, () =>
          Match.value(line.startsWith("```")).pipe(
            Match.when(true, () => flushBlock(appendLine(state, line))),
            Match.orElse(() => appendLine(state, line))
          )
        ),
        Match.orElse(() =>
          Match.value(line).pipe(
            Match.when("", () => flushBlock(state)),
            Match.when(
              (value) => value.startsWith("```"),
              (value) => ({
                ...appendLine(state, value),
                inFence: true,
              })
            ),
            Match.orElse((value) => appendLine(state, value))
          )
        )
      )
    )
  ).blocks;

const listItems = (block: string) =>
  EffectArray.reduce(
    block.split("\n"),
    EffectArray.empty<string>(),
    (items, line) =>
      Match.value(line.startsWith("- ")).pipe(
        Match.when(true, () => [...items, line.slice(2)]),
        Match.orElse(() =>
          Match.value(items.length).pipe(
            Match.when(0, () => items),
            Match.orElse(() => {
              const previous = items.slice(0, -1);
              const current = items.at(-1);
              return Option.fromUndefinedOr(current).pipe(
                Option.match({
                  onNone: () => items,
                  onSome: (value) => [...previous, `${value} ${line.trim()}`],
                })
              );
            })
          )
        )
      )
  );

const renderBlock = (block: string, index: number) =>
  Match.value(block).pipe(
    Match.when(
      (value) => value.startsWith("```"),
      (value) => {
        const lines = value.split("\n");
        return (
          <mdxComponents.pre key={index}>
            <mdxComponents.code>
              {EffectArray.join(EffectArray.drop(lines, 1), "\n").replace(
                /\n```$/u,
                ""
              )}
            </mdxComponents.code>
          </mdxComponents.pre>
        );
      }
    ),
    Match.when(
      (value) => value.startsWith("# "),
      (value) => (
        <mdxComponents.h1 key={index}>
          {inline(value.slice(2))}
        </mdxComponents.h1>
      )
    ),
    Match.when(
      (value) => value.startsWith("## "),
      (value) => (
        <mdxComponents.h2 key={index}>
          {inline(value.slice(3))}
        </mdxComponents.h2>
      )
    ),
    Match.when(
      (value) => value.startsWith("### "),
      (value) => (
        <mdxComponents.h3 key={index}>
          {inline(value.slice(4))}
        </mdxComponents.h3>
      )
    ),
    Match.when(
      (value) => value.startsWith("- "),
      (value) => (
        <mdxComponents.ul key={index}>
          {EffectArray.map(listItems(value), (item) => (
            <mdxComponents.li key={item}>{inline(item)}</mdxComponents.li>
          ))}
        </mdxComponents.ul>
      )
    ),
    Match.orElse((value) => (
      <mdxComponents.p key={index}>
        {inline(value.replaceAll("\n", " "))}
      </mdxComponents.p>
    ))
  );

export const MdxDocument = ({ markdown }: { readonly markdown: string }) => (
  <>
    {EffectArray.map(
      collectBlocks(stripFrontmatter(markdown).trim()),
      renderBlock
    )}
  </>
);
