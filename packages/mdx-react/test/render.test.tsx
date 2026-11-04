import { describe, expect, it } from "@effect/vitest";
import { MdxBody } from "@taxkit/mdx-react/body";
import type { MdxLinkProps } from "@taxkit/mdx-react/body";
import { MdxCodeBlock } from "@taxkit/mdx-react/code-block";
import type { MdxCodeToolbarProps } from "@taxkit/mdx-react/code-block";
import { MdxTheme } from "@taxkit/mdx-react/theme";
import type { ReadingCodeBlock } from "@taxkit/mdx/schemas";
import { Array, Effect, Function as EffectFunction } from "effect";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import {
  article,
  code,
  codeText,
  escapedCodeText,
  journalTheme,
} from "./article.fixture.js";

const JournalLink = ({ href, children }: MdxLinkProps) => (
  <a data-journal-link="" href={`/reader?target=${encodeURIComponent(href)}`}>
    {children}
  </a>
);

const JournalCode = ({
  language,
  lines,
}: Readonly<Pick<ReadingCodeBlock, "language" | "lines">>) => (
  <MdxCodeBlock
    className="journal-example"
    language={language}
    lines={lines}
    renderToolbar={() => <button type="button">Save journal example</button>}
  />
);

describe("standalone checked MDX presentation", () => {
  it.effect(
    "renders a neutral article with native semantics and escaped text without publication or application providers",
    () =>
      Effect.gen(function* () {
        const body = yield* article;
        const html = renderToStaticMarkup(
          <article>
            <MdxBody body={body} tableLabel="Marine observations" />
          </article>
        );
        const headings = EffectFunction.pipe(
          Array.fromIterable(
            html.matchAll(
              /<h(?<depth>[1-4])\b[^>]*\bid="(?<id>[^"]+)"[^>]*>(?<text>[^<]+)<\/h[1-4]>/gu
            )
          ),
          Array.map((heading) => ({ ...heading.groups }))
        );
        expect(headings).toStrictEqual([
          {
            depth: "1",
            id: "coastal-observations",
            text: "Coastal observations",
          },
          { depth: "2", id: "survey", text: "Survey" },
          { depth: "3", id: "measurements", text: "Measurements" },
          { depth: "4", id: "tidal-route", text: "Tidal route" },
        ]);
        expect({
          escapedText: html.includes(
            "&lt;script&gt;alert(&quot;deck&quot;)&lt;/script&gt; &amp; tide"
          ),
          executableText: html.includes("<script>"),
        }).toStrictEqual({ escapedText: true, executableText: false });
        expect(html).toContain(
          '<a href="/maps/harbor?level=2&amp;depth=5#dock"><strong>Harbor atlas</strong></a>'
        );
        expect(html).toMatch(
          /<section\b(?=[^>]*aria-label="Marine observations")(?=[^>]*tabindex="0")[^>]*>[\s\S]*<table\b[^>]*>[\s\S]*<thead>[\s\S]*<th\b[^>]*>Station<\/th>[\s\S]*<td\b[^>]*>12 metres<\/td>/u
        );
        expect(html).toContain(
          'src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'
        );
      })
  );

  it.effect(
    "preserves code whitespace, paired token appearances and a focusable viewport during SSR",
    () =>
      Effect.gen(function* () {
        const example = yield* code;
        const renderToolbar = vi
          .fn<(props: MdxCodeToolbarProps) => ReactNode>()
          .mockReturnValue(<button type="button">Save snippet</button>);
        const html = renderToStaticMarkup(
          <MdxCodeBlock
            className="marine-code"
            language={example.language}
            lines={example.lines}
            renderToolbar={renderToolbar}
          />
        );
        const textContent = html.replaceAll(/<[^>]*>/gu, "");
        expect(textContent).toContain(escapedCodeText);
        expect(html).toMatch(
          /<section\b(?=[^>]*aria-labelledby="[^"]+")(?=[^>]*tabindex="0")/u
        );
        expect(html).toContain('<button type="button">Save snippet</button>');
        expect({
          colours: html.includes("color:light-dark(#123456,#fedcba)"),
          italic:
            html.includes("--mdx-light-font-style:italic") &&
            html.includes("--mdx-dark-font-style:italic"),
          weights:
            html.includes("--mdx-light-font-weight:600") &&
            html.includes("--mdx-dark-font-weight:400"),
        }).toStrictEqual({ colours: true, italic: true, weights: true });
        expect(renderToolbar).toHaveBeenCalledExactlyOnceWith({
          label: "TypeScript",
          text: codeText,
        });
      })
  );

  it.effect(
    "lets a host compose its own links and code toolbar while retaining the checked content",
    () =>
      Effect.gen(function* () {
        const body = yield* article;
        const html = renderToStaticMarkup(
          <MdxBody body={body} Code={JournalCode} Link={JournalLink} />
        );
        expect(html).toContain(
          'href="/reader?target=%2Fmaps%2Fharbor%3Flevel%3D2%26depth%3D5%23dock"'
        );
        expect(html).toContain("<strong>Harbor atlas</strong>");
        expect(html).toContain(
          '<button type="button">Save journal example</button>'
        );
        const textContent = html.replaceAll(/<[^>]*>/gu, "");
        expect(textContent).toContain(escapedCodeText);
      })
  );

  it.effect(
    "applies the supplied paired palette and font stacks with an explicit appearance",
    () =>
      Effect.gen(function* () {
        const theme = yield* journalTheme;
        const html = renderToStaticMarkup(
          <MdxTheme
            appearance="dark"
            aria-label="Marine journal"
            className="marine-journal"
            theme={theme}
          >
            <p>Evening observations</p>
          </MdxTheme>
        );
        yield* EffectFunction.pipe(
          [
            ["--mdx-background-light", theme.light.palette.background],
            ["--mdx-background-dark", theme.dark.palette.background],
            ["--mdx-accent-light", theme.light.palette.accent],
            ["--mdx-accent-dark", theme.dark.palette.accent],
          ] as const,
          Effect.forEach(([variable, value]) =>
            Effect.sync(() => {
              expect(html).toContain(`${variable}:${value}`);
            })
          )
        );
        expect(html).toMatch(
          /<section\b(?=[^>]*data-mdx-theme="")(?=[^>]*data-mdx-appearance="dark")/u
        );
        expect(html).toContain("font-family:&quot;Literata&quot;,serif");
        expect(html).toContain("--mdx-code-font:&quot;Iosevka&quot;,monospace");
        expect(html).toContain("<p>Evening observations</p>");
      })
  );
});
